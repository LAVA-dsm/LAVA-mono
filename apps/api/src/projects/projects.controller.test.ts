import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHash } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiService } from "../ai/ai.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsModule } from "./projects.module";

const longIdea =
  "LAVA는 팀 프로젝트를 시작하는 사용자가 아이디어를 구체화하고 기능 명세서와 API 명세서를 빠르게 만들 수 있게 돕는 서비스입니다. " +
  "프로젝트 이름, 유형, 일정, 팀원 초대 정보를 바탕으로 AI가 개발 가능한 초안을 생성하고 사용자는 이를 검토해 바로 작업에 들어갑니다. " +
  "학생 팀과 주니어 개발자가 초기 기획 문서를 빠르게 만들고 반복 수정할 수 있도록 프로젝트 목적, 핵심 사용자, 주요 기능, 개발 범위를 함께 정리합니다.";

type MockUser = { id: string; email: string; name: string };
type MockMember = {
  id: string;
  projectId: string;
  userId: string;
  role: "leader" | "member";
  status: "pending" | "accepted" | "rejected" | "left";
  major: string | null;
  techStacks: string[];
  availableTimes: unknown;
  joinedAt: Date | null;
  user: MockUser;
};
type MockInvitation = {
  id: string;
  projectId: string;
  email: string;
  tokenHash: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  sentAt: Date;
  expiresAt: Date;
};
type MockSchedule = {
  id: string;
  projectId: string;
  generatedBy: "ai" | "user";
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    scheduleId: string;
    title: string;
    type: "task" | "sprint" | "meeting";
    description: string;
    assigneeUserIds: string[];
    startDate: Date;
    endDate: Date;
  }>;
};
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
  members: MockMember[];
  invitations: MockInvitation[];
  documents: Array<{
    id: string;
    type: "feature_spec" | "api_spec";
    content: string;
    generatedBy: "ai";
    updatedAt: Date;
  }>;
  schedule: MockSchedule | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createPrismaMock() {
  const projects = new Map<string, MockProject>();
  const users = new Map<string, MockUser>();
  let projectCounter = 0;
  let memberCounter = 0;
  let invitationCounter = 0;
  let documentCounter = 0;
  let scheduleCounter = 0;
  let scheduleItemCounter = 0;

  const ensureUser = (user: MockUser) => {
    users.set(user.id, user);
    return user;
  };

  const prisma: any = {
    project: {
      create: vi.fn(async ({ data }) => {
        projectCounter += 1;
        memberCounter += 1;
        const leader =
          users.get(data.leaderUserId) ||
          ensureUser({
            id: data.leaderUserId,
            email: `${data.leaderUserId}@example.com`,
            name: data.leaderUserId
          });
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
              id: `member-${memberCounter}`,
              projectId: `project-${projectCounter}`,
              userId: data.members.create.userId,
              role: data.members.create.role,
              status: data.members.create.status,
              major: null,
              techStacks: [],
              availableTimes: null,
              joinedAt: data.members.create.joinedAt,
              user: leader
            }
          ],
          invitations: data.invitations.create.map((invitation: any) => {
            invitationCounter += 1;
            return {
              id: `invitation-${invitationCounter}`,
              projectId: `project-${projectCounter}`,
              email: invitation.email,
              tokenHash: invitation.tokenHash,
              status: "pending",
              sentAt: new Date("2026-06-01T00:00:00.000Z"),
              expiresAt: invitation.expiresAt
            };
          }),
          documents: [],
          schedule: null
        };
        projects.set(project.id, project);
        return project;
      }),
      findUnique: vi.fn(async ({ where }) => projects.get(where.id) ?? null)
    },
    projectInvitation: {
      findFirst: vi.fn(async ({ where }) => {
        for (const project of projects.values()) {
          const invitation = project.invitations.find((item) => item.tokenHash === where.tokenHash);
          if (invitation) return { ...invitation, project };
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }) => {
        for (const project of projects.values()) {
          const invitation = project.invitations.find((item) => item.id === where.id);
          if (invitation) {
            Object.assign(invitation, data);
            return { ...invitation, project };
          }
        }
        throw new Error("Invitation not found");
      })
    },
    projectMember: {
      upsert: vi.fn(async ({ where, create, update }) => {
        const project = projects.get(where.projectId_userId.projectId);
        if (!project) throw new Error("Project not found");
        const user =
          users.get(where.projectId_userId.userId) ||
          ensureUser({
            id: where.projectId_userId.userId,
            email: `${where.projectId_userId.userId}@example.com`,
            name: where.projectId_userId.userId
          });
        const existing = project.members.find((member) => member.userId === where.projectId_userId.userId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        memberCounter += 1;
        const member: MockMember = {
          id: `member-${memberCounter}`,
          projectId: create.projectId,
          userId: create.userId,
          role: create.role,
          status: create.status,
          major: create.major,
          techStacks: create.techStacks,
          availableTimes: create.availableTimes,
          joinedAt: create.joinedAt,
          user
        };
        project.members.push(member);
        return member;
      }),
      update: vi.fn(async ({ where, data }) => {
        const project = projects.get(where.projectId_userId.projectId);
        const member = project?.members.find((item) => item.userId === where.projectId_userId.userId);
        if (!member) throw new Error("Member not found");
        Object.assign(member, data);
        return member;
      }),
      deleteMany: vi.fn(async () => ({ count: 0 }))
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
    projectSchedule: {
      upsert: vi.fn(async ({ where, create, update }) => {
        const project = projects.get(where.projectId);
        if (!project) throw new Error("Project not found");
        if (project.schedule) {
          project.schedule.generatedBy = update.generatedBy;
          project.schedule.updatedAt = new Date("2026-06-03T00:00:00.000Z");
          return project.schedule;
        }
        scheduleCounter += 1;
        project.schedule = {
          id: `schedule-${scheduleCounter}`,
          projectId: create.projectId,
          generatedBy: create.generatedBy,
          createdAt: new Date("2026-06-03T00:00:00.000Z"),
          updatedAt: new Date("2026-06-03T00:00:00.000Z"),
          items: []
        };
        return project.schedule;
      }),
      findUnique: vi.fn(async ({ where }) => {
        for (const project of projects.values()) {
          if (project.schedule?.id === where.id) return project.schedule;
        }
        return null;
      })
    },
    scheduleItem: {
      deleteMany: vi.fn(async ({ where }) => {
        for (const project of projects.values()) {
          const schedule = project.schedule;
          if (!schedule || schedule.id !== where.scheduleId) continue;
          const count = schedule.items.length;
          schedule.items = [];
          return { count };
        }
        return { count: 0 };
      }),
      createMany: vi.fn(async ({ data }) => {
        for (const item of data) {
          for (const project of projects.values()) {
            const schedule = project.schedule;
            if (!schedule || schedule.id !== item.scheduleId) continue;
            scheduleItemCounter += 1;
            schedule.items.push({
              id: `schedule-item-${scheduleItemCounter}`,
              ...item
            });
          }
        }
        return { count: data.length };
      })
    },
    aiRequestHistory: {
      createMany: vi.fn(async ({ data }) => ({ count: data.length })),
      create: vi.fn(async ({ data }) => ({ id: "ai-history-1", ...data }))
    },
    $transaction: vi.fn(async (callback) => callback(prisma))
  };

  return { prisma, projects, users, ensureUser };
}

describe("ProjectsController", () => {
  let app: INestApplication;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let aiService: {
    generateInitialDocuments: ReturnType<typeof vi.fn>;
    generateSchedule: ReturnType<typeof vi.fn>;
    editSchedule: ReturnType<typeof vi.fn>;
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
      })),
      generateSchedule: vi.fn(async () => [
        {
          title: "기능 구현",
          type: "task",
          description: "핵심 기능 구현",
          assigneeUserIds: ["leader-1"],
          startDate: "2026-06-01",
          endDate: "2026-06-03"
        }
      ]),
      editSchedule: vi.fn(async () => [])
    };
    emailService = {
      sendInvitation: vi.fn(async () => undefined)
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ProjectsModule]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const requestObject = context.switchToHttp().getRequest();
          const id = requestObject.header("x-test-user-id") || "leader-1";
          const email = requestObject.header("x-test-user-email") || `${id}@example.com`;
          const name = requestObject.header("x-test-user-name") || id;
          prismaMock.ensureUser({ id, email, name });
          requestObject.user = { id, email, name };
          return true;
        }
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

  it("creates a team project with pending invitation status", async () => {
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

    expect(response.body.inviteCount).toBe(1);
    expect(response.body.invitations[0]).toEqual(expect.objectContaining({ email: "teammate@example.com", status: "pending" }));
    expect(emailService.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("accepts an invitation only for the invited email", async () => {
    const created = await request(app.getHttpServer())
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
    const project = prismaMock.projects.get(created.body.id);
    if (!project?.invitations[0]) throw new Error("Invitation was not created");
    project.invitations[0].tokenHash = hashToken("invite-token");

    const response = await request(app.getHttpServer())
      .post("/invitations/invite-token/accept")
      .set("x-test-user-id", "member-1")
      .set("x-test-user-email", "teammate@example.com")
      .set("x-test-user-name", "Invited Member")
      .send({
        major: "컴퓨터공학",
        techStacks: ["React"],
        availableTimes: [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
      })
      .expect(201);

    expect(response.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "teammate@example.com", status: "accepted", major: "컴퓨터공학" })
      ])
    );
    expect(project.invitations[0].status).toBe("accepted");
  });

  it("blocks schedule generation until every accepted member has participation info", async () => {
    const created = await request(app.getHttpServer())
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

    await request(app.getHttpServer()).post(`/projects/${created.body.id}/schedule/generate`).send({}).expect(400);
  });

  it("generates and stores a schedule for a ready leader", async () => {
    const created = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .patch(`/projects/${created.body.id}/members/me/participation`)
      .send({
        major: "컴퓨터공학",
        techStacks: ["NestJS"],
        availableTimes: [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
      })
      .expect(200);

    const response = await request(app.getHttpServer()).post(`/projects/${created.body.id}/schedule/generate`).send({}).expect(201);

    expect(response.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "기능 구현", type: "task" })])
    );
  });
});
