import { Body, Controller, Post, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { ideaEnhanceInputSchema, type IdeaEnhanceInput } from "@lava/shared";
import { CurrentUserParam } from "../common/current-user.decorator";
import type { CurrentUser } from "../common/current-user";
import { DevAuthGuard } from "../common/dev-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(DevAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("ideas/enhance")
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
