import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import {
  EMAIL_CODE_EXPIRES_MINUTES,
  EMAIL_RESEND_INTERVAL_SECONDS,
  EMAIL_VERIFY_MAX_ATTEMPTS,
  type AuthEmailInput,
  type AuthUser,
  type LoginInput,
  type PasswordChangeCompleteInput,
  type PasswordChangeVerifyInput,
  type SignupCompleteInput,
  type SignupVerifyInput
} from "@lava/shared";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";

export const SESSION_COOKIE_NAME = "lava_session";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const CODE_BLOCK_MINUTES = 15;
type VerificationPurpose = "signup" | "password_reset";

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async sendSignupEmail(input: AuthEmailInput) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new ConflictException("이미 가입된 이메일입니다.");
    }

    return this.sendVerificationEmail(input.email, "signup");
  }

  async verifySignupCode(input: SignupVerifyInput) {
    await this.verifyCode(input.email, "signup", input.code);
    return { verified: true };
  }

  async completeSignup(input: SignupCompleteInput): Promise<{ user: AuthUser; token: string }> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: {
        email_purpose: {
          email: input.email,
          purpose: "signup"
        }
      }
    });

    if (!verification?.verifiedAt || verification.expiresAt < new Date()) {
      throw new BadRequestException("이메일 인증을 먼저 완료해 주세요.");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new ConflictException("이미 가입된 이메일입니다.");
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: this.hashPassword(input.password),
        emailVerified: true
      }
    });

    const authUser = this.toAuthUser(user);
    return {
      user: authUser,
      token: this.signSessionToken(authUser)
    };
  }

  async sendPasswordChangeEmail(user: AuthUser) {
    await this.ensureUserExists(user.id);
    return this.sendVerificationEmail(user.email, "password_reset");
  }

  async verifyPasswordChangeCode(input: PasswordChangeVerifyInput, user: AuthUser) {
    await this.ensureUserExists(user.id);
    await this.verifyCode(user.email, "password_reset", input.code);
    return { verified: true };
  }

  async completePasswordChange(input: PasswordChangeCompleteInput, user: AuthUser) {
    const verification = await this.findVerification(user.email, "password_reset");

    if (!verification?.verifiedAt || verification.expiresAt < new Date()) {
      throw new BadRequestException("이메일 인증을 먼저 완료해 주세요.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: this.hashPassword(input.password)
        }
      });

      await tx.emailVerification.update({
        where: { id: verification.id },
        data: {
          codeHash: "consumed",
          attemptCount: 0,
          blockedUntil: null,
          expiresAt: new Date(),
          verifiedAt: null
        }
      });
    });

    return { changed: true };
  }

  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    const authUser = this.toAuthUser(user);
    return {
      user: authUser,
      token: this.signSessionToken(authUser)
    };
  }

  async getUserFromToken(token: string): Promise<AuthUser> {
    const payload = this.verifySessionToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    return this.toAuthUser(user);
  }

  signSessionToken(user: AuthUser): string {
    const header = this.encodeJson({ alg: "HS256", typ: "JWT" });
    const payload = this.encodeJson({
      sub: user.id,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
    } satisfies SessionPayload);
    const signature = this.sign(`${header}.${payload}`);

    return `${header}.${payload}.${signature}`;
  }

  getSessionMaxAgeSeconds(): number {
    return SESSION_MAX_AGE_SECONDS;
  }

  private async sendVerificationEmail(email: string, purpose: VerificationPurpose) {
    const existingVerification = await this.findVerification(email, purpose);
    const now = new Date();

    if (existingVerification?.blockedUntil && existingVerification.blockedUntil > now) {
      throw new BadRequestException("인증 시도가 제한되었습니다. 잠시 후 다시 시도해 주세요.");
    }

    if (
      existingVerification &&
      now.getTime() - existingVerification.sentAt.getTime() < EMAIL_RESEND_INTERVAL_SECONDS * 1000
    ) {
      throw new BadRequestException("인증 코드는 1분 후 다시 요청할 수 있습니다.");
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const expiresAt = new Date(now.getTime() + EMAIL_CODE_EXPIRES_MINUTES * 60 * 1000);

    await this.prisma.emailVerification.upsert({
      where: {
        email_purpose: {
          email,
          purpose
        }
      },
      update: {
        codeHash: this.hashVerificationCode(email, code),
        attemptCount: 0,
        blockedUntil: null,
        expiresAt,
        sentAt: now,
        verifiedAt: null
      },
      create: {
        email,
        codeHash: this.hashVerificationCode(email, code),
        purpose,
        expiresAt,
        sentAt: now
      }
    });

    await this.emailService.sendVerificationCode({
      email,
      code
    });

    return { sent: true, expiresAt: expiresAt.toISOString() };
  }

  private async verifyCode(email: string, purpose: VerificationPurpose, code: string) {
    const verification = await this.findVerification(email, purpose);

    if (!verification) {
      throw new BadRequestException("인증 코드를 먼저 요청해 주세요.");
    }

    const now = new Date();
    if (verification.blockedUntil && verification.blockedUntil > now) {
      throw new BadRequestException("인증 시도가 제한되었습니다. 잠시 후 다시 시도해 주세요.");
    }

    if (verification.expiresAt < now) {
      throw new BadRequestException("인증 코드가 만료되었습니다. 다시 요청해 주세요.");
    }

    const codeHash = this.hashVerificationCode(email, code);
    if (verification.codeHash !== codeHash) {
      const nextAttemptCount = verification.attemptCount + 1;
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: {
          attemptCount: nextAttemptCount,
          blockedUntil:
            nextAttemptCount >= EMAIL_VERIFY_MAX_ATTEMPTS
              ? new Date(now.getTime() + CODE_BLOCK_MINUTES * 60 * 1000)
              : null
        }
      });

      throw new BadRequestException("인증 코드가 일치하지 않습니다.");
    }

    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        verifiedAt: now,
        attemptCount: 0,
        blockedUntil: null
      }
    });
  }

  private findVerification(email: string, purpose: VerificationPurpose) {
    return this.prisma.emailVerification.findUnique({
      where: {
        email_purpose: {
          email,
          purpose
        }
      }
    });
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    return user;
  }

  private verifySessionToken(token: string): SessionPayload {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    const expectedSignature = this.sign(`${parts[0]}.${parts[1]}`);
    if (
      parts[2].length !== expectedSignature.length ||
      !timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expectedSignature))
    ) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("로그인이 만료되었습니다.");
    }

    return payload;
  }

  private hashVerificationCode(email: string, code: string): string {
    return createHash("sha256")
      .update(`${email}:${code}:${this.getJwtSecret()}`)
      .digest("hex");
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
  }

  private verifyPassword(password: string, storedValue: string): boolean {
    const [algorithm, salt, storedHash] = storedValue.split("$");
    if (algorithm !== "scrypt" || !salt || !storedHash) {
      return false;
    }

    const candidateHash = scryptSync(password, salt, 64);
    const storedBuffer = Buffer.from(storedHash, "hex");
    return storedBuffer.length === candidateHash.length && timingSafeEqual(storedBuffer, candidateHash);
  }

  private sign(value: string): string {
    return createHmac("sha256", this.getJwtSecret()).update(value).digest("base64url");
  }

  private encodeJson(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private getJwtSecret(): string {
    return process.env.JWT_SECRET || "dev-only";
  }

  private toAuthUser(user: { id: string; email: string; name: string }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }
}
