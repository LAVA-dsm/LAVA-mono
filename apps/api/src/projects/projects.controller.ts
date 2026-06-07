import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from "@nestjs/swagger";
import {
  aiDocumentEditInputSchema,
  aiScheduleEditInputSchema,
  documentUpdateInputSchema,
  participationInputSchema,
  projectCreateInputSchema,
  projectLeaveInputSchema,
  scheduleUpdateInputSchema,
  type AiDocumentEditInput,
  type AiScheduleEditInput,
  type DocumentUpdateInput,
  type ParticipationInput,
  type ProjectCreateInput,
  type ProjectLeaveInput,
  type ScheduleUpdateInput
} from "@lava/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { CurrentUser } from "../common/current-user";
import { CurrentUserParam } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: "프로젝트 생성", description: "새로운 프로젝트를 생성하고 AI를 이용한 기능/API 명세서 초안을 자동으로 구성합니다." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "type", "originalIdea", "startDate", "endDate"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 24, description: "프로젝트 이름" },
        type: { type: "string", enum: ["personal", "team"], description: "프로젝트 유형" },
        originalIdea: { type: "string", minLength: 200, description: "최초 아이디어 설명 (최소 200자)" },
        enhancedIdea: { type: "string", description: "AI 증강 완료된 아이디어 (옵션)" },
        ideaEnhancementUsed: { type: "boolean", default: false, description: "AI 아이디어 증강 사용 여부" },
        startDate: { type: "string", format: "date", description: "시작일 (YYYY-MM-DD)" },
        endDate: { type: "string", format: "date", description: "종료일 (YYYY-MM-DD)" },
        inviteEmails: { type: "array", items: { type: "string", format: "email" }, description: "초대할 팀원 이메일 리스트" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "프로젝트 생성 성공" })
  @ApiResponse({ status: 400, description: "입력값 검증 실패" })
  createProject(
    @CurrentUserParam() user: CurrentUser,
    @Body(new ZodValidationPipe(projectCreateInputSchema)) body: ProjectCreateInput
  ) {
    return this.projectsService.createProject(body, user);
  }

  @Get()
  @ApiOperation({ summary: "참여 중인 프로젝트 목록 조회", description: "현재 사용자가 참여하고 있는 프로젝트 목록을 조회합니다." })
  @ApiResponse({ status: 200, description: "프로젝트 목록 반환" })
  listProjects(@CurrentUserParam() user: CurrentUser) {
    return this.projectsService.listProjects(user);
  }

  @Get("calendar-items")
  @ApiOperation({ summary: "전체 프로젝트 일정 캘린더 조회", description: "사용자가 속한 모든 프로젝트의 일정 항목들을 캘린더 뷰 용도로 일괄 조회합니다." })
  @ApiResponse({ status: 200, description: "캘린더 일정 목록 반환" })
  getCalendarItems(@CurrentUserParam() user: CurrentUser) {
    return this.projectsService.getCalendarItems(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "프로젝트 상세 조회", description: "프로젝트 기본 정보, 멤버 정보, 문서를 상세 조회합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiResponse({ status: 200, description: "프로젝트 상세 정보 반환" })
  @ApiResponse({ status: 403, description: "프로젝트 접근 권한이 없음" })
  getProject(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.getProject(id, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "프로젝트 삭제", description: "프로젝트 리더가 프로젝트를 삭제(소프트 삭제) 처리합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiResponse({ status: 200, description: "프로젝트 삭제 완료" })
  @ApiResponse({ status: 403, description: "프로젝트 리더 권한이 없음" })
  deleteProject(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.deleteProject(id, user);
  }

  @Post(":id/leave")
  @ApiOperation({ summary: "프로젝트 탈퇴", description: "참여 중인 팀 프로젝트에서 스스로 탈퇴합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiResponse({ status: 201, description: "프로젝트 탈퇴 완료" })
  leaveProject(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(projectLeaveInputSchema)) body: ProjectLeaveInput
  ) {
    return this.projectsService.leaveProject(id, body, user);
  }

  @Get(":id/invitations")
  @ApiOperation({ summary: "프로젝트 미승인 초대 목록 조회", description: "프로젝트 관리 목적의 대기 중인 초대 내역들을 조회합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiResponse({ status: 200, description: "초대 목록 반환" })
  getProjectInvitations(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.getProjectInvitations(id, user);
  }

  @Get(":id/documents/:type")
  @ApiOperation({ summary: "프로젝트 개발 문서 조회", description: "프로젝트의 기능 명세서 또는 API 명세서를 조회합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiParam({ name: "type", type: "string", enum: ["feature_spec", "api_spec"], description: "문서 종류" })
  @ApiResponse({ status: 200, description: "문서 상세 내용 반환" })
  getProjectDocument(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Param("type") type: string
  ) {
    return this.projectsService.getProjectDocument(id, type, user);
  }

  @Put(":id/documents/:type")
  @ApiOperation({ summary: "프로젝트 개발 문서 수정", description: "프로젝트 개발 문서(기능/API 명세서)를 수동으로 수정 및 저장합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiParam({ name: "type", type: "string", enum: ["feature_spec", "api_spec"], description: "문서 종류" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["content"],
      properties: {
        content: { type: "string", description: "수정할 마크다운 본문 (기능 명세서는 최대 2000자)" }
      }
    }
  })
  @ApiResponse({ status: 200, description: "문서 수정 성공" })
  updateProjectDocument(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Param("type") type: string,
    @Body(new ZodValidationPipe(documentUpdateInputSchema)) body: DocumentUpdateInput
  ) {
    return this.projectsService.updateProjectDocument(id, type, body, user);
  }

  @Post(":id/documents/:type/ai-edit")
  @ApiOperation({ summary: "AI를 이용한 개발 문서 수정", description: "자연어 요청을 기반으로 기존 명세서를 AI가 자동 수정하도록 요청합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiParam({ name: "type", type: "string", enum: ["feature_spec", "api_spec"], description: "문서 종류" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", minLength: 1, maxLength: 1000, description: "AI에게 보낼 자연어 수정 요청 (예: 로그인 실패 처리를 추가해줘)" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "AI 문서 수정 완료 및 반환" })
  editProjectDocumentWithAi(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Param("type") type: string,
    @Body(new ZodValidationPipe(aiDocumentEditInputSchema)) body: AiDocumentEditInput
  ) {
    return this.projectsService.editProjectDocumentWithAi(id, type, body.prompt, user);
  }

  @Patch(":id/members/me/participation")
  @ApiOperation({ summary: "본인의 참여 정보 수정", description: "프로젝트 일정 배정에 활용될 본인의 전공, 기술 스택, 가용 시간(요일/시간대) 정보를 설정합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["major", "techStacks", "availableTimes"],
      properties: {
        major: { type: "string", description: "전공 분야" },
        techStacks: { type: "array", items: { type: "string" }, description: "주요 활용 가능 기술 스택" },
        availableTimes: {
          type: "array",
          items: {
            type: "object",
            required: ["dayOfWeek", "startTime", "endTime"],
            properties: {
              dayOfWeek: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], description: "요일" },
              startTime: { type: "string", description: "시작 시간 (HH:mm)" },
              endTime: { type: "string", description: "종료 시간 (HH:mm)" }
            }
          },
          description: "주간 참여 가능 가용 시간대 목록"
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: "참여 정보 업데이트 성공" })
  updateMyParticipation(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(participationInputSchema)) body: ParticipationInput
  ) {
    return this.projectsService.updateMyParticipation(id, body, user);
  }

  @Post(":id/schedule/generate")
  @ApiOperation({ summary: "AI 프로젝트 일정 생성", description: "기능 명세서와 멤버들의 가용 시간을 기반으로 최적화된 스프린트/작업 일정을 자동 생성합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiResponse({ status: 201, description: "AI 일정 생성 완료" })
  generateSchedule(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.generateSchedule(id, user);
  }

  @Get(":id/schedule")
  @ApiOperation({ summary: "프로젝트 일정 조회", description: "프로젝트 전체 일정을 상세 조회합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiResponse({ status: 200, description: "프로젝트 일정 정보 반환" })
  getSchedule(@CurrentUserParam() user: CurrentUser, @Param("id") id: string) {
    return this.projectsService.getSchedule(id, user);
  }

  @Put(":id/schedule")
  @ApiOperation({ summary: "프로젝트 일정 수동 수정", description: "프로젝트에 정의된 일정 리스트를 수동으로 수정 및 저장합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "type", "description", "assigneeUserIds", "startDate", "endDate"],
            properties: {
              id: { type: "string", description: "일정 아이템 고유 ID" },
              title: { type: "string", description: "일정 제목" },
              type: { type: "string", enum: ["task", "sprint", "meeting"], description: "일정 성격" },
              description: { type: "string", description: "일정 설명" },
              assigneeUserIds: { type: "array", items: { type: "string" }, description: "담당자 사용자 ID 목록" },
              startDate: { type: "string", format: "date", description: "시작일 (YYYY-MM-DD)" },
              endDate: { type: "string", format: "date", description: "마무리일 (YYYY-MM-DD)" }
            }
          },
          description: "새로 갱신할 전체 일정 항목 목록"
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: "일정 수정 완료" })
  updateSchedule(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(scheduleUpdateInputSchema)) body: ScheduleUpdateInput
  ) {
    return this.projectsService.updateSchedule(id, body, user);
  }

  @Post(":id/schedule/ai-edit")
  @ApiOperation({ summary: "AI를 이용한 일정 수정", description: "자연어 요청을 통해 기존에 수립된 프로젝트 일정을 AI가 변경 제안하도록 요청합니다." })
  @ApiParam({ name: "id", type: "string", description: "프로젝트 ID" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", minLength: 1, maxLength: 1000, description: "AI에게 보낼 자연어 수정 요청 (예: 회의 횟수를 줄여줘)" }
      }
    }
  })
  @ApiResponse({ status: 201, description: "AI 일정 수정 완료 및 반환" })
  editScheduleWithAi(
    @CurrentUserParam() user: CurrentUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(aiScheduleEditInputSchema)) body: AiScheduleEditInput
  ) {
    return this.projectsService.editScheduleWithAi(id, body.prompt, user);
  }
}

@ApiTags("invitations")
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(":token")
  @ApiOperation({ summary: "초대 정보 조회", description: "초대 토큰을 기반으로 어떤 프로젝트에 누가 초대되었는지 정보를 조회합니다. (로그인 불필요)" })
  @ApiParam({ name: "token", type: "string", description: "초대 토큰" })
  @ApiResponse({ status: 200, description: "초대 상세 정보 반환" })
  @ApiResponse({ status: 404, description: "유효하지 않거나 만료된 초대 토큰" })
  getInvitation(@Param("token") token: string) {
    return this.projectsService.getInvitation(token);
  }

  @Post(":token/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "초대 수락", description: "로그인된 사용자가 받은 초대를 수락하고 참여 정보를 등록하며 프로젝트에 참여합니다." })
  @ApiParam({ name: "token", type: "string", description: "초대 토큰" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["major", "techStacks", "availableTimes"],
      properties: {
        major: { type: "string", description: "수락자의 전공" },
        techStacks: { type: "array", items: { type: "string" }, description: "수락자의 기술 스택 리스트" },
        availableTimes: {
          type: "array",
          items: {
            type: "object",
            required: ["dayOfWeek", "startTime", "endTime"],
            properties: {
              dayOfWeek: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], description: "요일" },
              startTime: { type: "string", description: "시작 시간 (HH:mm)" },
              endTime: { type: "string", description: "종료 시간 (HH:mm)" }
            }
          },
          description: "수락자의 참여 가용한 주간 시간 정보"
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: "초대 수락 및 멤버 추가 성공" })
  acceptInvitation(
    @CurrentUserParam() user: CurrentUser,
    @Param("token") token: string,
    @Body(new ZodValidationPipe(participationInputSchema)) body: ParticipationInput
  ) {
    return this.projectsService.acceptInvitation(token, body, user);
  }

  @Post(":token/reject")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "초대 거절", description: "로그인된 사용자가 수신된 프로젝트 초대를 거절 처리합니다." })
  @ApiParam({ name: "token", type: "string", description: "초대 토큰" })
  @ApiResponse({ status: 201, description: "초대 거절 성공" })
  rejectInvitation(@CurrentUserParam() user: CurrentUser, @Param("token") token: string) {
    return this.projectsService.rejectInvitation(token, user);
  }
}
