import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDocumentSummary, ProjectDocumentType, ProjectSummary } from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { DocumentEditor } from "./document-editor";
import { ProjectDetail } from "./project-detail";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push
  })
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getProject: vi.fn(),
    getProjectDocument: vi.fn(),
    updateProjectDocument: vi.fn(),
    editProjectDocumentWithAi: vi.fn(),
    updateMyParticipation: vi.fn(),
    generateSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    editScheduleWithAi: vi.fn(),
    logout: vi.fn()
  }
}));

const featureDocument: ProjectDocumentSummary = {
  id: "document-1",
  type: "feature_spec",
  content: "# 기능 명세서",
  generatedBy: "ai",
  updatedAt: "2026-06-02T00:00:00.000Z"
};

const apiDocument: ProjectDocumentSummary = {
  id: "document-2",
  type: "api_spec",
  content: "# API 명세서",
  generatedBy: "ai",
  updatedAt: "2026-06-02T00:00:00.000Z"
};

const project: ProjectSummary = {
  id: "project-1",
  name: "LAVA",
  type: "personal",
  originalIdea: "원본 아이디어",
  enhancedIdea: null,
  ideaEnhancementUsed: false,
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  inviteCount: 0,
  currentUserId: "leader-1",
  currentUserRole: "leader",
  documents: [featureDocument, apiDocument],
  members: [
    {
      id: "member-1",
      userId: "leader-1",
      email: "leader@example.com",
      name: "리더",
      role: "leader",
      status: "accepted",
      major: null,
      techStacks: [],
      availableTimes: [],
      joinedAt: "2026-06-01T00:00:00.000Z"
    }
  ],
  invitations: [],
  schedule: null
};

const mockedApiClient = vi.mocked(apiClient);

describe("DocumentEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.getProject.mockResolvedValue(project);
    mockedApiClient.getProjectDocument.mockImplementation(async (_id: string, type: ProjectDocumentType) =>
      type === "feature_spec" ? featureDocument : apiDocument
    );
    mockedApiClient.updateProjectDocument.mockImplementation(async (_id, type, input) => ({
      id: type === "feature_spec" ? "document-1" : "document-2",
      type,
      content: input.content,
      generatedBy: "user",
      updatedAt: "2026-06-03T00:00:00.000Z"
    }));
    mockedApiClient.editProjectDocumentWithAi.mockResolvedValue({
      ...featureDocument,
      content: "# AI 수정 기능 명세서",
      generatedBy: "ai",
      updatedAt: "2026-06-04T00:00:00.000Z"
    });
  });

  it("links project document cards to the document editor", async () => {
    render(<ProjectDetail projectId="project-1" />);

    const links = await screen.findAllByRole("link", { name: /열기/ });

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/projects/project-1/documents/feature_spec",
      "/projects/project-1/documents/api_spec"
    ]);
  });

  it("saves direct document edits", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor projectId="project-1" documentType="feature_spec" />);

    const body = await screen.findByLabelText(/문서 본문/);
    fireEvent.change(body, { target: { value: "# 직접 수정한 기능 명세서" } });
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(mockedApiClient.updateProjectDocument).toHaveBeenCalledWith("project-1", "feature_spec", {
        content: "# 직접 수정한 기능 명세서"
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("저장 완료");
  });

  it("blocks feature spec saves over 2000 characters", async () => {
    render(<DocumentEditor projectId="project-1" documentType="feature_spec" />);

    const body = await screen.findByLabelText(/문서 본문/);
    fireEvent.change(body, { target: { value: "가".repeat(2001) } });

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(screen.getByText("기능 명세서는 2000자 이하로 저장해야 합니다.")).toBeInTheDocument();
  });

  it("keeps existing content when AI document editing fails", async () => {
    mockedApiClient.editProjectDocumentWithAi.mockRejectedValueOnce(new Error("AI 문서 수정에 실패했어요."));
    const user = userEvent.setup();
    render(<DocumentEditor projectId="project-1" documentType="feature_spec" />);

    const body = await screen.findByLabelText(/문서 본문/);
    await user.type(screen.getByLabelText(/AI 문서 수정 요청/), "로그인 기능 상세화해줘.");
    await user.click(screen.getByRole("button", { name: "AI로 문서 수정" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 문서 수정에 실패했어요.");
    expect(body).toHaveValue("# 기능 명세서");
  });
});
