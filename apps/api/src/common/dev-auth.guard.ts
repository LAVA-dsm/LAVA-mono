import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { CurrentUser } from "./current-user";

type RequestWithUser = Request & { user?: CurrentUser };

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const headerUserId = request.header("x-dev-user-id")?.trim();
    const devUserId = headerUserId || process.env.DEV_USER_ID || "dev-leader";

    if (!devUserId) {
      throw new UnauthorizedException("개발용 사용자 ID가 없습니다.");
    }

    const user = await this.prisma.user.upsert({
      where: { id: devUserId },
      update: {},
      create: {
        id: devUserId,
        email: `${devUserId}@lava.local`,
        name: "개발용 리더",
        passwordHash: "dev-only",
        emailVerified: true
      }
    });

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    return true;
  }
}
