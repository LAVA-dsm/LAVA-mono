import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@lava/shared";
import { AuthService } from "./auth.service";

type MockUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
};

type MockVerification = {
  id: string;
  email: string;
  codeHash: string;
  purpose: "signup" | "password_reset";
  attemptCount: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  sentAt: Date;
  verifiedAt: Date | null;
};

function createAuthMock() {
  const users = new Map<string, MockUser>();
  const verifications = new Map<string, MockVerification>();
  let userCounter = 0;
  let verificationCounter = 0;

  const verificationKey = (email: string, purpose: "signup" | "password_reset") => `${email}:${purpose}`;

  const prisma: any = {
    user: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.id) return users.get(where.id) ?? null;
        return Array.from(users.values()).find((user) => user.email === where.email) ?? null;
      }),
      create: vi.fn(async ({ data }) => {
        userCounter += 1;
        const user: MockUser = {
          id: `user-${userCounter}`,
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          emailVerified: data.emailVerified
        };
        users.set(user.id, user);
        return user;
      }),
      update: vi.fn(async ({ where, data }) => {
        const user = users.get(where.id);
        if (!user) throw new Error("User not found");
        Object.assign(user, data);
        return user;
      })
    },
    emailVerification: {
      findUnique: vi.fn(async ({ where }) => {
        const input = where.email_purpose;
        return verifications.get(verificationKey(input.email, input.purpose)) ?? null;
      }),
      upsert: vi.fn(async ({ where, update, create }) => {
        const input = where.email_purpose;
        const key = verificationKey(input.email, input.purpose);
        const existing = verifications.get(key);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        verificationCounter += 1;
        const verification: MockVerification = {
          id: `verification-${verificationCounter}`,
          email: create.email,
          codeHash: create.codeHash,
          purpose: create.purpose,
          attemptCount: create.attemptCount ?? 0,
          blockedUntil: create.blockedUntil ?? null,
          expiresAt: create.expiresAt,
          sentAt: create.sentAt,
          verifiedAt: create.verifiedAt ?? null
        };
        verifications.set(key, verification);
        return verification;
      }),
      update: vi.fn(async ({ where, data }) => {
        const verification = Array.from(verifications.values()).find((item) => item.id === where.id);
        if (!verification) throw new Error("Verification not found");
        Object.assign(verification, data);
        return verification;
      })
    },
    $transaction: vi.fn(async (callback) => callback(prisma))
  };

  const emailService = {
    sendVerificationCode: vi.fn(async (_input: { email: string; code: string }) => undefined)
  };

  return { prisma, emailService, users, verifications };
}

describe("AuthService", () => {
  it("blocks signup verification email resend within one minute", async () => {
    const mock = createAuthMock();
    const service = new AuthService(mock.prisma, mock.emailService as any);

    await service.sendSignupEmail({ email: "user@example.com" });

    await expect(service.sendSignupEmail({ email: "user@example.com" })).rejects.toThrow(
      "인증 코드는 1분 후 다시 요청할 수 있습니다."
    );
    expect(mock.emailService.sendVerificationCode).toHaveBeenCalledTimes(1);
  });

  it("blocks verification after five failed attempts", async () => {
    const mock = createAuthMock();
    const service = new AuthService(mock.prisma, mock.emailService as any);
    await service.sendSignupEmail({ email: "user@example.com" });
    const code = mock.emailService.sendVerificationCode.mock.calls[0]?.[0].code;
    if (!code) throw new Error("Verification code was not sent");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.verifySignupCode({ email: "user@example.com", code: "000000" })).rejects.toThrow(
        "인증 코드가 일치하지 않습니다."
      );
    }

    await expect(service.verifySignupCode({ email: "user@example.com", code })).rejects.toThrow(
      "인증 시도가 제한되었습니다. 잠시 후 다시 시도해 주세요."
    );
  });

  it("rejects expired password change codes", async () => {
    const mock = createAuthMock();
    const service = new AuthService(mock.prisma, mock.emailService as any);
    const user: AuthUser = { id: "user-1", email: "user@example.com", name: "사용자" };
    mock.users.set(user.id, { ...user, passwordHash: "invalid", emailVerified: true });

    await service.sendPasswordChangeEmail(user);
    const verification = Array.from(mock.verifications.values())[0];
    if (!verification) throw new Error("Verification was not created");
    verification.expiresAt = new Date("2000-01-01T00:00:00.000Z");

    await expect(service.verifyPasswordChangeCode({ code: "123456" }, user)).rejects.toThrow(
      "인증 코드가 만료되었습니다. 다시 요청해 주세요."
    );
  });

  it("changes a password after email verification", async () => {
    const mock = createAuthMock();
    const service = new AuthService(mock.prisma, mock.emailService as any);
    const user: AuthUser = { id: "user-1", email: "user@example.com", name: "사용자" };
    mock.users.set(user.id, { ...user, passwordHash: "invalid", emailVerified: true });

    await service.sendPasswordChangeEmail(user);
    const code = mock.emailService.sendVerificationCode.mock.calls[0]?.[0].code;
    if (!code) throw new Error("Verification code was not sent");
    await service.verifyPasswordChangeCode({ code }, user);
    await service.completePasswordChange({ password: "Passw0rd!", passwordConfirm: "Passw0rd!" }, user);

    await expect(service.login({ email: "user@example.com", password: "Passw0rd!" })).resolves.toEqual(
      expect.objectContaining({ user })
    );
  });
});
