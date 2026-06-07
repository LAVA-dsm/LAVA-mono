import { Body, Controller, Post, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { ideaEnhanceInputSchema, type IdeaEnhanceInput } from "@lava/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUserParam } from "../common/current-user.decorator";
import type { CurrentUser } from "../common/current-user";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("ideas/enhance")
  @ApiOperation({ summary: "AI 아이디어 증강 및 구체화", description: "입력된 아이디어 원본과 메타데이터를 사용하여 상세화된 5개 영역의 프로젝트 개요를 생성합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "type", "originalIdea", "startDate", "endDate"],
      properties: {
        name: { type: "string", description: "프로젝트 이름" },
        type: { type: "string", enum: ["personal", "team"], description: "프로젝트 유형" },
        originalIdea: { type: "string", description: "원본 아이디어" },
        startDate: { type: "string", format: "date", description: "프로젝트 시작일" },
        endDate: { type: "string", format: "date", description: "프로젝트 종료일" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "아이디어 증강 완료 및 구체화 텍스트 반환" })
  @ApiResponse({ status: 503, description: "AI 서비스 장애 혹은 호출 실패" })
  async enhanceIdea(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(ideaEnhanceInputSchema)) body: IdeaEnhanceInput
  ) {
    try {
      const enhancedIdea = await this.aiService.enhanceIdea(body, user.id);
      return { enhancedIdea };
    } catch (error) {
      throw new ServiceUnavailableException({
        message: "AI 아이디어 증강에 실패했어요.",
        detail: error instanceof Error ? error.message : "unknown"
      });
    }
  }
}
