import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import {
  FALLBACK_DOCUMENT_CONTENT,
  FEATURE_SPEC_MAX_LENGTH,
  scheduleUpdateInputSchema,
  type AvailableTime,
  type IdeaEnhanceInput,
  type MemberRole,
  type ProjectCreateInput,
  type ProjectScheduleSummary,
  type ProjectType,
  type ScheduleItemInput
} from "@lava/shared";

export type GeneratedDocuments = {
  featureSpec: string;
  apiSpec: string;
  featureSpecFailed: boolean;
  apiSpecFailed: boolean;
};

export type AiScheduleProjectContext = {
  id: string;
  name: string;
  type: ProjectType;
  idea: string;
  startDate: string;
  endDate: string;
};

export type AiScheduleMemberContext = {
  userId: string;
  name: string;
  role: MemberRole;
  major: string;
  techStacks: string[];
  availableTimes: AvailableTime[];
};

export type AiScheduleGenerateInput = {
  project: AiScheduleProjectContext;
  members: AiScheduleMemberContext[];
  featureSpec: string;
};

export type AiScheduleEditInput = {
  project: AiScheduleProjectContext;
  members: AiScheduleMemberContext[];
  currentSchedule: ProjectScheduleSummary;
  prompt: string;
};

export type AiDocumentProjectContext = AiScheduleProjectContext;

export type AiFeatureSpecEditInput = {
  project: AiDocumentProjectContext;
  currentFeatureSpec: string;
  prompt: string;
};

export type AiApiSpecEditInput = {
  project: AiDocumentProjectContext;
  currentApiSpec: string;
  featureSpec?: string;
  prompt: string;
};

type AiCallContext = { op: string; userId?: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model = process.env.OPENAI_MODEL || "gpt-5-mini";
  private readonly timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 60_000);
  // gpt-5 계열 reasoning 모델은 기본 effort가 높아 느리고, reasoning 토큰이
  // 출력 예산을 다 소모하면 output_text가 비어 503을 유발한다.
  // effort를 낮추고 출력 토큰 한도를 넉넉히 확보해 양쪽 문제를 함께 막는다.
  private readonly reasoningEffort = (process.env.OPENAI_REASONING_EFFORT || "minimal").trim();
  private readonly maxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 8000);
  private readonly maxRetries = Number(process.env.OPENAI_MAX_RETRIES || 2);

  private get client(): OpenAI {
    const baseURL = process.env.OPENAI_BASE_URL?.trim();

    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(baseURL ? { baseURL } : {}),
      maxRetries: this.maxRetries,
      timeout: this.timeoutMs
    });
  }

  /** gpt-5 / o 시리즈 등 reasoning 파라미터를 지원하는 모델인지 판별 */
  private supportsReasoning(): boolean {
    const m = this.model.toLowerCase();
    return m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4");
  }

  async enhanceIdea(input: IdeaEnhanceInput, requestedByUserId: string): Promise<string> {
    const prompt = [
      "사용자가 입력한 아이디어를 구체화하여 완성도 높은 프로젝트 개요를 작성해 주세요.",
      "반드시 다음 5가지 항목을 마크다운 헤더(##)를 사용하여 구조화된 형태로 응답하세요.",
      "1. ## 프로젝트 목적",
      "2. ## 핵심 사용자",
      "3. ## 주요 기능",
      "4. ## 차별점",
      "5. ## 예상 개발 범위",
      "중요 제약 조건: 각 항목의 본문은 불필요한 서론이나 미사여구를 모두 배제하고, 핵심 위주로 2~3줄(150자 내외)로 아주 간결하게 요약하여 작성하세요. 전체 응답의 총 길이는 공백 포함 800자 이하여야 합니다.",
      "응답에는 마크다운 헤더와 각 항목의 구체적인 본문 텍스트만 포함해 주세요.",
      "요청자, 프로젝트명, 프로젝트 유형, 기간 같은 메타데이터는 문서 상단에 작성하지 마세요.",
      "이후 행동 추천, 추가 질문, 다음 단계 안내 등의 인사말이나 설명 문구는 일체 배제하세요.",
      `프로젝트명: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `기간: ${input.startDate} ~ ${input.endDate}`,
      `원본 아이디어:\n${input.originalIdea}`
    ].join("\n\n");

    const text = await this.generateText(prompt, { op: "enhanceIdea", userId: requestedByUserId });
    return text;
  }
  async generateInitialDocuments(input: ProjectCreateInput, userId?: string): Promise<GeneratedDocuments> {
    let featureSpec = FALLBACK_DOCUMENT_CONTENT;
    let apiSpec = FALLBACK_DOCUMENT_CONTENT;
    let featureSpecFailed = false;
    let apiSpecFailed = false;

    const [featureSpecResult, apiSpecResult] = await Promise.allSettled([
      this.generateFeatureSpec(input, userId),
      this.generateApiSpec(input, undefined, userId)
    ]);

    if (featureSpecResult.status === "fulfilled") {
      featureSpec = featureSpecResult.value.slice(0, 2000);
    } else {
      featureSpecFailed = true;
    }

    if (apiSpecResult.status === "fulfilled") {
      apiSpec = apiSpecResult.value;
    } else {
      apiSpecFailed = true;
    }

    return {
      featureSpec,
      apiSpec,
      featureSpecFailed,
      apiSpecFailed
    };
  }

  async generateSchedule(input: AiScheduleGenerateInput, userId?: string): Promise<ScheduleItemInput[]> {
    const prompt = [
      "아래 프로젝트와 멤버 정보를 바탕으로 프로젝트 일정을 생성하세요.",
      "응답은 다른 설명이나 텍스트 없이 오직 유효한 JSON 객체만 반환하세요.",
      "JSON 형식: {\"items\":[{\"title\":\"...\",\"type\":\"task|sprint|meeting\",\"description\":\"...\",\"assigneeUserIds\":[\"user-id\"],\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\"}]}",
      "중요 제약 조건:",
      "1. 모든 일정의 startDate와 endDate는 반드시 YYYY-MM-DD 형식이어야 하고, 프로젝트의 시작일과 종료일 기간 내에 속해야 합니다.",
      "2. assigneeUserIds 배열에는 반드시 제공된 멤버 목록에 있는 실제 userId 값들만 할당해야 합니다. 임의의 가상 ID나 이름을 할당해서는 절대 안 됩니다. 담당자가 불명확한 경우 빈 배열([])로 설정하세요.",
      "3. 개별 작업, 스프린트, 회의를 균형 있게 포함하세요.",
      "4. 회의 시간은 멤버들의 가용 시간을 최대한 반영하고, 불분명하면 리더가 가능한 시간으로 배정하세요.",
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `멤버:\n${JSON.stringify(input.members, null, 2)}`,
      `기능 명세서:\n${input.featureSpec}`
    ].join("\n\n");

    return this.generateScheduleItems(prompt, { op: "scheduleGenerate", userId });
  }

  async editSchedule(input: AiScheduleEditInput, userId?: string): Promise<ScheduleItemInput[]> {
    const prompt = [
      "아래 기존 프로젝트 일정을 사용자의 요청에 맞게 수정하세요.",
      "응답은 다른 설명이나 텍스트 없이 오직 유효한 JSON 객체만 반환하세요.",
      "JSON 형식: {\"items\":[{\"title\":\"...\",\"type\":\"task|sprint|meeting\",\"description\":\"...\",\"assigneeUserIds\":[\"user-id\"],\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\"}]}",
      "중요 제약 조건:",
      "1. 모든 일정의 startDate와 endDate는 반드시 YYYY-MM-DD 형식이어야 하고, 프로젝트의 시작일과 종료일 기간 내에 속해야 합니다.",
      "2. assigneeUserIds 배열에는 반드시 제공된 멤버 목록에 있는 실제 userId 값들만 할당해야 합니다. 임의의 가상 ID나 이름을 할당해서는 절대 안 됩니다. 담당자가 불명확한 경우 빈 배열([])로 설정하세요.",
      `사용자 요청:\n${input.prompt}`,
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `멤버:\n${JSON.stringify(input.members, null, 2)}`,
      `현재 일정:\n${JSON.stringify(input.currentSchedule.items, null, 2)}`
    ].join("\n\n");

    return this.generateScheduleItems(prompt, { op: "scheduleEdit", userId });
  }

  async editFeatureSpec(input: AiFeatureSpecEditInput, userId?: string): Promise<string> {
    const prompt = [
      "아래 기능 명세서를 사용자의 요청에 맞게 수정하세요.",
      "응답은 설명 없이 수정된 Markdown 본문만 반환하세요.",
      "각 기능은 기능명, 설명, 예외 처리, 확인 조건을 포함해야 합니다.",
      `수정할 본문은 2000자 이하여야 합니다.`,
      `사용자 요청:\n${input.prompt}`,
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `현재 기능 명세서:\n${input.currentFeatureSpec}`
    ].join("\n\n");

    return this.generateText(prompt, { op: "editFeatureSpec", userId });
  }

  async editApiSpec(input: AiApiSpecEditInput, userId?: string): Promise<string> {
    const prompt = [
      "아래 API 명세서를 사용자의 요청에 맞게 수정하세요.",
      "응답은 설명 없이 수정된 Markdown 본문만 반환하세요.",
      "각 API는 이름, 메서드, 경로, 요청 데이터, 응답 데이터, 주요 예외를 포함해야 합니다.",
      `사용자 요청:\n${input.prompt}`,
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `현재 API 명세서:\n${input.currentApiSpec}`,
      `기능 명세서:\n${input.featureSpec || "없음"}`
    ].join("\n\n");

    return this.generateText(prompt, { op: "editApiSpec", userId });
  }

  private async generateFeatureSpec(input: ProjectCreateInput, userId?: string): Promise<string> {
    const idea = input.enhancedIdea || input.originalIdea;
    const prompt = [
      "아래 프로젝트 정보를 바탕으로 기능 명세서를 Markdown으로 작성하세요.",
      "각 기능은 기능명, 설명, 예외 처리, 확인 조건을 포함해야 합니다.",
      "전체 본문은 2000자 이하여야 합니다.",
      `프로젝트명: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `기간: ${input.startDate} ~ ${input.endDate}`,
      `초대 이메일: ${input.inviteEmails.join(", ") || "없음"}`,
      `아이디어:\n${idea}`
    ].join("\n\n");

    return this.generateText(prompt, { op: "featureSpec", userId });
  }

  private async generateApiSpec(input: ProjectCreateInput, featureSpec?: string, userId?: string): Promise<string> {
    const idea = input.enhancedIdea || input.originalIdea;
    const prompt = [
      "아래 프로젝트를 위한 API 명세서를 Markdown으로 작성하세요.",
      "응답은 설명 없이 본문만 반환하세요.",
      "구성은 다음 5개 섹션만 사용하세요: 인증, 프로젝트, 초대, 문서, 일정.",
      "각 섹션에는 필요한 API만 1~3개씩 적으세요.",
      "각 API에는 이름, 메서드, 경로, 요청, 응답, 예외만 간결하게 적으세요.",
      "전체 분량은 간결하게 작성하고, 불필요한 설명은 넣지 마세요.",
      `프로젝트명: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `아이디어:\n${idea}`,
      featureSpec ? `기능 명세서:\n${featureSpec}` : ""
    ].filter(Boolean).join("\n\n");

    return this.generateText(prompt, { op: "apiSpec", userId });
  }

  private async generateScheduleItems(prompt: string, ctx: AiCallContext): Promise<ScheduleItemInput[]> {
    const text = await this.generateText(prompt, ctx);
    const jsonText = this.extractJson(text);
    try {
      const parsed = scheduleUpdateInputSchema.parse(JSON.parse(jsonText));
      return parsed.items;
    } catch (error) {
      this.logger.error(
        `[AI:${ctx.op}] JSON 파싱/검증 실패 user=${ctx.userId ?? "-"} ` +
          `name=${error instanceof Error ? error.name : "Unknown"} ` +
          `message=${error instanceof Error ? error.message : "unknown"} ` +
          `rawTextChars=${text.length} extractedChars=${jsonText.length} ` +
          `extractedPreview=${JSON.stringify(jsonText.slice(0, 300))}`
      );
      throw error;
    }
  }

  private extractJson(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const target = fenced?.[1] ? fenced[1].trim() : trimmed;

    const firstBrace = target.indexOf("{");
    const lastBrace = target.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return target.slice(firstBrace, lastBrace + 1);
    }
    return target;
  }

  private async generateText(
    prompt: string,
    ctx: AiCallContext = { op: "unknown" }
  ): Promise<string> {
    const user = ctx.userId ?? "-";

    if (!process.env.OPENAI_API_KEY) {
      this.logger.error(`[AI:${ctx.op}] OPENAI_API_KEY 미설정 user=${user}`);
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const useReasoning = this.supportsReasoning();
    const request: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: this.model,
      input: prompt,
      max_output_tokens: this.maxOutputTokens,
      ...(useReasoning
        ? { reasoning: { effort: this.reasoningEffort as "minimal" | "low" | "medium" | "high" } }
        : {})
    };

    const startedAt = Date.now();
    this.logger.log(
      `[AI:${ctx.op}] 요청 시작 user=${user} model=${this.model} promptChars=${prompt.length} ` +
        `timeoutMs=${this.timeoutMs} maxRetries=${this.maxRetries} maxOutputTokens=${this.maxOutputTokens} ` +
        `reasoningEffort=${useReasoning ? this.reasoningEffort : "-"}`
    );

    let response: OpenAI.Responses.Response;
    try {
      response = await this.client.responses.create(request);
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const err = error as { status?: number; code?: string; type?: string };
      this.logger.error(
        `[AI:${ctx.op}] OpenAI 호출 실패 user=${user} durationMs=${durationMs} ` +
          `name=${error instanceof Error ? error.name : "Unknown"} ` +
          `status=${err?.status ?? "-"} code=${err?.code ?? "-"} type=${err?.type ?? "-"} ` +
          `message=${error instanceof Error ? error.message : "unknown"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const usage = response.usage as
      | {
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
          output_tokens_details?: { reasoning_tokens?: number };
        }
      | undefined;
    const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens;
    const outputTypes = Array.isArray(response.output)
      ? response.output.map((item) => item.type).join(",")
      : "-";
    const incompleteReason = (response as { incomplete_details?: { reason?: string } })
      .incomplete_details?.reason;
    const text = response.output_text?.trim();

    this.logger.log(
      `[AI:${ctx.op}] 응답 수신 user=${user} durationMs=${durationMs} status=${response.status ?? "-"} ` +
        `inputTokens=${usage?.input_tokens ?? "-"} outputTokens=${usage?.output_tokens ?? "-"} ` +
        `reasoningTokens=${reasoningTokens ?? "-"} outputItems=[${outputTypes}] ` +
        `outputTextChars=${text?.length ?? 0}`
    );

    if (!text) {
      this.logger.error(
        `[AI:${ctx.op}] 빈 output_text (503 유발) user=${user} durationMs=${durationMs} ` +
          `status=${response.status ?? "-"} incompleteReason=${incompleteReason ?? "-"} ` +
          `reasoningTokens=${reasoningTokens ?? "-"} outputTokens=${usage?.output_tokens ?? "-"} ` +
          `outputItems=[${outputTypes}]`
      );
      throw new Error("OpenAI response did not contain text.");
    }

    return text;
  }

}


