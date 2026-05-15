import { describe, expect, it } from "vitest";
import {
  aiDocumentEditInputSchema,
  aiScheduleEditInputSchema,
  featureSpecContentSchema,
  loginInputSchema,
  participationInputSchema,
  projectCreateInputSchema,
  scheduleUpdateInputSchema,
  signupCompleteInputSchema,
  signupVerifyInputSchema
} from "./index";

const longIdea =
  "LAVA는 팀 프로젝트를 시작하는 사용자가 아이디어를 구체화하고 기능 명세서와 API 명세서를 빠르게 만들 수 있게 돕는 서비스입니다. " +
  "프로젝트 이름, 유형, 일정, 팀원 초대 정보를 바탕으로 AI가 개발 가능한 초안을 생성하고 사용자는 이를 검토해 바로 작업에 들어갑니다. " +
  "학생 팀과 주니어 개발자가 초기 기획 문서를 빠르게 만들고 반복 수정할 수 있도록 프로젝트 목적, 핵심 사용자, 주요 기능, 개발 범위를 함께 정리합니다.";

describe("projectCreateInputSchema", () => {
  it("accepts a valid personal project", () => {
    const result = projectCreateInputSchema.safeParse({
      name: "LAVA",
      type: "personal",
      originalIdea: longIdea,
      ideaEnhancementUsed: false,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      inviteEmails: []
    });

    expect(result.success).toBe(true);
  });

  it("rejects names longer than 24 characters", () => {
    const result = projectCreateInputSchema.safeParse({
      name: "1234567890123456789012345",
      type: "personal",
      originalIdea: longIdea,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      inviteEmails: []
    });

    expect(result.success).toBe(false);
  });

  it("rejects ideas shorter than 200 characters including spaces", () => {
    const result = projectCreateInputSchema.safeParse({
      name: "LAVA",
      type: "personal",
      originalIdea: "짧은 아이디어",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      inviteEmails: []
    });

    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = projectCreateInputSchema.safeParse({
      name: "LAVA",
      type: "personal",
      originalIdea: longIdea,
      startDate: "2026-07-01",
      endDate: "2026-06-30",
      inviteEmails: []
    });

    expect(result.success).toBe(false);
  });

  it("rejects durations longer than 365 days", () => {
    const result = projectCreateInputSchema.safeParse({
      name: "LAVA",
      type: "personal",
      originalIdea: longIdea,
      startDate: "2026-06-01",
      endDate: "2027-06-02",
      inviteEmails: []
    });

    expect(result.success).toBe(false);
  });

  it("normalizes and deduplicates invitation emails", () => {
    const result = projectCreateInputSchema.parse({
      name: "LAVA",
      type: "team",
      originalIdea: longIdea,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      inviteEmails: ["Teammate@example.com", "teammate@example.com"]
    });

    expect(result.inviteEmails).toEqual(["teammate@example.com"]);
  });

  it("rejects invalid invitation emails", () => {
    const result = projectCreateInputSchema.safeParse({
      name: "LAVA",
      type: "team",
      originalIdea: longIdea,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      inviteEmails: ["not-an-email"]
    });

    expect(result.success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("accepts a valid signup verification code", () => {
    const result = signupVerifyInputSchema.safeParse({
      email: "user@example.com",
      code: "123456"
    });

    expect(result.success).toBe(true);
  });

  it("rejects a weak password when completing signup", () => {
    const result = signupCompleteInputSchema.safeParse({
      email: "user@example.com",
      name: "사용자",
      password: "password",
      passwordConfirm: "password"
    });

    expect(result.success).toBe(false);
  });

  it("normalizes login email", () => {
    const result = loginInputSchema.parse({
      email: "USER@example.com",
      password: "Passw0rd!"
    });

    expect(result.email).toBe("user@example.com");
  });
});

describe("participationInputSchema", () => {
  it("accepts major, tech stacks, and available times", () => {
    const result = participationInputSchema.safeParse({
      major: "컴퓨터공학",
      techStacks: ["React", "NestJS"],
      availableTimes: [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
    });

    expect(result.success).toBe(true);
  });

  it("deduplicates and trims tech stacks", () => {
    const result = participationInputSchema.parse({
      major: "컴퓨터공학",
      techStacks: [" React ", "NestJS", "React"],
      availableTimes: [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
    });

    expect(result.techStacks).toEqual(["React", "NestJS"]);
  });

  it("rejects missing participation info", () => {
    const result = participationInputSchema.safeParse({
      major: "",
      techStacks: [],
      availableTimes: []
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unavailable time range", () => {
    const result = participationInputSchema.safeParse({
      major: "컴퓨터공학",
      techStacks: ["React"],
      availableTimes: [{ dayOfWeek: "mon", startTime: "21:00", endTime: "19:00" }]
    });

    expect(result.success).toBe(false);
  });
});

describe("scheduleUpdateInputSchema", () => {
  it("accepts date-only schedule items", () => {
    const result = scheduleUpdateInputSchema.safeParse({
      items: [
        {
          title: "기능 구현",
          type: "task",
          description: "핵심 기능 구현",
          assigneeUserIds: ["user-1"],
          startDate: "2026-06-01",
          endDate: "2026-06-03"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects a schedule item ending before it starts", () => {
    const result = scheduleUpdateInputSchema.safeParse({
      items: [
        {
          title: "기능 구현",
          type: "task",
          description: "핵심 기능 구현",
          assigneeUserIds: ["user-1"],
          startDate: "2026-06-03",
          endDate: "2026-06-01"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty schedule item list", () => {
    const result = scheduleUpdateInputSchema.safeParse({ items: [] });

    expect(result.success).toBe(false);
  });
});

describe("document schemas", () => {
  it("accepts a feature spec at the 2000 character limit", () => {
    const result = featureSpecContentSchema.safeParse("가".repeat(2000));

    expect(result.success).toBe(true);
  });

  it("rejects a feature spec over the 2000 character limit", () => {
    const result = featureSpecContentSchema.safeParse("가".repeat(2001));

    expect(result.success).toBe(false);
  });

  it("rejects an empty AI document edit prompt", () => {
    const result = aiDocumentEditInputSchema.safeParse({ prompt: "   " });

    expect(result.success).toBe(false);
  });

  it("rejects an AI document edit prompt over 1000 characters", () => {
    const result = aiDocumentEditInputSchema.safeParse({ prompt: "a".repeat(1001) });

    expect(result.success).toBe(false);
  });

  it("rejects an empty AI schedule edit prompt", () => {
    const result = aiScheduleEditInputSchema.safeParse({ prompt: "   " });

    expect(result.success).toBe(false);
  });

  it("rejects an AI schedule edit prompt over 1000 characters", () => {
    const result = aiScheduleEditInputSchema.safeParse({ prompt: "a".repeat(1001) });

    expect(result.success).toBe(false);
  });
});
