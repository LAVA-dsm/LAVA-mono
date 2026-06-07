import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import type { Response } from "express";
import {
  authEmailInputSchema,
  loginInputSchema,
  passwordChangeCompleteInputSchema,
  passwordChangeVerifyInputSchema,
  signupCompleteInputSchema,
  signupVerifyInputSchema,
  type AuthEmailInput,
  type LoginInput,
  type PasswordChangeCompleteInput,
  type PasswordChangeVerifyInput,
  type SignupCompleteInput,
  type SignupVerifyInput
} from "@lava/shared";
import type { CurrentUser } from "../common/current-user";
import { CurrentUserParam } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService, SESSION_COOKIE_NAME } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup/email")
  @ApiOperation({ summary: "회원가입 인증 이메일 발송", description: "입력된 이메일로 6자리 인증 코드를 발송합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email", description: "인증 코드를 받을 이메일 주소" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "인증 이메일 발송 성공" })
  sendSignupEmail(@Body(new ZodValidationPipe(authEmailInputSchema)) body: AuthEmailInput) {
    return this.authService.sendSignupEmail(body);
  }

  @Post("signup/verify")
  @ApiOperation({ summary: "회원가입 인증코드 검증", description: "이메일로 발송된 6자리 인증 코드를 검증합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "code"],
      properties: {
        email: { type: "string", format: "email", description: "인증받을 이메일 주소" },
        code: { type: "string", pattern: "^\\d{6}$", description: "6자리 인증 코드" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "인증 코드 검증 성공" })
  @ApiResponse({ status: 400, description: "잘못된 인증 코드 혹은 만료된 코드" })
  verifySignupCode(@Body(new ZodValidationPipe(signupVerifyInputSchema)) body: SignupVerifyInput) {
    return this.authService.verifySignupCode(body);
  }

  @Post("signup/complete")
  @ApiOperation({ summary: "회원가입 완료", description: "인증 성공 후 사용자 정보를 입력받아 가입을 완료하고 세션 쿠키를 발급합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "name", "password", "passwordConfirm"],
      properties: {
        email: { type: "string", format: "email", description: "인증 완료된 이메일 주소" },
        name: { type: "string", minLength: 1, maxLength: 40, description: "사용자 이름" },
        password: { type: "string", minLength: 8, description: "비밀번호 (대/소문자, 숫자, 특수문자 포함 8자 이상)" },
        passwordConfirm: { type: "string", description: "비밀번호 확인" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "회원가입 완료 및 로그인 성공" })
  async completeSignup(
    @Body(new ZodValidationPipe(signupCompleteInputSchema)) body: SignupCompleteInput,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.completeSignup(body);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post("login")
  @ApiOperation({ summary: "로그인", description: "이메일과 비밀번호로 로그인하며 세션 쿠키를 발급합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", description: "사용자 이메일 주소" },
        password: { type: "string", description: "비밀번호" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "로그인 성공 및 세션 쿠키 발급" })
  @ApiResponse({ status: 401, description: "이메일 또는 비밀번호가 불일치함" })
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.login(body);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "현재 로그인 정보 조회", description: "세션 쿠키를 인증하여 현재 사용자 정보를 가져옵니다." })
  @ApiResponse({ status: 200, description: "로그인 사용자 정보 반환" })
  @ApiResponse({ status: 401, description: "인증되지 않은 사용자" })
  me(@CurrentUserParam() user: CurrentUser) {
    return { user };
  }

  @Post("password-change/email")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "비밀번호 변경 인증 이메일 발송", description: "로그인 상태에서 비밀번호 변경을 위한 인증 코드를 메일로 발송합니다." })
  @ApiResponse({ status: 201, description: "인증 이메일 발송 성공" })
  sendPasswordChangeEmail(@CurrentUserParam() user: CurrentUser) {
    return this.authService.sendPasswordChangeEmail(user);
  }

  @Post("password-change/verify")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "비밀번호 변경 인증코드 검증", description: "비밀번호 변경을 위해 발송된 인증 코드를 검증합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "string", pattern: "^\\d{6}$", description: "6자리 인증 코드" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "비밀번호 인증 성공" })
  verifyPasswordChangeCode(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(passwordChangeVerifyInputSchema)) body: PasswordChangeVerifyInput
  ) {
    return this.authService.verifyPasswordChangeCode(body, user);
  }

  @Post("password-change/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "비밀번호 변경 완료", description: "인증에 성공한 사용자의 비밀번호를 최종 변경합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["password", "passwordConfirm"],
      properties: {
        password: { type: "string", minLength: 8, description: "새로운 비밀번호" },
        passwordConfirm: { type: "string", description: "비밀번호 확인" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "비밀번호 변경 성공" })
  completePasswordChange(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(passwordChangeCompleteInputSchema)) body: PasswordChangeCompleteInput
  ) {
    return this.authService.completePasswordChange(body, user);
  }

  @Post("logout")
  @ApiOperation({ summary: "로그아웃", description: "세션 쿠키를 삭제하고 로그아웃합니다." })
  @ApiResponse({ status: 201, description: "로그아웃 성공" })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME, {
      path: "/",
      domain: this.getCookieDomain()
    });
    return { ok: true };
  }

  private setSessionCookie(response: Response, token: string) {
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: this.authService.getSessionMaxAgeSeconds() * 1000,
      path: "/",
      domain: this.getCookieDomain()
    });
  }

  private getCookieDomain(): string | undefined {
    const domain = process.env.COOKIE_DOMAIN?.trim();
    return domain && domain !== "localhost" ? domain : undefined;
  }
}
