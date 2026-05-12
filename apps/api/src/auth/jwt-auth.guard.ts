import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService, SESSION_COOKIE_NAME } from "./auth.service";
import type { CurrentUser } from "../common/current-user";

type RequestWithUser = Request & { user?: CurrentUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.getToken(request);

    if (!token) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    request.user = await this.authService.getUserFromToken(token);
    return true;
  }

  private getToken(request: Request): string | null {
    const authorization = request.header("authorization");
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim();
    }

    const cookieHeader = request.header("cookie");
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
    return sessionCookie ? decodeURIComponent(sessionCookie.slice(SESSION_COOKIE_NAME.length + 1)) : null;
  }
}
