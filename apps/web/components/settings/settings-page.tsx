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
        const message = loadError instanceof Error ? loadError.message : "프로필을 불러오지 못했어요.";
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
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "인증 코드 발송에 실패했어요.");
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
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "인증 코드 확인에 실패했어요.");
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
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "비밀번호 변경에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="설정" activeNav="settings">
      <div className="mx-auto grid max-w-[1180px] gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="relative overflow-hidden p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#FF5A2D,#20A99A,#5865F2)]" />
          <div className="mb-6 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-brand-primary" aria-hidden />
            <h1 className="text-[22px] font-black leading-[30px] text-lava-text">프로필</h1>
          </div>
          {isLoading ? <p className="text-sm text-lava-secondary">프로필을 불러오는 중입니다.</p> : null}
          {user ? (
            <div className="space-y-5">
              <ProfileValue label="이름" value={user.name} />
              <ProfileValue label="이메일" value={user.email} />
            </div>
          ) : null}
          <div className="mt-7 rounded-lg border border-lava-border bg-lava-raised p-4">
            <div className="flex items-center gap-2 text-sm font-black text-lava-text">
              <ShieldCheck className="h-4 w-4 text-lava-success" aria-hidden />
              계정 보안
            </div>
            <p className="mt-2 text-xs leading-5 text-lava-secondary">비밀번호 변경은 이메일 인증 후 진행됩니다.</p>
          </div>
        </Card>

        <Card className="p-7">
          <div className="mb-6 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-primary" aria-hidden />
            <h2 className="text-[22px] font-black leading-[30px] text-lava-text">비밀번호 변경</h2>
          </div>
          <p className="mb-5 text-sm leading-6 text-lava-secondary">
            로그인된 이메일로 인증 코드를 받은 뒤 새 비밀번호를 설정합니다.
          </p>

          {error ? <ErrorAlert message={error} /> : null}
          {statusMessage ? (
            <div role="status" className="mb-5 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-lava-success">
              {statusMessage}
            </div>
          ) : null}

          {step === "idle" || step === "done" ? (
            <Button
              type="button"
              onClick={sendCode}
              disabled={isSubmitting || !user}
              icon={<MailCheck className="h-4 w-4" aria-hidden />}
            >
              {isSubmitting ? "발송 중" : "인증 코드 받기"}
            </Button>
          ) : null}

          {step === "verify" ? (
            <div className="max-w-[420px] space-y-5">
              <FieldWrapper label="인증 코드" hint="이메일로 받은 6자리 숫자를 입력해 주세요.">
                <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" />
              </FieldWrapper>
              <Button type="button" onClick={verifyCode} disabled={isSubmitting || !code.trim()}>
                {isSubmitting ? "확인 중" : "인증 확인"}
              </Button>
            </div>
          ) : null}

          {step === "password" ? (
            <div className="max-w-[420px] space-y-5">
              <FieldWrapper label="새 비밀번호" hint="8자 이상, 대소문자, 숫자, 특수문자를 포함해 주세요.">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="새 비밀번호"
                />
              </FieldWrapper>
              <FieldWrapper label="새 비밀번호 확인">
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="새 비밀번호 확인"
                />
              </FieldWrapper>
              <Button type="button" onClick={complete} disabled={isSubmitting}>
                {isSubmitting ? "변경 중" : "비밀번호 변경"}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-lava-border bg-white px-4 py-3">
      <p className="text-xs font-bold text-lava-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-lava-text">{value}</p>
    </div>
  );
}
