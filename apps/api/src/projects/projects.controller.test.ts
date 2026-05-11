import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_DOCUMENT_CONTENT } from "@lava/shared";
import { AiService } from "../ai/ai.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsModule } from "./projects.module";

const longIdea =
  "LAVA는 팀 프로젝트를 시작하는 사용자가 아이디어를 구체화하고 기능 명세서와 API 명세서를 빠르게 만들 수 있게 돕는 서비스입니다. " +
  "프로젝트 이름, 유형, 일정, 팀원 초대 정보를 바탕으로 AI가 개발 가능한 초안을 생성하고 사용자는 이를 검토해 바로 작업에 들어갑니다. " +
  "학생 팀과 주니어 개발자가 초기 기획 문서를 빠르게 만들고 반복 수정할 수 있도록 프로젝트 목적, 핵심 사용자, 주요 기능, 개발 범위를 함께 정리합니다.";

type MockProject = {
  id: string;
  name: string;
  type: "personal" | "team";
  leaderUserId: string;
  originalIdea: string;
  enhancedIdea: string | null;
  ideaEnhancementUsed: boolean;
  startDate: Date;
  endDate: Date;
  status: "active";
  members: Array<{ userId: string; status: "accepted" }>;
  invitations: Array<{ email: string; tokenHash: string; expiresAt: Date; status: "pending" }>;
  documents: Array<{
    id: string;
    type: "feature_spec" | "api_spec";
    content: string;
    generatedBy: "ai";
    updatedAt: Date;
  }>;
};

function createPrismaMock() {
  const projects = new Map<string, MockProject>();
  const users = new Map<string, { id: string; email: string; name: string }>();
  let projectCounter = 0;
  let documentCounter = 0;

  const prisma: any = {
    user: {
      upsert: vi.fn(async ({ where, create }) => {
        const existing = users.get(where.id);
        if (existing) return existing;
        const user = { id: create.id, email: create.email, name: create.name };
        users.set(user.id, user);
        return user;
      })
    },
    project: {
      create: vi.fn(async ({ data }) => {
        projectCounter += 1;
        const project: MockProject = {
          id: `project-${projectCounter}`,
          name: data.name,
          type: data.type,
          leaderUserId: data.leaderUserId,
          originalIdea: data.originalIdea,
          enhancedIdea: data.enhancedIdea,
          ideaEnhancementUsed: data.ideaEnhancementUsed,
          startDate: data.startDate,
          endDate: data.endDate,
          status: "active",
          members: [
            {
              userId: data.members.create.userId,
              status: "accepted"
            }
          ],
          invitations: data.invitations.create.map((invitation: any) => ({
            ...invitation,
            status: "pending"
          })),
          documents: []
        };
        projects.set(project.id, project);
        return project;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return projects.get(where.id) ?? null;
      })
    },
    projectDocument: {
      createMany: vi.fn(async ({ data }) => {
        for (const document of data) {
          const project = projects.get(document.projectId);
          if (project) {
            documentCounter += 1;
            project.documents.push({
              id: `document-${documentCounter}`,
              type: document.type,
              content: document.content,
              generatedBy: document.generatedBy,
              updatedAt: new Date("2026-06-02T00:00:00.000Z")
            });
          }
        }
        return { count: data.length };
      })
    },
    aiRequestHistory: {
      createMany: vi.fn(async ({ data }) => ({ count: data.length }))
    },
    $transaction: vi.fn(async (callback) => callback(prisma))
  };

  return { prisma, projects };
}

describe("ProjectsController", () => {
  let app: INestApplication;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let aiService: {
    generateInitialDocuments: ReturnType<typeof vi.fn>;
  };
  let emailService: {
    sendInvitation: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    aiService = {
      generateInitialDocuments: vi.fn(async () => ({
        featureSpec: "# 기능 명세서",
        apiSpec: "# API 명세서",
        featureSpecFailed: false,
        apiSpecFailed: false
      }))
    };
    emailService = {
      sendInvitation: vi.fn(async () => undefined)
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ProjectsModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock.prisma)
      .overrideProvider(AiService)
      .useValue(aiService)
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it("creates a personal project without invitations", async () => {
    const response = await request(app.getHttpServer())
      .post("/projects")
      .send({
        name: "LAVA",
        type: "personal",
        originalIdea: longIdea,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        inviteEmails: ["teammate@example.com"]
      })
      .expect(201);

    expect(response.body.inviteCount).toBe(0);
    expect(emailService.sendInvitation).not.toHaveBeenCalled();
  });

  it("creates a team project with pending invitation email metadata", async () => {
    const response = await request(app.getHttpServer())
      .post("/projects")
      .send({
        name: "LAVA",
        type: "team",
        originalIdea: longIdea,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        inviteEmails: ["teammate@example.com"]
      })
      .expect(201);

    const project = prismaMock.projects.get(response.body.id);
    expect(response.body.inviteCount).toBe(1);
    expect(project?.invitations[0]?.email).toBe("teammate@example.com");
    expect(project?.invitations[0]?.tokenHash).toHaveLength(64);
    expect(project?.invitations[0]?.expiresAt).toBeInstanceOf(Date);
    expect(emailService.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("stores generated feature and API specification documents", async () => {
    const response = await request(app.getHttpServer())
      .post("/projects")
      .send({
        name: "LAVA",
        type: "personal",
        originalIdea: longIdea,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        inviteEmails: []
      })
      .expect(201);

    expect(response.body.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "feature_spec", content: "# 기능 명세서" }),
        expect.objectContaining({ type: "api_spec", content: "# API 명세서" })
      ])
    );
  });

  it("stores fallback documents when AI generation fails", async () => {
    aiService.generateInitialDocuments.mockRejectedValueOnce(new Error("AI failed"));

    const response = await request(app.getHttpServer())
      .post("/projects")
      .send({
        name: "LAVA",
        type: "personal",
        originalIdea: longIdea,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        inviteEmails: []
      })
      .expect(201);

    expect(response.body.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "feature_spec", content: FALLBACK_DOCUMENT_CONTENT }),
        expect.objectContaining({ type: "api_spec", content: FALLBACK_DOCUMENT_CONTENT })
      ])
    );
  });

  it("rejects project access for another dev user", async () => {
    const created = await request(app.getHttpServer())
      .post("/projects")
      .set("x-dev-user-id", "leader-1")
      .send({
        name: "LAVA",
        type: "personal",
        originalIdea: longIdea,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        inviteEmails: []
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/projects/${created.body.id}`)
      .set("x-dev-user-id", "leader-2")
      .expect(403);
  });
});
