import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import {
  FALLBACK_DOCUMENT_CONTENT,
  FEATURE_SPEC_MAX_LENGTH,
  INVITATION_EXPIRES_DAYS,
  availableTimeSchema,
  featureSpecContentSchema,
  projectDocumentTypeSchema,
  scheduleUpdateInputSchema,
  type DocumentUpdateInput,
  type InvitationDetail,
  type InvitationSummary,
  type ParticipationInput,
  type ProjectCalendarItem,
  type ProjectCreateInput,
  type ProjectDocumentSummary,
  type ProjectDocumentType,
  type ProjectLeaveInput,
  type ProjectListItem,
  type ProjectMemberSummary,
  type ProjectScheduleSummary,
  type ProjectSummary,
  type ScheduleItemInput,
  type ScheduleItemSummary
} from "@lava/shared";
import { AiService, type GeneratedDocuments } from "../ai/ai.service";
import type { CurrentUser } from "../common/current-user";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";

type InvitationDraft = {
  email: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

type ProjectForSummary = NonNullable<Awaited<ReturnType<ProjectsService["findProjectForSummary"]>>>;
type ProjectForList = Awaited<ReturnType<ProjectsService["findProjectsForUser"]>>[number];
type InvitationForDetail = NonNullable<Awaited<ReturnType<ProjectsService["findInvitationByToken"]>>>;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly emailService: EmailService
  ) {}

  async createProject(input: ProjectCreateInput, user: CurrentUser, originHeaders?: string): Promise<ProjectSummary> {
    const inviteEmails = input.type === "team" ? input.inviteEmails : [];
    const invitationDrafts = inviteEmails.map((email) => this.createInvitationDraft(email));
    const persistedInput = { ...input, inviteEmails };

    const project = await this.prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name: persistedInput.name,
          type: persistedInput.type,
          leaderUserId: user.id,
          originalIdea: persistedInput.originalIdea,
          enhancedIdea: persistedInput.enhancedIdea || null,
          ideaEnhancementUsed: persistedInput.ideaEnhancementUsed,
          startDate: new Date(`${persistedInput.startDate}T00:00:00.000Z`),
          endDate: new Date(`${persistedInput.endDate}T00:00:00.000Z`),
          members: {
            create: {
              userId: user.id,
              role: "leader",
              status: "accepted",
              joinedAt: new Date()
            }
          },
          invitations: {
            create: invitationDrafts.map((draft) => ({
              email: draft.email,
              tokenHash: draft.tokenHash,
              expiresAt: draft.expiresAt,
              status: "pending"
            }))
          }
        }
      });

      return createdProject;
    });

    const documents = await this.generateDocumentsWithFallback(persistedInput);

    await this.prisma.$transaction(async (tx) => {
      await tx.projectDocument.createMany({
        data: [
          {
            projectId: project.id,
            type: "feature_spec",
            content: documents.featureSpec,
            generatedBy: "ai"
          },
          {
            projectId: project.id,
            type: "api_spec",
            content: documents.apiSpec,
            generatedBy: "ai"
          }
        ]
      });

      await tx.aiRequestHistory.createMany({
        data: [
          {
            projectId: project.id,
            targetType: "feature_spec",
            requestedByUserId: user.id,
            prompt: "프로젝트 생성 직후 기능 명세서 초안 생성",
            resultSummary: documents.featureSpecFailed ? "fallback 문서 저장" : "기능 명세서 생성 성공",
            status: documents.featureSpecFailed ? "failed" : "success"
          },
          {
            projectId: project.id,
            targetType: "api_spec",
            requestedByUserId: user.id,
            prompt: "프로젝트 생성 직후 API 명세서 초안 생성",
            resultSummary: documents.apiSpecFailed ? "fallback 문서 저장" : "API 명세서 생성 성공",
            status: documents.apiSpecFailed ? "failed" : "success"
          }
        ]
      });
    });

    await Promise.all(
      invitationDrafts.map((draft) =>
        this.emailService
          .sendInvitation({
            email: draft.email,
            projectName: project.name,
            invitationUrl: this.buildInvitationUrl(draft.token, originHeaders)
          })
          .catch((error: unknown) => {
            this.logger.warn(
              `Invitation email failed for ${draft.email}: ${
                error instanceof Error ? error.message : "unknown"
              }`
            );
          })
      )
    );

    return this.getProject(project.id, user);
  }

  async listProjects(user: CurrentUser): Promise<{ projects: ProjectListItem[] }> {
    const projects = await this.findProjectsForUser(user.id);
    return {
      projects: projects.map((project) => this.toProjectListItem(project, user.id))
    };
  }

  async getCalendarItems(user: CurrentUser): Promise<{ items: ProjectCalendarItem[] }> {
    const projects = await this.findProjectsForUser(user.id);
    return {
      items: projects.flatMap((project) =>
        project.schedule?.items.map((item) => ({
          ...this.toScheduleItemSummary(item),
          projectId: project.id,
          projectName: project.name
        })) ?? []
      )
    };
  }

  async getProject(projectId: string, user: CurrentUser): Promise<ProjectSummary> {
    const project = await this.refreshExpiredProjectInvitations(await this.findProjectForSummary(projectId));
    this.assertProjectAccess(project, user);
    return this.toProjectSummary(project, user);
  }

  async deleteProject(projectId: string, user: CurrentUser): Promise<{ deleted: true }> {
    const project = await this.findProjectForSummary(projectId);
    this.assertLeader(project, user);

    await this.prisma.project.update({
      where: { id: project.id },
      data: { status: "deleted" }
    });

    return { deleted: true };
  }

  async leaveProject(
    projectId: string,
    input: ProjectLeaveInput,
    user: CurrentUser
  ): Promise<{ left: true; newLeaderUserId?: string }> {
    const project = await this.findProjectForSummary(projectId);
    const membership = project.members.find((member) => member.userId === user.id && member.status === "accepted");

    if (!membership) {
      throw new ForbiddenException("프로젝트 탈퇴 권한이 없습니다.");
    }

    if (membership.role !== "leader") {
      await this.prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: user.id
          }
        },
        data: {
          status: "left"
        }
      });

      return { left: true };
    }

    const newLeaderUserId = input.newLeaderUserId;
    if (!newLeaderUserId || newLeaderUserId === user.id) {
      throw new BadRequestException("리더는 탈퇴 전 새 리더를 선택해야 합니다.");
    }

    const newLeader = project.members.find(
      (member) => member.userId === newLeaderUserId && member.status === "accepted"
    );
    if (!newLeader) {
      throw new BadRequestException("새 리더는 참여 중인 프로젝트 멤버여야 합니다.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: { leaderUserId: newLeaderUserId }
      });

      await tx.projectMember.update({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: newLeaderUserId
          }
        },
        data: {
          role: "leader"
        }
      });

      await tx.projectMember.update({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: user.id
          }
        },
        data: {
          role: "member",
          status: "left"
        }
      });
    });

    return { left: true, newLeaderUserId };
  }

  async getProjectInvitations(projectId: string, user: CurrentUser): Promise<{ invitations: InvitationSummary[] }> {
    const project = await this.refreshExpiredProjectInvitations(await this.findProjectForSummary(projectId));
    this.assertLeader(project, user);
    return {
      invitations: project.invitations.map((invitation) => this.toInvitationSummary(invitation))
    };
  }

  async getProjectDocument(
    projectId: string,
    rawType: string,
    user: CurrentUser
  ): Promise<ProjectDocumentSummary> {
    const type = this.parseProjectDocumentType(rawType);
    const project = await this.findProjectForSummary(projectId);
    this.assertProjectAccess(project, user);
    return this.toDocumentSummary(this.findProjectDocument(project, type));
  }

  async updateProjectDocument(
    projectId: string,
    rawType: string,
    input: DocumentUpdateInput,
    user: CurrentUser
  ): Promise<ProjectDocumentSummary> {
    const type = this.parseProjectDocumentType(rawType);
    const project = await this.findProjectForSummary(projectId);
    this.assertProjectAccess(project, user);
    const document = this.findProjectDocument(project, type);
    this.validateDocumentContent(type, input.content);

    const updated = await this.prisma.projectDocument.update({
      where: { id: document.id },
      data: {
        content: input.content,
        generatedBy: "user"
      }
    });

    return this.toDocumentSummary(updated);
  }

  async editProjectDocumentWithAi(
    projectId: string,
    rawType: string,
    prompt: string,
    user: CurrentUser
  ): Promise<ProjectDocumentSummary> {
    const type = this.parseProjectDocumentType(rawType);
    const project = await this.findProjectForSummary(projectId);
    this.assertProjectAccess(project, user);
    const document = this.findProjectDocument(project, type);

    try {
      const content =
        type === "feature_spec"
          ? await this.aiService.editFeatureSpec({
              project: this.toAiProjectContext(project),
              currentFeatureSpec: document.content,
              prompt
            })
          : await this.aiService.editApiSpec({
              project: this.toAiProjectContext(project),
              currentApiSpec: document.content,
              featureSpec: project.documents.find((item) => item.type === "feature_spec")?.content,
              prompt
            });

      this.validateDocumentContent(type, content);

      const updated = await this.prisma.$transaction(async (tx) => {
        const nextDocument = await tx.projectDocument.update({
          where: { id: document.id },
          data: {
            content,
            generatedBy: "ai"
          }
        });

        await tx.aiRequestHistory.create({
          data: {
            projectId: project.id,
            targetType: type,
            requestedByUserId: user.id,
            prompt,
            resultSummary: this.getDocumentAiSuccessSummary(type),
            status: "success"
          }
        });

        return nextDocument;
      });

      return this.toDocumentSummary(updated);
    } catch (error) {
      await this.prisma.aiRequestHistory.create({
        data: {
          projectId: project.id,
          targetType: type,
          requestedByUserId: user.id,
          prompt,
          resultSummary: error instanceof Error ? error.message : this.getDocumentAiFailureSummary(type),
          status: "failed"
        }
      });

      throw new ServiceUnavailableException(this.getDocumentAiFailureSummary(type));
    }
  }

  async getInvitation(token: string): Promise<InvitationDetail> {
    const invitation = await this.findInvitationByToken(token);
    return this.toInvitationDetail(await this.refreshExpiredInvitation(invitation));
  }

  async acceptInvitation(
    token: string,
    input: ParticipationInput,
    user: CurrentUser
  ): Promise<ProjectSummary> {
    const invitation = await this.refreshExpiredInvitation(await this.findInvitationByToken(token));
    this.assertInvitationCanBeHandled(invitation, user);

    await this.prisma.$transaction(async (tx) => {
      await tx.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" }
      });

      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId: user.id
          }
        },
        create: {
          projectId: invitation.projectId,
          userId: user.id,
          role: "member",
          status: "accepted",
          major: input.major,
          techStacks: input.techStacks,
          availableTimes: input.availableTimes,
          joinedAt: new Date()
        },
        update: {
          status: "accepted",
          major: input.major,
          techStacks: input.techStacks,
          availableTimes: input.availableTimes,
          joinedAt: new Date()
        }
      });
    });

    return this.getProject(invitation.projectId, user);
  }

  async rejectInvitation(token: string, user: CurrentUser): Promise<InvitationDetail> {
    const invitation = await this.refreshExpiredInvitation(await this.findInvitationByToken(token));
    this.assertInvitationCanBeHandled(invitation, user);

    const updated = await this.prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: "rejected" },
      include: {
        project: true
      }
    });

    await this.prisma.projectMember.deleteMany({
      where: {
        projectId: invitation.projectId,
        userId: user.id,
        status: "pending"
      }
    });

    return this.toInvitationDetail(updated);
  }

  async updateMyParticipation(
    projectId: string,
    input: ParticipationInput,
    user: CurrentUser
  ): Promise<ProjectSummary> {
    const project = await this.findProjectForSummary(projectId);
    this.assertProjectAccess(project, user);

    const membership = project.members.find((member) => member.userId === user.id && member.status === "accepted");
    if (!membership) {
      throw new ForbiddenException("프로젝트 참여 정보 수정 권한이 없습니다.");
    }

    await this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id
        }
      },
      data: {
        major: input.major,
        techStacks: input.techStacks,
        availableTimes: input.availableTimes
      }
    });

    return this.getProject(projectId, user);
  }

  async getSchedule(projectId: string, user: CurrentUser): Promise<ProjectScheduleSummary | null> {
    const project = await this.findProjectForSummary(projectId);
    this.assertProjectAccess(project, user);
    return project.schedule ? this.toScheduleSummary(project.schedule) : null;
  }

  async generateSchedule(projectId: string, user: CurrentUser): Promise<ProjectScheduleSummary> {
    const project = await this.findProjectForSummary(projectId);
    this.assertLeader(project, user);
    const members = this.getReadyMembers(project);
    const featureSpec = project.documents.find((document) => document.type === "feature_spec")?.content || "";

    try {
      const items = await this.aiService.generateSchedule({
        project: this.toAiProjectContext(project),
        members: members.map((member) => this.toAiMemberContext(member)),
        featureSpec
      });
      const sanitized = this.sanitizeScheduleItems(project, items);
      this.validateScheduleItems(project, sanitized);
      const schedule = await this.replaceSchedule(project.id, "ai", sanitized);

      await this.prisma.aiRequestHistory.create({
        data: {
          projectId: project.id,
          targetType: "schedule",
          requestedByUserId: user.id,
          prompt: "프로젝트 일정 생성",
          resultSummary: "일정 생성 성공",
          status: "success"
        }
      });

      return schedule;
    } catch (error) {
      await this.prisma.aiRequestHistory.create({
        data: {
          projectId: project.id,
          targetType: "schedule",
          requestedByUserId: user.id,
          prompt: "프로젝트 일정 생성",
          resultSummary: error instanceof Error ? error.message : "일정 생성 실패",
          status: "failed"
        }
      });

      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new BadRequestException(`AI가 생성한 일정 데이터 형식이 올바르지 않습니다: ${error.issues[0]?.message} (${error.issues[0]?.path.join(".")})`);
      }
      if (error instanceof SyntaxError) {
        throw new BadRequestException("AI가 올바른 JSON 형식의 일정을 생성하지 못했습니다. 다시 시도해 주세요.");
      }
      throw new ServiceUnavailableException(
        error instanceof Error ? `AI 일정 생성에 실패했습니다: ${error.message}` : "AI 일정 생성에 실패했어요."
      );
    }
  }

  async updateSchedule(
    projectId: string,
    input: { items: ScheduleItemInput[] },
    user: CurrentUser
  ): Promise<ProjectScheduleSummary> {
    const project = await this.findProjectForSummary(projectId);
    this.assertLeader(project, user);
    const parsed = scheduleUpdateInputSchema.parse(input);
    this.validateScheduleItems(project, parsed.items);
    return this.replaceSchedule(project.id, "user", parsed.items);
  }

  async editScheduleWithAi(projectId: string, prompt: string, user: CurrentUser): Promise<ProjectScheduleSummary> {
    const project = await this.findProjectForSummary(projectId);
    this.assertLeader(project, user);

    if (!project.schedule) {
      throw new BadRequestException("먼저 일정을 생성해 주세요.");
    }

    const members = this.getReadyMembers(project);
    const currentSchedule = this.toScheduleSummary(project.schedule);

    try {
      const items = await this.aiService.editSchedule({
        project: this.toAiProjectContext(project),
        members: members.map((member) => this.toAiMemberContext(member)),
        currentSchedule,
        prompt
      });
      const sanitized = this.sanitizeScheduleItems(project, items);
      this.validateScheduleItems(project, sanitized);
      const schedule = await this.replaceSchedule(project.id, "ai", sanitized);

      await this.prisma.aiRequestHistory.create({
        data: {
          projectId: project.id,
          targetType: "schedule",
          requestedByUserId: user.id,
          prompt,
          resultSummary: "일정 AI 수정 성공",
          status: "success"
        }
      });

      return schedule;
    } catch (error) {
      await this.prisma.aiRequestHistory.create({
        data: {
          projectId: project.id,
          targetType: "schedule",
          requestedByUserId: user.id,
          prompt,
          resultSummary: error instanceof Error ? error.message : "일정 AI 수정 실패",
          status: "failed"
        }
      });

      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new BadRequestException(`AI가 수정 대행한 일정 데이터 형식이 올바르지 않습니다: ${error.issues[0]?.message} (${error.issues[0]?.path.join(".")})`);
      }
      if (error instanceof SyntaxError) {
        throw new BadRequestException("AI가 올바른 JSON 형식의 일정을 편집하지 못했습니다. 다시 시도해 주세요.");
      }
      throw new ServiceUnavailableException(
        error instanceof Error ? `AI 일정 수정에 실패했습니다: ${error.message}` : "AI 일정 수정에 실패했어요."
      );
    }
  }

  private async generateDocumentsWithFallback(
    input: ProjectCreateInput
  ): Promise<GeneratedDocuments> {
    try {
      return await this.aiService.generateInitialDocuments(input);
    } catch (error) {
      const isApiKeyMissing = error instanceof Error && error.message.includes("OPENAI_API_KEY");
      if (isApiKeyMissing) {
        this.logger.warn(
          "⚠️ [AI 서비스 장애] OPENAI_API_KEY 환경변수가 설정되지 않았거나 유효하지 않습니다. " +
            "기능 및 API 명세서 초안은 AI 자동 생성 대신 기본 템플릿(Fallback)으로 대체되어 저장됩니다."
        );
      } else {
        this.logger.warn(
          `Initial document generation failed: ${error instanceof Error ? error.message : "unknown"}`
        );
      }
      return {
        featureSpec: FALLBACK_DOCUMENT_CONTENT,
        apiSpec: FALLBACK_DOCUMENT_CONTENT,
        featureSpecFailed: true,
        apiSpecFailed: true
      };
    }
  }

  private async replaceSchedule(
    projectId: string,
    generatedBy: "ai" | "user",
    items: ScheduleItemInput[]
  ): Promise<ProjectScheduleSummary> {
    const schedule = await this.prisma.$transaction(async (tx) => {
      const persistedSchedule = await tx.projectSchedule.upsert({
        where: { projectId },
        create: {
          projectId,
          generatedBy
        },
        update: {
          generatedBy
        }
      });

      await tx.scheduleItem.deleteMany({
        where: { scheduleId: persistedSchedule.id }
      });

      await tx.scheduleItem.createMany({
        data: items.map((item) => ({
          scheduleId: persistedSchedule.id,
          title: item.title,
          type: item.type,
          description: item.description,
          assigneeUserIds: item.assigneeUserIds,
          startDate: new Date(`${item.startDate}T00:00:00.000Z`),
          endDate: new Date(`${item.endDate}T00:00:00.000Z`)
        }))
      });

      return tx.projectSchedule.findUnique({
        where: { id: persistedSchedule.id },
        include: {
          items: {
            orderBy: [{ startDate: "asc" }, { endDate: "asc" }]
          }
        }
      });
    });

    if (!schedule) {
      throw new NotFoundException("일정을 찾을 수 없습니다.");
    }

    return this.toScheduleSummary(schedule);
  }

  private sanitizeScheduleItems(project: ProjectForSummary, items: ScheduleItemInput[]): ScheduleItemInput[] {
    const acceptedUserIds = new Set(
      project.members.filter((member) => member.status === "accepted").map((member) => member.userId)
    );

    return items.map((item) => {
      let type = (item.type || "task").toLowerCase();
      if (type !== "task" && type !== "sprint" && type !== "meeting") {
        type = "task";
      }

      const startDate = (item.startDate || "").slice(0, 10);
      const endDate = (item.endDate || "").slice(0, 10);

      const assigneeUserIds = (item.assigneeUserIds || [])
        .filter((userId) => typeof userId === "string" && acceptedUserIds.has(userId));

      return {
        ...item,
        type: type as "task" | "sprint" | "meeting",
        startDate,
        endDate,
        assigneeUserIds
      };
    });
  }

  private validateScheduleItems(project: ProjectForSummary, items: ScheduleItemInput[]) {
    const projectStart = project.startDate.getTime();
    const projectEnd = project.endDate.getTime();
    const acceptedUserIds = new Set(
      project.members.filter((member) => member.status === "accepted").map((member) => member.userId)
    );

    for (const item of items) {
      const itemStart = new Date(`${item.startDate}T00:00:00.000Z`).getTime();
      const itemEnd = new Date(`${item.endDate}T00:00:00.000Z`).getTime();

      if (itemStart < projectStart || itemEnd > projectEnd) {
        throw new BadRequestException("일정은 프로젝트 기간 안에 있어야 합니다.");
      }

      const unknownAssignee = item.assigneeUserIds.find((userId) => !acceptedUserIds.has(userId));
      if (unknownAssignee) {
        throw new BadRequestException("프로젝트 멤버만 담당자로 지정할 수 있습니다.");
      }
    }
  }

  private parseProjectDocumentType(rawType: string): ProjectDocumentType {
    const parsed = projectDocumentTypeSchema.safeParse(rawType);
    if (!parsed.success) {
      throw new BadRequestException("지원하지 않는 문서 유형입니다.");
    }
    return parsed.data;
  }

  private findProjectDocument(project: ProjectForSummary, type: ProjectDocumentType) {
    const document = project.documents.find((item) => item.type === type);
    if (!document) {
      throw new NotFoundException("문서를 찾을 수 없습니다.");
    }
    return document;
  }

  private validateDocumentContent(type: ProjectDocumentType, content: string) {
    if (type !== "feature_spec") {
      return;
    }

    const parsed = featureSpecContentSchema.safeParse(content);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message || `기능 명세서는 ${FEATURE_SPEC_MAX_LENGTH}자 이하로 저장해야 합니다.`
      );
    }
  }

  private getDocumentAiSuccessSummary(type: ProjectDocumentType): string {
    return type === "feature_spec" ? "기능 명세서 AI 수정 성공" : "API 명세서 AI 수정 성공";
  }

  private getDocumentAiFailureSummary(type: ProjectDocumentType): string {
    return type === "feature_spec" ? "AI 기능 명세서 수정에 실패했어요." : "AI API 명세서 수정에 실패했어요.";
  }

  private getReadyMembers(project: ProjectForSummary) {
    const acceptedMembers = project.members.filter((member) => member.status === "accepted");
    const missingMember = acceptedMembers.find((member) => {
      const availableTimes = this.toAvailableTimes(member.availableTimes);
      return !member.major || member.techStacks.length === 0 || availableTimes.length === 0;
    });

    if (missingMember) {
      throw new BadRequestException("모든 참여 멤버의 전공, 기술 스택, 참여 가능 시간을 먼저 입력해 주세요.");
    }

    return acceptedMembers;
  }

  private assertProjectAccess(project: ProjectForSummary, user: CurrentUser) {
    const hasAccess =
      project.leaderUserId === user.id ||
      project.members.some((member) => member.userId === user.id && member.status === "accepted");

    if (!hasAccess) {
      throw new ForbiddenException("프로젝트 접근 권한이 없습니다.");
    }
  }

  private assertLeader(project: ProjectForSummary, user: CurrentUser) {
    if (project.leaderUserId !== user.id) {
      throw new ForbiddenException("프로젝트 리더 권한이 필요합니다.");
    }
  }

  private assertInvitationCanBeHandled(invitation: InvitationForDetail, user: CurrentUser) {
    if (invitation.status !== "pending") {
      throw new BadRequestException("이미 처리된 초대입니다.");
    }

    if (invitation.project.status !== "active") {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }

    if (invitation.email !== user.email) {
      throw new ForbiddenException("초대받은 이메일로 로그인해 주세요.");
    }
  }

  private async refreshExpiredInvitation(invitation: InvitationForDetail): Promise<InvitationForDetail> {
    if (invitation.status !== "pending" || invitation.expiresAt >= new Date()) {
      return invitation;
    }

    return this.prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
      include: { project: true }
    });
  }

  private async refreshExpiredProjectInvitations(project: ProjectForSummary): Promise<ProjectForSummary> {
    const now = new Date();
    const expiredInvitationIds = project.invitations
      .filter((invitation) => invitation.status === "pending" && invitation.expiresAt < now)
      .map((invitation) => invitation.id);

    if (!expiredInvitationIds.length) {
      return project;
    }

    await this.prisma.projectInvitation.updateMany({
      where: {
        id: { in: expiredInvitationIds }
      },
      data: {
        status: "expired"
      }
    });

    return this.findProjectForSummary(project.id);
  }

  async findProjectForSummary(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: true
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
        },
        invitations: {
          orderBy: { sentAt: "asc" }
        },
        documents: {
          orderBy: { type: "asc" }
        },
        schedule: {
          include: {
            items: {
              orderBy: [{ startDate: "asc" }, { endDate: "asc" }]
            }
          }
        }
      }
    });

    if (!project || project.status !== "active") {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }

    return project;
  }

  async findProjectsForUser(userId: string) {
    return this.prisma.project.findMany({
      where: {
        status: "active",
        members: {
          some: {
            userId,
            status: "accepted"
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
        },
        invitations: {
          orderBy: { sentAt: "asc" }
        },
        documents: true,
        schedule: {
          include: {
            items: {
              orderBy: [{ startDate: "asc" }, { endDate: "asc" }]
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  async findInvitationByToken(token: string) {
    const tokenHash = this.hashInvitationToken(token);
    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { tokenHash },
      include: {
        project: true
      }
    });

    if (!invitation) {
      throw new NotFoundException("초대를 찾을 수 없습니다.");
    }

    return invitation;
  }

  private toProjectSummary(project: ProjectForSummary, user: CurrentUser): ProjectSummary {
    const currentMembership = project.members.find((member) => member.userId === user.id && member.status === "accepted");

    return {
      id: project.id,
      name: project.name,
      type: project.type,
      originalIdea: project.originalIdea,
      enhancedIdea: project.enhancedIdea,
      ideaEnhancementUsed: project.ideaEnhancementUsed,
      startDate: this.toDateOnly(project.startDate),
      endDate: this.toDateOnly(project.endDate),
      inviteCount: project.invitations.filter((invitation) => invitation.status === "pending").length,
      currentUserId: user.id,
      currentUserRole: currentMembership?.role ?? (project.leaderUserId === user.id ? "leader" : null),
      documents: project.documents.map((document) => this.toDocumentSummary(document)),
      members: project.members.map((member) => this.toMemberSummary(member)),
      invitations: project.invitations.map((invitation) => this.toInvitationSummary(invitation)),
      schedule: project.schedule ? this.toScheduleSummary(project.schedule) : null
    };
  }

  private toProjectListItem(project: ProjectForList, userId: string): ProjectListItem {
    const currentMembership = project.members.find((member) => member.userId === userId && member.status === "accepted");
    if (!currentMembership) {
      throw new ForbiddenException("프로젝트 접근 권한이 없습니다.");
    }

    return {
      id: project.id,
      name: project.name,
      type: project.type,
      currentUserRole: currentMembership.role,
      startDate: this.toDateOnly(project.startDate),
      endDate: this.toDateOnly(project.endDate),
      memberCount: project.members.filter((member) => member.status === "accepted").length,
      pendingInvitationCount: project.invitations.filter((invitation) => invitation.status === "pending").length,
      documentCount: project.documents.length,
      scheduleItemCount: project.schedule?.items.length ?? 0,
      updatedAt: project.updatedAt.toISOString()
    };
  }

  private toDocumentSummary(document: ProjectForSummary["documents"][number]): ProjectDocumentSummary {
    return {
      id: document.id,
      type: document.type,
      content: document.content,
      generatedBy: document.generatedBy,
      updatedAt: document.updatedAt.toISOString()
    };
  }

  private toMemberSummary(member: ProjectForSummary["members"][number]): ProjectMemberSummary {
    return {
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      role: member.role,
      status: member.status,
      major: member.major,
      techStacks: member.techStacks,
      availableTimes: this.toAvailableTimes(member.availableTimes),
      joinedAt: member.joinedAt?.toISOString() ?? null
    };
  }

  private toInvitationSummary(invitation: ProjectForSummary["invitations"][number]): InvitationSummary {
    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      sentAt: invitation.sentAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString()
    };
  }

  private toInvitationDetail(invitation: InvitationForDetail): InvitationDetail {
    return {
      id: invitation.id,
      projectId: invitation.projectId,
      projectName: invitation.project.name,
      email: invitation.email,
      status: invitation.status,
      sentAt: invitation.sentAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString()
    };
  }

  private toScheduleSummary(schedule: NonNullable<ProjectForSummary["schedule"]>): ProjectScheduleSummary {
    return {
      id: schedule.id,
      generatedBy: schedule.generatedBy,
      updatedAt: schedule.updatedAt.toISOString(),
      items: schedule.items.map((item) => this.toScheduleItemSummary(item))
    };
  }

  private toScheduleItemSummary(item: NonNullable<ProjectForSummary["schedule"]>["items"][number]): ScheduleItemSummary {
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      description: item.description,
      assigneeUserIds: item.assigneeUserIds,
      startDate: this.toDateOnly(item.startDate),
      endDate: this.toDateOnly(item.endDate)
    };
  }

  private toAiProjectContext(project: ProjectForSummary) {
    return {
      id: project.id,
      name: project.name,
      type: project.type,
      idea: project.enhancedIdea || project.originalIdea,
      startDate: this.toDateOnly(project.startDate),
      endDate: this.toDateOnly(project.endDate)
    };
  }

  private toAiMemberContext(member: ProjectForSummary["members"][number]) {
    return {
      userId: member.userId,
      name: member.user.name,
      role: member.role,
      major: member.major || "",
      techStacks: member.techStacks,
      availableTimes: this.toAvailableTimes(member.availableTimes)
    };
  }

  private toAvailableTimes(value: unknown) {
    const parsed = availableTimeSchema.array().safeParse(value);
    return parsed.success ? parsed.data : [];
  }

  private createInvitationDraft(email: string): InvitationDraft {
    const token = randomBytes(32).toString("hex");
    return {
      email,
      token,
      tokenHash: this.hashInvitationToken(token),
      expiresAt: new Date(Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
    };
  }

  private hashInvitationToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private buildInvitationUrl(token: string, requestOrigin?: string): string {
    let origin =
      process.env.FRONTEND_PUBLIC_URL?.trim() ||
      requestOrigin?.trim() ||
      process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim() ||
      "http://localhost:3000";

    if (origin.endsWith("/")) {
      origin = origin.slice(0, -1);
    }

    return `${origin}/invitations/${token}`;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
