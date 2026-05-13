import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import {
  aiDocumentEditInputSchema,
  aiScheduleEditInputSchema,
  documentUpdateInputSchema,
  participationInputSchema,
  projectCreateInputSchema,
  scheduleUpdateInputSchema,
  type AiDocumentEditInput,
  type AiScheduleEditInput,
  type DocumentUpdateInput,
  type ParticipationInput,
  type ProjectCreateInput,
  type ScheduleUpdateInput
} from "@lava/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { CurrentUser } from "../common/current-user";
import { CurrentUserParam } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(JwtAuthGuard)
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

  @Get(":id/invitations")
  getProjectInvitations(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.getProjectInvitations(id, user);
  }

  @Get(":id/documents/:type")
  getProjectDocument(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Param("type") type: string
  ) {
    return this.projectsService.getProjectDocument(id, type, user);
  }

  @Put(":id/documents/:type")
  updateProjectDocument(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Param("type") type: string,
    @Body(new ZodValidationPipe(documentUpdateInputSchema)) body: DocumentUpdateInput
  ) {
    return this.projectsService.updateProjectDocument(id, type, body, user);
  }

  @Post(":id/documents/:type/ai-edit")
  editProjectDocumentWithAi(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Param("type") type: string,
    @Body(new ZodValidationPipe(aiDocumentEditInputSchema)) body: AiDocumentEditInput
  ) {
    return this.projectsService.editProjectDocumentWithAi(id, type, body.prompt, user);
  }

  @Patch(":id/members/me/participation")
  updateMyParticipation(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(participationInputSchema)) body: ParticipationInput
  ) {
    return this.projectsService.updateMyParticipation(id, body, user);
  }

  @Post(":id/schedule/generate")
  generateSchedule(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.generateSchedule(id, user);
  }

  @Get(":id/schedule")
  getSchedule(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.getSchedule(id, user);
  }

  @Put(":id/schedule")
  updateSchedule(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(scheduleUpdateInputSchema)) body: ScheduleUpdateInput
  ) {
    return this.projectsService.updateSchedule(id, body, user);
  }

  @Post(":id/schedule/ai-edit")
  editScheduleWithAi(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(aiScheduleEditInputSchema)) body: AiScheduleEditInput
  ) {
    return this.projectsService.editScheduleWithAi(id, body.prompt, user);
  }
}

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(":token")
  getInvitation(@Param("token") token: string) {
    return this.projectsService.getInvitation(token);
  }

  @Post(":token/accept")
  @UseGuards(JwtAuthGuard)
  acceptInvitation(
    @CurrentUserParam() user: CurrentUser,
    @Param("token") token: string,
    @Body(new ZodValidationPipe(participationInputSchema)) body: ParticipationInput
  ) {
    return this.projectsService.acceptInvitation(token, body, user);
  }

  @Post(":token/reject")
  @UseGuards(JwtAuthGuard)
  rejectInvitation(@CurrentUserParam() user: CurrentUser, @Param("token") token: string) {
    return this.projectsService.rejectInvitation(token, user);
  }
}
