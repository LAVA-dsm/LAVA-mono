import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ProjectDocumentSummary, ProjectDocumentType, ProjectSummary } from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { DocumentEditor } from "./document-editor";
import { InvitationResponse } from "./invitation-response";
import { ProjectDetail } from "./project-detail";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push
  }),
  usePathname: () => "/projects/project-1"
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getProject: vi.fn(),
    getProjectDocument: vi.fn(),
    updateProjectDocument: vi.fn(),
    editProjectDocumentWithAi: vi.fn(),
    getInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    rejectInvitation: vi.fn(),
    updateMyParticipation: vi.fn(),
    generateSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    editScheduleWithAi: vi.fn(),
    deleteProject: vi.fn(),
    leaveProject: vi.fn(),
    me: vi.fn(),
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

const projectWithSchedule: ProjectSummary = {
  ...project,
  schedule: {
    id: "schedule-1",
    generatedBy: "ai",
    updatedAt: "2026-06-05T00:00:00.000Z",
    items: [
      {
        id: "schedule-item-1",
        title: "기능 구현",
        type: "task",
        description: "핵심 기능 구현",
        assigneeUserIds: ["leader-1"],
        startDate: "2026-06-05",
        endDate: "2026-06-10"
      }
    ]
  }
};

const mockedApiClient = vi.mocked(apiClient);

describe("DocumentEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.me.mockResolvedValue({ user: { id: "leader-1", email: "leader@example.com", name: "리더" } });
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
    mockedApiClient.getInvitation.mockResolvedValue({
      id: "invitation-1",
      projectId: "project-1",
      projectName: "LAVA",
      email: "teammate@example.com",
      status: "pending",
      sentAt: "2026-06-01T00:00:00.000Z",
      expiresAt: "2026-06-08T00:00:00.000Z"
    });
    mockedApiClient.acceptInvitation.mockResolvedValue(project);
    mockedApiClient.rejectInvitation.mockResolvedValue({
      id: "invitation-1",
      projectId: "project-1",
      projectName: "LAVA",
      email: "teammate@example.com",
      status: "rejected",
      sentAt: "2026-06-01T00:00:00.000Z",
      expiresAt: "2026-06-08T00:00:00.000Z"
    });
    mockedApiClient.updateSchedule.mockResolvedValue(projectWithSchedule.schedule!);
    mockedApiClient.editScheduleWithAi.mockResolvedValue({
      ...projectWithSchedule.schedule!,
      items: [
        {
          id: "schedule-item-1",
          title: "AI 조정 일정",
          type: "task",
          description: "핵심 기능 구현",
          assigneeUserIds: ["leader-1"],
          startDate: "2026-06-05",
          endDate: "2026-06-10"
        }
      ]
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
    render(<DocumentEditor projectId="project-1" documentType="feature_spec" />);

    const body = await screen.findByLabelText(/문서 본문/);
    const nextContent = "# 직접 수정한 기능 명세서";
    fireEvent.change(body, { target: { value: nextContent } });
    await waitFor(() => expect(screen.getByText(`${nextContent.length}/2000`)).toBeInTheDocument());
    fireEvent.click(await screen.findByRole("button", { name: /저장/ }));

    await waitFor(() =>
      expect(mockedApiClient.updateProjectDocument).toHaveBeenCalledWith("project-1", "feature_spec", {
        content: nextContent
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("저장 완료");
  });

  it("blocks feature spec saves over 2000 characters", async () => {
    render(<DocumentEditor projectId="project-1" documentType="feature_spec" />);

    const body = await screen.findByLabelText(/문서 본문/);
    fireEvent.change(body, { target: { value: "가".repeat(2001) } });
    await waitFor(() => expect(screen.getByText("2001/2000")).toBeInTheDocument());

    await waitFor(async () => expect(await screen.findByRole("button", { name: /저장/ })).toBeDisabled());
    expect(screen.getByText("기능 명세서는 2000자 이하로 저장해야 합니다.")).toBeInTheDocument();
  });

  it("keeps existing content when AI document editing fails", async () => {
    mockedApiClient.editProjectDocumentWithAi.mockRejectedValueOnce(new Error("AI 문서 수정에 실패했어요."));
    const user = userEvent.setup();
    render(<DocumentEditor projectId="project-1" documentType="feature_spec" />);

    const body = await screen.findByLabelText(/문서 본문/);
    await user.type(await screen.findByLabelText(/AI 문서 수정 요청/), "로그인 기능 상세화해줘.");
    await waitFor(async () => expect(await screen.findByRole("button", { name: /AI로 문서 수정/ })).not.toBeDisabled());
    await user.click(await screen.findByRole("button", { name: /AI로 문서 수정/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 문서 수정에 실패했어요.");
    expect(body).toHaveValue("# 기능 명세서");
  });

  it("saves direct schedule edits from the project detail screen", async () => {
    mockedApiClient.getProject.mockResolvedValueOnce(projectWithSchedule);
    const user = userEvent.setup();
    render(<ProjectDetail projectId="project-1" />);

    const titleInput = await screen.findByDisplayValue("기능 구현");
    fireEvent.change(titleInput, { target: { value: "수정된 일정" } });
    await user.click(screen.getByRole("button", { name: "일정 저장" }));

    await waitFor(() =>
      expect(mockedApiClient.updateSchedule).toHaveBeenCalledWith("project-1", {
        items: [expect.objectContaining({ title: "수정된 일정" })]
      })
    );
  });

  it("blocks empty AI schedule edit requests and submits non-empty prompts", async () => {
    mockedApiClient.getProject.mockResolvedValueOnce(projectWithSchedule);
    const user = userEvent.setup();
    render(<ProjectDetail projectId="project-1" />);

    const aiEditButton = await screen.findByRole("button", { name: "AI로 일정 수정" });
    expect(aiEditButton).toBeDisabled();

    await user.type(screen.getByLabelText(/AI 일정 수정 요청/), "회의 일정을 평일 저녁으로 조정해줘.");
    expect(aiEditButton).not.toBeDisabled();
    await user.click(aiEditButton);

    await waitFor(() =>
      expect(mockedApiClient.editScheduleWithAi).toHaveBeenCalledWith("project-1", {
        prompt: "회의 일정을 평일 저녁으로 조정해줘."
      })
    );
  });

  it("accepts an invitation with participation info", async () => {
    const user = userEvent.setup();
    render(<InvitationResponse token="invite-token" />);

    expect(await screen.findByText("LAVA")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/전공/), { target: { value: "컴퓨터공학" } });
    fireEvent.change(screen.getByLabelText(/기술 스택/), { target: { value: "React, NestJS" } });
    await user.click(screen.getByRole("button", { name: "초대 수락" }));

    await waitFor(() =>
      expect(mockedApiClient.acceptInvitation).toHaveBeenCalledWith("invite-token", {
        major: "컴퓨터공학",
        techStacks: ["React", "NestJS"],
        availableTimes: [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
      })
    );
    expect(push).toHaveBeenCalledWith("/projects/project-1");
  });
});
