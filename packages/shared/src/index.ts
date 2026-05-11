import { z } from "zod";

export const FALLBACK_DOCUMENT_CONTENT =
  "AI 호출이 실패했어요 프로젝트에 대한 설명을 적어주세요";

export const PROJECT_IDEA_MIN_LENGTH = 200;
export const PROJECT_NAME_MAX_LENGTH = 24;
export const PROJECT_MAX_DURATION_DAYS = 365;

export const projectTypeSchema = z.enum(["personal", "team"]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectDocumentTypeSchema = z.enum(["feature_spec", "api_spec"]);
export type ProjectDocumentType = z.infer<typeof projectDocumentTypeSchema>;

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.");

export const inviteEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("올바른 이메일 주소를 입력해 주세요.");

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function dayDiff(startDate: string, endDate: string): number {
  const start = toUtcDate(startDate).getTime();
  const end = toUtcDate(endDate).getTime();
  return Math.floor((end - start) / 86_400_000);
}

export const projectCreateInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "프로젝트 이름을 입력해 주세요.")
      .max(PROJECT_NAME_MAX_LENGTH, "프로젝트 이름은 24자 이하로 입력해 주세요."),
    type: projectTypeSchema,
    originalIdea: z
      .string()
      .min(PROJECT_IDEA_MIN_LENGTH, "아이디어는 공백 포함 200자 이상이어야 합니다."),
    enhancedIdea: z.string().optional(),
    ideaEnhancementUsed: z.boolean().default(false),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    inviteEmails: z.array(inviteEmailSchema).default([])
  })
  .superRefine((value, ctx) => {
    const durationDays = dayDiff(value.startDate, value.endDate);

    if (durationDays < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "종료일은 시작일 이후여야 합니다."
      });
    }

    if (durationDays > PROJECT_MAX_DURATION_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "프로젝트 기간은 최대 365일까지 가능합니다."
      });
    }
  })
  .transform((value) => ({
    ...value,
    inviteEmails: Array.from(new Set(value.inviteEmails))
  }));

export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>;

export const ideaEnhanceInputSchema = z
  .object({
    name: z.string().trim().min(1).max(PROJECT_NAME_MAX_LENGTH),
    type: projectTypeSchema,
    originalIdea: z.string().min(PROJECT_IDEA_MIN_LENGTH),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema
  })
  .superRefine((value, ctx) => {
    const durationDays = dayDiff(value.startDate, value.endDate);

    if (durationDays < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "종료일은 시작일 이후여야 합니다."
      });
    }

    if (durationDays > PROJECT_MAX_DURATION_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "프로젝트 기간은 최대 365일까지 가능합니다."
      });
    }
  });

export type IdeaEnhanceInput = z.infer<typeof ideaEnhanceInputSchema>;

export const projectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: projectTypeSchema,
  originalIdea: z.string(),
  enhancedIdea: z.string().nullable(),
  ideaEnhancementUsed: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  inviteCount: z.number(),
  documents: z.array(
    z.object({
      id: z.string(),
      type: projectDocumentTypeSchema,
      content: z.string(),
      generatedBy: z.enum(["ai", "user"]),
      updatedAt: z.string()
    })
  )
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;
