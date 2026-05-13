import { z } from "zod";

export const FALLBACK_DOCUMENT_CONTENT =
  "AI 호출이 실패했어요 프로젝트에 대한 설명을 적어주세요";

export const PROJECT_IDEA_MIN_LENGTH = 200;
export const PROJECT_NAME_MAX_LENGTH = 24;
export const PROJECT_MAX_DURATION_DAYS = 365;
export const INVITATION_EXPIRES_DAYS = 7;
export const EMAIL_CODE_EXPIRES_MINUTES = 5;
export const EMAIL_VERIFY_MAX_ATTEMPTS = 5;
export const FEATURE_SPEC_MAX_LENGTH = 2000;

export const projectTypeSchema = z.enum(["personal", "team"]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectDocumentTypeSchema = z.enum(["feature_spec", "api_spec"]);
export type ProjectDocumentType = z.infer<typeof projectDocumentTypeSchema>;

export const memberRoleSchema = z.enum(["leader", "member"]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const memberStatusSchema = z.enum(["pending", "accepted", "rejected", "left"]);
export type MemberStatus = z.infer<typeof memberStatusSchema>;

export const invitationStatusSchema = z.enum(["pending", "accepted", "rejected", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const generatedBySchema = z.enum(["ai", "user"]);
export type GeneratedBy = z.infer<typeof generatedBySchema>;

export const scheduleItemTypeSchema = z.enum(["task", "sprint", "meeting"]);
export type ScheduleItemType = z.infer<typeof scheduleItemTypeSchema>;

export const authEmailInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일 주소를 입력해 주세요.")
});
export type AuthEmailInput = z.infer<typeof authEmailInputSchema>;

export const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "인증 코드는 6자리 숫자여야 합니다.");

export const signupVerifyInputSchema = authEmailInputSchema.extend({
  code: verificationCodeSchema
});
export type SignupVerifyInput = z.infer<typeof signupVerifyInputSchema>;

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .regex(/[a-z]/, "비밀번호에는 소문자가 1개 이상 필요합니다.")
  .regex(/[A-Z]/, "비밀번호에는 대문자가 1개 이상 필요합니다.")
  .regex(/[0-9]/, "비밀번호에는 숫자가 1개 이상 필요합니다.")
  .regex(/[^A-Za-z0-9]/, "비밀번호에는 특수문자가 1개 이상 필요합니다.");

export const signupCompleteInputSchema = authEmailInputSchema
  .extend({
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40, "이름은 40자 이하로 입력해 주세요."),
    password: passwordSchema,
    passwordConfirm: z.string()
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "비밀번호 확인 값이 일치하지 않습니다."
      });
    }
  });
export type SignupCompleteInput = z.infer<typeof signupCompleteInputSchema>;

export const loginInputSchema = authEmailInputSchema.extend({
  password: z.string().min(1, "비밀번호를 입력해 주세요.")
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string()
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.");

export const timeOnlySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시간은 HH:mm 형식이어야 합니다.");

export const dayOfWeekSchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const availableTimeSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: timeOnlySchema,
    endTime: timeOnlySchema
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "종료 시간은 시작 시간 이후여야 합니다."
      });
    }
  });
export type AvailableTime = z.infer<typeof availableTimeSchema>;

export const participationInputSchema = z.object({
  major: z.string().trim().min(1, "전공을 입력해 주세요.").max(80, "전공은 80자 이하로 입력해 주세요."),
  techStacks: z
    .array(z.string().trim().min(1))
    .min(1, "기술 스택을 1개 이상 입력해 주세요.")
    .transform((value) => Array.from(new Set(value.map((item) => item.trim()).filter(Boolean))))
    .pipe(z.array(z.string()).min(1, "기술 스택을 1개 이상 입력해 주세요.")),
  availableTimes: z.array(availableTimeSchema).min(1, "참여 가능 시간을 1개 이상 입력해 주세요.")
});
export type ParticipationInput = z.infer<typeof participationInputSchema>;

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

function validateDateRange(
  value: { startDate: string; endDate: string },
  ctx: z.RefinementCtx,
  options: { maxDays?: number } = {}
) {
  const durationDays = dayDiff(value.startDate, value.endDate);

  if (durationDays < 0) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "종료일은 시작일 이후여야 합니다."
    });
  }

  if (options.maxDays && durationDays > options.maxDays) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: `프로젝트 기간은 최대 ${options.maxDays}일까지 가능합니다.`
    });
  }
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
  .superRefine((value, ctx) => validateDateRange(value, ctx, { maxDays: PROJECT_MAX_DURATION_DAYS }))
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
  .superRefine((value, ctx) => validateDateRange(value, ctx, { maxDays: PROJECT_MAX_DURATION_DAYS }));

export type IdeaEnhanceInput = z.infer<typeof ideaEnhanceInputSchema>;

export const projectDocumentSummarySchema = z.object({
  id: z.string(),
  type: projectDocumentTypeSchema,
  content: z.string(),
  generatedBy: generatedBySchema,
  updatedAt: z.string()
});
export type ProjectDocumentSummary = z.infer<typeof projectDocumentSummarySchema>;

export const featureSpecContentSchema = z
  .string()
  .max(FEATURE_SPEC_MAX_LENGTH, "기능 명세서는 2000자 이하로 저장해야 합니다.");

export const documentUpdateInputSchema = z.object({
  content: z.string()
});
export type DocumentUpdateInput = z.infer<typeof documentUpdateInputSchema>;

export const aiDocumentEditInputSchema = z.object({
  prompt: z.string().trim().min(1, "수정 요청을 입력해 주세요.").max(1000, "수정 요청은 1000자 이하로 입력해 주세요.")
});
export type AiDocumentEditInput = z.infer<typeof aiDocumentEditInputSchema>;

export const projectMemberSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: memberRoleSchema,
  status: memberStatusSchema,
  major: z.string().nullable(),
  techStacks: z.array(z.string()),
  availableTimes: z.array(availableTimeSchema),
  joinedAt: z.string().nullable()
});
export type ProjectMemberSummary = z.infer<typeof projectMemberSummarySchema>;

export const invitationSummarySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  status: invitationStatusSchema,
  sentAt: z.string(),
  expiresAt: z.string()
});
export type InvitationSummary = z.infer<typeof invitationSummarySchema>;

export const invitationDetailSchema = invitationSummarySchema.extend({
  projectId: z.string(),
  projectName: z.string()
});
export type InvitationDetail = z.infer<typeof invitationDetailSchema>;

const scheduleItemBaseSchema = z.object({
  title: z.string().trim().min(1, "일정 제목을 입력해 주세요.").max(120, "일정 제목은 120자 이하로 입력해 주세요."),
  type: scheduleItemTypeSchema,
  description: z.string().trim().default(""),
  assigneeUserIds: z.array(z.string().min(1)).default([]),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema
});

export const scheduleItemInputSchema = scheduleItemBaseSchema
  .extend({
    id: z.string().optional()
  })
  .superRefine((value, ctx) => validateDateRange(value, ctx));
export type ScheduleItemInput = z.infer<typeof scheduleItemInputSchema>;

export const scheduleUpdateInputSchema = z.object({
  items: z.array(scheduleItemInputSchema).min(1, "일정 항목을 1개 이상 입력해 주세요.")
});
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateInputSchema>;

export const aiScheduleEditInputSchema = z.object({
  prompt: z.string().trim().min(1, "수정 요청을 입력해 주세요.").max(1000, "수정 요청은 1000자 이하로 입력해 주세요.")
});
export type AiScheduleEditInput = z.infer<typeof aiScheduleEditInputSchema>;

export const scheduleItemSummarySchema = scheduleItemBaseSchema.extend({
  id: z.string()
});
export type ScheduleItemSummary = z.infer<typeof scheduleItemSummarySchema>;

export const projectScheduleSummarySchema = z.object({
  id: z.string(),
  generatedBy: generatedBySchema,
  updatedAt: z.string(),
  items: z.array(scheduleItemSummarySchema)
});
export type ProjectScheduleSummary = z.infer<typeof projectScheduleSummarySchema>;

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
  currentUserId: z.string(),
  currentUserRole: memberRoleSchema.nullable(),
  documents: z.array(projectDocumentSummarySchema),
  members: z.array(projectMemberSummarySchema),
  invitations: z.array(invitationSummarySchema),
  schedule: projectScheduleSummarySchema.nullable()
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;
