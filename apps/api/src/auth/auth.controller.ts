import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup/email")
  sendSignupEmail(@Body(new ZodValidationPipe(authEmailInputSchema)) body: AuthEmailInput) {
    return this.authService.sendSignupEmail(body);
  }

  @Post("signup/verify")
  verifySignupCode(@Body(new ZodValidationPipe(signupVerifyInputSchema)) body: SignupVerifyInput) {
    return this.authService.verifySignupCode(body);
  }

  @Post("signup/complete")
  async completeSignup(
    @Body(new ZodValidationPipe(signupCompleteInputSchema)) body: SignupCompleteInput,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.completeSignup(body);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post("login")
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
  me(@CurrentUserParam() user: CurrentUser) {
    return { user };
  }

  @Post("password-change/email")
  @UseGuards(JwtAuthGuard)
  sendPasswordChangeEmail(@CurrentUserParam() user: CurrentUser) {
    return this.authService.sendPasswordChangeEmail(user);
  }

  @Post("password-change/verify")
  @UseGuards(JwtAuthGuard)
  verifyPasswordChangeCode(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(passwordChangeVerifyInputSchema)) body: PasswordChangeVerifyInput
  ) {
    return this.authService.verifyPasswordChangeCode(body, user);
  }

  @Post("password-change/complete")
  @UseGuards(JwtAuthGuard)
  completePasswordChange(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(passwordChangeCompleteInputSchema)) body: PasswordChangeCompleteInput
  ) {
    return this.authService.completePasswordChange(body, user);
  }

  @Post("logout")
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
