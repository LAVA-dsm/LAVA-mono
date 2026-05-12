import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import {
  FALLBACK_DOCUMENT_CONTENT,
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

@Injectable()
export class AiService {
  private readonly model = process.env.OPENAI_MODEL || "gpt-5-mini";

  private get client(): OpenAI {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
      timeout: 10_000
    });
  }

  async enhanceIdea(input: IdeaEnhanceInput, requestedByUserId: string): Promise<string> {
    const prompt = [
      "사용자가 입력한 프로젝트 아이디어를 한국어 프로젝트 개요로 구체화하세요.",
      "반드시 다음 항목을 포함하세요: 프로젝트 목적, 핵심 사용자, 주요 기능, 차별점, 예상 개발 범위.",
      `요청 사용자 ID: ${requestedByUserId}`,
      `프로젝트 이름: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `기간: ${input.startDate} ~ ${input.endDate}`,
      `원본 아이디어:\n${input.originalIdea}`
    ].join("\n\n");

    return this.generateText(prompt);
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
      "다음 프로젝트와 팀원 정보를 바탕으로 프로젝트 일정을 생성하세요.",
      "응답은 설명 없이 JSON 객체만 반환하세요.",
      "JSON 형식: {\"items\":[{\"title\":\"...\",\"type\":\"task|sprint|meeting\",\"description\":\"...\",\"assigneeUserIds\":[\"user-id\"],\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\"}]}",
      "모든 일정은 날짜 단위이며 프로젝트 시작일과 종료일 사이여야 합니다.",
      "역할 분담, 스프린트 단위 작업 구성, 회의 일정을 포함하세요.",
      "회의 시간이 충분히 겹치지 않으면 리더 가능 시간을 기준으로 가장 겹치는 날에 배정하세요.",
      `프로젝트:\n${JSON.stringify(input.project, null, 2)}`,
      `멤버:\n${JSON.stringify(input.members, null, 2)}`,
      `기능 명세서:\n${input.featureSpec}`
    ].join("\n\n");

    return this.generateScheduleItems(prompt);
  }

  async editSchedule(input: AiScheduleEditInput): Promise<ScheduleItemInput[]> {
    const prompt = [
      "다음 기존 프로젝트 일정을 사용자 요청에 맞게 수정하세요.",
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

  private async generateFeatureSpec(input: ProjectCreateInput): Promise<string> {
    const idea = input.enhancedIdea || input.originalIdea;
    const prompt = [
      "다음 프로젝트 정보를 바탕으로 기능 명세서 초안을 한국어 Markdown으로 작성하세요.",
      "각 기능은 기능명, 설명, 제약사항, 예외 처리를 포함해야 합니다.",
      "저장 본문 기준 2000자 이하로 간결하게 작성하세요.",
      `프로젝트 이름: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `기간: ${input.startDate} ~ ${input.endDate}`,
      `초대 이메일: ${input.inviteEmails.join(", ") || "없음"}`,
      `아이디어:\n${idea}`
    ].join("\n\n");

    return this.generateText(prompt);
  }

  private async generateApiSpec(input: ProjectCreateInput, featureSpec: string): Promise<string> {
    const prompt = [
      "다음 프로젝트 정보와 기능 명세서를 바탕으로 API 명세서 초안을 한국어 Markdown으로 작성하세요.",
      "각 API는 API 이름, HTTP 메서드, 경로, 요청 데이터, 응답 데이터, 주요 오류 케이스를 포함하세요.",
      "담당자는 배정하지 마세요.",
      `프로젝트 이름: ${input.name}`,
      `프로젝트 유형: ${input.type}`,
      `원본 아이디어:\n${input.originalIdea}`,
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
