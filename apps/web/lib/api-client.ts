import type {
  AiDocumentEditInput,
  AiScheduleEditInput,
  AuthEmailInput,
  AuthUser,
  DocumentUpdateInput,
  IdeaEnhanceInput,
  InvitationDetail,
  InvitationSummary,
  ProjectDocumentSummary,
  ProjectDocumentType,
  LoginInput,
  PasswordChangeCompleteInput,
  PasswordChangeVerifyInput,
  ParticipationInput,
  ProjectCalendarItem,
  ProjectCreateInput,
  ProjectLeaveInput,
  ProjectListItem,
  ProjectScheduleSummary,
  ProjectSummary,
  ScheduleUpdateInput,
  SignupCompleteInput,
  SignupVerifyInput
} from "@lava/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...init.headers
      }
    });
  } catch (err) {
    console.error(
      `[LAVA API Client Error] API 서버(URL: ${API_BASE_URL}) 연결에 실패했습니다.\n` +
      `- apps/api 서버가 정상 구동 중인지 확인해 주세요.\n` +
      `- 로컬 환경 변수 NEXT_PUBLIC_API_BASE_URL 설정을 체크해 주세요.`,
      err
    );
    throw new Error("서버와의 연결이 일시적으로 원활하지 않습니다. 인터넷 연결 상태를 확인하시거나 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    let message = response.status === 401 ? "로그인이 필요합니다." : "요청 처리에 실패했어요.";
    try {
      const body = await response.json();
      message = body.issues?.[0]?.message || body.message || body.error || message;
    } catch {
      // Keep the generic fallback.
    }
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  sendSignupEmail(input: AuthEmailInput) {
    return requestJson<{ sent: boolean; expiresAt: string }>("/auth/signup/email", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  verifySignupCode(input: SignupVerifyInput) {
    return requestJson<{ verified: boolean }>("/auth/signup/verify", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  completeSignup(input: SignupCompleteInput) {
    return requestJson<{ user: AuthUser }>("/auth/signup/complete", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  login(input: LoginInput) {
    return requestJson<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  me() {
    return requestJson<{ user: AuthUser }>("/auth/me", {
      method: "GET",
      cache: "no-store"
    });
  },
  logout() {
    return requestJson<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  sendPasswordChangeEmail() {
    return requestJson<{ sent: boolean; expiresAt: string }>("/auth/password-change/email", {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  verifyPasswordChangeCode(input: PasswordChangeVerifyInput) {
    return requestJson<{ verified: boolean }>("/auth/password-change/verify", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  completePasswordChange(input: PasswordChangeCompleteInput) {
    return requestJson<{ changed: boolean }>("/auth/password-change/complete", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  enhanceIdea(input: IdeaEnhanceInput) {
    return requestJson<{ enhancedIdea: string }>("/ai/ideas/enhance", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  createProject(input: ProjectCreateInput) {
    return requestJson<ProjectSummary>("/projects", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  listProjects() {
    return requestJson<{ projects: ProjectListItem[] }>("/projects", {
      method: "GET",
      cache: "no-store"
    });
  },
  getCalendarItems() {
    return requestJson<{ items: ProjectCalendarItem[] }>("/projects/calendar-items", {
      method: "GET",
      cache: "no-store"
    });
  },
  getProject(id: string) {
    return requestJson<ProjectSummary>(`/projects/${id}`, {
      method: "GET",
      cache: "no-store"
    });
  },
  deleteProject(id: string) {
    return requestJson<{ deleted: true }>(`/projects/${id}`, {
      method: "DELETE"
    });
  },
  leaveProject(id: string, input: ProjectLeaveInput) {
    return requestJson<{ left: true; newLeaderUserId?: string }>(`/projects/${id}/leave`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getProjectDocument(id: string, type: ProjectDocumentType) {
    return requestJson<ProjectDocumentSummary>(`/projects/${id}/documents/${type}`, {
      method: "GET",
      cache: "no-store"
    });
  },
  updateProjectDocument(id: string, type: ProjectDocumentType, input: DocumentUpdateInput) {
    return requestJson<ProjectDocumentSummary>(`/projects/${id}/documents/${type}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  editProjectDocumentWithAi(id: string, type: ProjectDocumentType, input: AiDocumentEditInput) {
    return requestJson<ProjectDocumentSummary>(`/projects/${id}/documents/${type}/ai-edit`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getInvitation(token: string) {
    return requestJson<InvitationDetail>(`/invitations/${token}`, {
      method: "GET",
      cache: "no-store"
    });
  },
  acceptInvitation(token: string, input: ParticipationInput) {
    return requestJson<ProjectSummary>(`/invitations/${token}/accept`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  rejectInvitation(token: string) {
    return requestJson<InvitationDetail>(`/invitations/${token}/reject`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  getProjectInvitations(id: string) {
    return requestJson<{ invitations: InvitationSummary[] }>(`/projects/${id}/invitations`, {
      method: "GET",
      cache: "no-store"
    });
  },
  updateMyParticipation(id: string, input: ParticipationInput) {
    return requestJson<ProjectSummary>(`/projects/${id}/members/me/participation`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  generateSchedule(id: string) {
    return requestJson<ProjectScheduleSummary>(`/projects/${id}/schedule/generate`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  getSchedule(id: string) {
    return requestJson<ProjectScheduleSummary | null>(`/projects/${id}/schedule`, {
      method: "GET",
      cache: "no-store"
    });
  },
  updateSchedule(id: string, input: ScheduleUpdateInput) {
    return requestJson<ProjectScheduleSummary>(`/projects/${id}/schedule`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  editScheduleWithAi(id: string, input: AiScheduleEditInput) {
    return requestJson<ProjectScheduleSummary>(`/projects/${id}/schedule/ai-edit`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
