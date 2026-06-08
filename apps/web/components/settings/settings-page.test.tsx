import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./settings-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    me: vi.fn(async () => ({ user: { id: "user-1", name: "사용자", email: "user@example.com" } })),
    sendPasswordChangeEmail: vi.fn(async () => ({ sent: true, expiresAt: "2026-06-01T00:05:00.000Z" })),
    verifyPasswordChangeCode: vi.fn(async () => ({ verified: true })),
    completePasswordChange: vi.fn(async () => ({ changed: true }))
  }
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the current profile", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("사용자")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("completes the password change flow", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByText("user@example.com");
    await user.click(screen.getByRole("button", { name: "인증 코드 받기" }));
    await user.type(screen.getByLabelText(/인증 코드/), "123456");
    await user.click(screen.getByRole("button", { name: "인증 확인" }));
    await user.type(screen.getByPlaceholderText("새 비밀번호"), "Passw0rd!");
    await user.type(screen.getByPlaceholderText("새 비밀번호 재입력"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    await waitFor(() => expect(screen.getByText("비밀번호를 변경했습니다.")).toBeInTheDocument());
  });
});
