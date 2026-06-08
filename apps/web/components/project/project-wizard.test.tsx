import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectWizard } from "./project-wizard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    enhanceIdea: vi.fn(async () => ({ enhancedIdea: "AI가 구체화한 프로젝트 개요입니다." })),
    createProject: vi.fn(async () => ({ id: "project-1" }))
  }
}));

const longIdea =
  "LAVA는 프로젝트를 시작하는 사용자가 아이디어를 구체화하고 기능 명세서와 API 명세서를 빠르게 만들 수 있게 돕는 서비스입니다. " +
  "프로젝트 이름, 유형, 일정, 초대 정보를 바탕으로 AI가 가능한 초안 문서를 생성하고 사용자는 이를 검토해 바로 작업을 시작할 수 있어야 합니다. " +
  "협업 관리와 개발 준비 문서를 쉽게 만들고 반복 수정할 수 있도록 프로젝트 목적, 주요 기능, 개발 범위를 함께 정리합니다.";

async function fillRequiredBasics() {
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText(/프로젝트 이름/), { target: { value: "LAVA" } });
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: "2026-06-01" } });
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: "2026-06-30" } });
  fireEvent.change(screen.getByLabelText(/프로젝트 아이디어/), { target: { value: longIdea } });
  return user;
}

describe("ProjectWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves from basic info to invitation step for team projects", async () => {
    render(<ProjectWizard />);
    const user = await fillRequiredBasics();

    await user.click(screen.getByRole("button", { name: "다음 단계" }));

    expect(screen.getByText("Step 2. 팀원 이메일 초대")).toBeInTheDocument();
    expect(screen.getByLabelText(/초대 이메일/)).toBeInTheDocument();
  });

  it("skips invitation input for personal projects", async () => {
    render(<ProjectWizard />);
    const user = await fillRequiredBasics();

    await user.click(screen.getByRole("button", { name: "개인 프로젝트" }));
    await user.click(screen.getByRole("button", { name: "다음 단계" }));

    expect(screen.getByText("Step 3. AI 명세 생성 준비")).toBeInTheDocument();
    expect(screen.queryByLabelText(/초대 이메일/)).not.toBeInTheDocument();
  });

  it("disables the AI enhance button after one successful enhancement", async () => {
    render(<ProjectWizard />);
    const user = await fillRequiredBasics();

    await user.click(screen.getByRole("button", { name: "AI 아이디어 증강" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "AI 증강 완료" })).toBeDisabled());
    expect(screen.getByLabelText(/프로젝트 아이디어/)).toHaveValue("AI가 구체화한 프로젝트 개요입니다.");
  });

  it("shows a specific validation message before leaving the basic step", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard />);

    await user.click(screen.getByRole("button", { name: "다음 단계" }));

    expect(screen.getByRole("alert")).toHaveTextContent("프로젝트 이름을 입력해 주세요.");
  });

  it("allows idea enhancement with a short idea", async () => {
    render(<ProjectWizard />);
    const user = userEvent.setup();

    fireEvent.change(screen.getByLabelText(/프로젝트 이름/), { target: { value: "LAVA" } });
    fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: "2026-06-30" } });
    fireEvent.change(screen.getByLabelText(/프로젝트 아이디어/), { target: { value: "짧은 아이디어" } });

    await user.click(screen.getByRole("button", { name: "AI 아이디어 증강" }));

    await waitFor(() => expect(screen.getByLabelText(/프로젝트 아이디어/)).toHaveValue("AI가 구체화한 프로젝트 개요입니다."));
  });
});
