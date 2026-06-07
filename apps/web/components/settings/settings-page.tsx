"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, MailCheck, ShieldCheck, UserRound } from "lucide-react";
import type { AuthUser } from "@lava/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Input } from "@/components/ui/field";
import { apiClient } from "@/lib/api-client";

type PasswordStep = "idle" | "verify" | "password" | "done";

export function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<PasswordStep>("idle");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.me();
        setUser(response.user);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "프로필을 불러오지 못했어요.";
        if (message.includes("로그인이 필요")) {
          router.push(`/login?next=${encodeURIComponent("/settings")}`);
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [router]);

  const sendCode = async () => {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      await apiClient.sendPasswordChangeEmail();
      setStep("verify");
      setStatusMessage("인증 코드를 이메일로 보냈습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증 코드 발송에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      await apiClient.verifyPasswordChangeCode({ code });
      setStep("password");
      setStatusMessage("인증이 완료되었습니다. 새 비밀번호를 입력해 주세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증 코드 확인에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const complete = async () => {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      await apiClient.completePasswordChange({ password, passwordConfirm });
      setStep("done");
      setCode("");
      setPassword("");
      setPasswordConfirm("");
      setStatusMessage("비밀번호를 변경했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "비밀번호 변경에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="설정" activeNav="settings">
      <div className="mx-auto grid max-w-[1080px] gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Profile card */}
        <Card className="relative overflow-hidden p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lava-raised">
              <UserRound className="h-4 w-4 text-lava-secondary" aria-hidden />
            </div>
            <h1 className="text-[16px] font-bold tracking-tight text-lava-text">프로필</h1>
          </div>

          {isLoading && (
            <p className="text-[13px] text-lava-muted">프로필을 불러오는 중입니다.</p>
          )}

          {user && (
            <div className="space-y-3">
              <ProfileValue label="이름" value={user.name} />
              <ProfileValue label="이메일" value={user.email} />
            </div>
          )}

          <div className="mt-6 rounded-xl border border-lava-border bg-lava-raised p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-lava-text">
              <ShieldCheck className="h-4 w-4 text-lava-success" aria-hidden />
              계정 보안
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-lava-secondary">
              비밀번호 변경은 이메일 인증 후 진행됩니다.
            </p>
          </div>
        </Card>

        {/* Password change card */}
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lava-raised">
              <KeyRound className="h-4 w-4 text-lava-secondary" aria-hidden />
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-lava-text">
              비밀번호 변경
            </h2>
          </div>
          <p className="mb-5 text-[13px] leading-relaxed text-lava-secondary">
            로그인된 이메일로 인증 코드를 받은 뒤 새 비밀번호를 설정합니다.
          </p>

          {error && <ErrorAlert message={error} />}

          {statusMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-[rgb(var(--c-success)/0.25)] bg-[rgb(var(--c-success)/0.12)] px-4 py-3 text-[13px] font-medium text-lava-success"
            >
              {statusMessage}
            </div>
          )}

          {(step === "idle" || step === "done") && (
            <Button
              type="button"
              onClick={sendCode}
              disabled={isSubmitting || !user}
              loading={isSubmitting}
              icon={<MailCheck className="h-4 w-4" aria-hidden />}
            >
              {isSubmitting ? "발송 중" : "인증 코드 받기"}
            </Button>
          )}

          {step === "verify" && (
            <div className="max-w-[380px] space-y-4">
              <FieldWrapper label="인증 코드" hint="이메일로 받은 6자리 숫자를 입력해 주세요.">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                />
              </FieldWrapper>
              <Button
                type="button"
                onClick={verifyCode}
                disabled={isSubmitting || !code.trim()}
                loading={isSubmitting}
              >
                {isSubmitting ? "확인 중" : "인증 확인"}
              </Button>
            </div>
          )}

          {step === "password" && (
            <div className="max-w-[380px] space-y-4">
              <FieldWrapper
                label="새 비밀번호"
                hint="8자 이상, 대소문자 · 숫자 · 특수문자 포함"
              >
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="새 비밀번호"
                  autoComplete="new-password"
                  autoFocus
                />
              </FieldWrapper>
              <FieldWrapper label="새 비밀번호 확인">
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="새 비밀번호 재입력"
                  autoComplete="new-password"
                />
              </FieldWrapper>
              <Button
                type="button"
                onClick={complete}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? "변경 중" : "비밀번호 변경"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-lava-border bg-lava-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lava-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-[13.5px] font-semibold text-lava-text">{value}</p>
    </div>
  );
}
