import { Injectable } from "@nestjs/common";
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

@Injectable()
export class AiService {
  private readonly model = process.env.OPENAI_MODEL || "gpt-5-mini";
  private readonly timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 60_000);

  private get client(): OpenAI {
    const baseURL = process.env.OPENAI_BASE_URL?.trim();

    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(baseURL ? { baseURL } : {}),
      maxRetries: 0,
      timeout: this.timeoutMs
    });
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
      "응답에는 마크다운 헤더와 각 항목의 구체적인 본문 텍스트만 포함해 주세요.",
      "요청자, 프로젝트명, 프로젝트 유형, 기간 같은 메타데이터는 문서 상단에 작성하지 마세요.",
      "이후 행동 추천, 추가 질문, 다음 단계 안내 등의 인사말이나 설명 문구는 일체 배제하세요.",
      `프로젝트명: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `기간: ${input.startDate} ~ ${input.endDate}`,
      `원본 아이디어:\n${input.originalIdea}`
    ].join("\n\n");

    const text = await this.generateText(prompt);
    return text;
  }
  async generateInitialDocuments(input: ProjectCreateInput): Promise<GeneratedDocuments> {
    let featureSpec = FALLBACK_DOCUMENT_CONTENT;
    let apiSpec = FALLBACK_DOCUMENT_CONTENT;
    let featureSpecFailed = false;
    let apiSpecFailed = false;

    try {
      featureSpec = await this.generateFeatureSpec(input);
      featureSpec = featureSpec.slice(0, 2000);
    } catch {
      featureSpecFailed = true;
    }

    try {
      apiSpec = await this.generateApiSpec(input, featureSpec);
    } catch {
      apiSpecFailed = true;
    }

    return {
      featureSpec,
      apiSpec,
      featureSpecFailed,
      apiSpecFailed
    };
  }

  async generateSchedule(input: AiScheduleGenerateInput): Promise<ScheduleItemInput[]> {
    const prompt = [
      "아래 프로젝트와 멤버 정보를 바탕으로 프로젝트 일정을 생성하세요.",
      "응답은 설명 없이 JSON 객체만 반환하세요.",
      "JSON 형식: {\"items\":[{\"title\":\"...\",\"type\":\"task|sprint|meeting\",\"description\":\"...\",\"assigneeUserIds\":[\"user-id\"],\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\"}]}",
      "모든 일정은 날짜 단위이며 프로젝트 시작일과 종료일 사이여야 합니다.",
      "개별 작업, 스프린트, 회의를 균형 있게 포함하세요.",
      "회의 시간은 멤버들의 가용 시간을 최대한 반영하고, 불분명하면 리더가 가능한 시간으로 배정하세요.",
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `멤버:\n${JSON.stringify(input.members, null, 2)}`,
      `기능 명세서:\n${input.featureSpec}`
    ].join("\n\n");

    return this.generateScheduleItems(prompt);
  }

  async editSchedule(input: AiScheduleEditInput): Promise<ScheduleItemInput[]> {
    const prompt = [
      "아래 기존 프로젝트 일정을 사용자의 요청에 맞게 수정하세요.",
      "응답은 설명 없이 JSON 객체만 반환하세요.",
      "JSON 형식: {\"items\":[{\"title\":\"...\",\"type\":\"task|sprint|meeting\",\"description\":\"...\",\"assigneeUserIds\":[\"user-id\"],\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\"}]}",
      "모든 일정은 날짜 단위이며 프로젝트 시작일과 종료일 사이여야 합니다.",
      `사용자 요청:\n${input.prompt}`,
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `멤버:\n${JSON.stringify(input.members, null, 2)}`,
      `현재 일정:\n${JSON.stringify(input.currentSchedule.items, null, 2)}`
    ].join("\n\n");

    return this.generateScheduleItems(prompt);
  }

  async editFeatureSpec(input: AiFeatureSpecEditInput): Promise<string> {
    const prompt = [
      "아래 기능 명세서를 사용자의 요청에 맞게 수정하세요.",
      "응답은 설명 없이 수정된 Markdown 본문만 반환하세요.",
      "각 기능은 기능명, 설명, 예외 처리, 확인 조건을 포함해야 합니다.",
      `수정할 본문은 2000자 이하여야 합니다.`,
      `사용자 요청:\n${input.prompt}`,
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `현재 기능 명세서:\n${input.currentFeatureSpec}`
    ].join("\n\n");

    return this.generateText(prompt);
  }

  async editApiSpec(input: AiApiSpecEditInput): Promise<string> {
    const prompt = [
      "아래 API 명세서를 사용자의 요청에 맞게 수정하세요.",
      "응답은 설명 없이 수정된 Markdown 본문만 반환하세요.",
      "각 API는 이름, 메서드, 경로, 요청 데이터, 응답 데이터, 주요 예외를 포함해야 합니다.",
      `사용자 요청:\n${input.prompt}`,
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `현재 API 명세서:\n${input.currentApiSpec}`,
      `기능 명세서:\n${input.featureSpec || "없음"}`
    ].join("\n\n");

    return this.generateText(prompt);
  }

  private async generateFeatureSpec(input: ProjectCreateInput): Promise<string> {
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

    return this.generateText(prompt);
  }

  private async generateApiSpec(input: ProjectCreateInput, featureSpec: string): Promise<string> {
    const idea = input.enhancedIdea || input.originalIdea;
    const prompt = [
      "아래 프로젝트를 위한 API 명세서를 Markdown으로 작성하세요.",
      "응답은 설명 없이 본문만 반환하세요.",
      "구성은 다음 5개 섹션만 사용하세요: 인증, 프로젝트, 초대, 문서, 일정.",
      "각 섹션에는 필요한 API만 1~3개씩 적으세요.",
      "각 API에는 이름, 메서드, 경로, 요청, 응답, 예외만 간결하게 적으세요.",
      "전체 분량은 기능 명세서보다 짧고, 불필요한 설명은 넣지 마세요.",
      `프로젝트명: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `아이디어:\n${idea}`,
      `기능 명세서:\n${featureSpec}`
    ].join("\n\n");

    return this.generateText(prompt);
  }

  private async generateScheduleItems(prompt: string): Promise<ScheduleItemInput[]> {
    const text = await this.generateText(prompt);
    const jsonText = this.extractJson(text);
    const parsed = scheduleUpdateInputSchema.parse(JSON.parse(jsonText));
    return parsed.items;
  }

  private extractJson(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return fenced?.[1]?.trim() || trimmed;
  }

  private async generateText(prompt: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const response = await this.client.responses.create({
      model: this.model,
      input: prompt
    });

    const text = response.output_text?.trim();

    if (!text) {
      throw new Error("OpenAI response did not contain text.");
    }

    return text;
  }

}


