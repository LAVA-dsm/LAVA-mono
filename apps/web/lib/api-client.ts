import type { IdeaEnhanceInput, ProjectCreateInput, ProjectSummary } from "@lava/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const DEV_USER_ID = "dev-leader";

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": DEV_USER_ID,
        ...init.headers
      }
    });
  } catch {
    throw new Error("API 서버에 연결할 수 없어요. apps/api 서버와 NEXT_PUBLIC_API_BASE_URL을 확인해 주세요.");
  }

  if (!response.ok) {
    let message = "요청 처리에 실패했어요.";
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
  getProject(id: string) {
    return requestJson<ProjectSummary>(`/projects/${id}`, {
      method: "GET",
      cache: "no-store"
    });
  }
};
