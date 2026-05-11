import { describe, expect, it } from "vitest";
import { projectCreateInputSchema } from "./index";

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
