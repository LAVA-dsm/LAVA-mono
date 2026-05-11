import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import {
  FALLBACK_DOCUMENT_CONTENT,
  type ProjectCreateInput,
  type ProjectSummary
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

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly emailService: EmailService
  ) {}

  async createProject(input: ProjectCreateInput, user: CurrentUser): Promise<ProjectSummary> {
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
            invitationUrl: this.buildInvitationUrl(draft.token)
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

  async getProject(projectId: string, user: CurrentUser): Promise<ProjectSummary> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
        invitations: true,
        documents: {
          orderBy: { type: "asc" }
        }
      }
    });

    if (!project || project.status !== "active") {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }

    const hasAccess =
      project.leaderUserId === user.id ||
      project.members.some((member) => member.userId === user.id && member.status === "accepted");

    if (!hasAccess) {
      throw new ForbiddenException("프로젝트 접근 권한이 없습니다.");
    }

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
      documents: project.documents.map((document) => ({
        id: document.id,
        type: document.type,
        content: document.content,
        generatedBy: document.generatedBy,
        updatedAt: document.updatedAt.toISOString()
      }))
    };
  }

  private async generateDocumentsWithFallback(
    input: ProjectCreateInput
  ): Promise<GeneratedDocuments> {
    try {
      return await this.aiService.generateInitialDocuments(input);
    } catch (error) {
      this.logger.warn(
        `Initial document generation failed: ${error instanceof Error ? error.message : "unknown"}`
      );
      return {
        featureSpec: FALLBACK_DOCUMENT_CONTENT,
        apiSpec: FALLBACK_DOCUMENT_CONTENT,
        featureSpecFailed: true,
        apiSpecFailed: true
      };
    }
  }

  private createInvitationDraft(email: string): InvitationDraft {
    const token = randomBytes(32).toString("hex");
    return {
      email,
      token,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private buildInvitationUrl(token: string): string {
    const origin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
    return `${origin}/invitations/${token}`;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
