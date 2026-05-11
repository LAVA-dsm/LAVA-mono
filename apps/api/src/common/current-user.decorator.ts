import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { CurrentUser } from "./current-user";

type RequestWithUser = Request & { user?: CurrentUser };

export const CurrentUserParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new Error("Current user is not attached to the request.");
    }

    return request.user;
  }
);
