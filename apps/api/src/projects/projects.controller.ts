import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { projectCreateInputSchema, type ProjectCreateInput } from "@lava/shared";
import type { CurrentUser } from "../common/current-user";
import { CurrentUserParam } from "../common/current-user.decorator";
import { DevAuthGuard } from "../common/dev-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(DevAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(projectCreateInputSchema)) body: ProjectCreateInput
  ) {
    return this.projectsService.createProject(body, user);
  }

  @Get(":id")
  getProject(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.getProject(id, user);
  }
}
