"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Input } from "@/components/ui/field";

type SignupStep = "email" | "verify" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const [next, setNext] = useState("/");
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/");
  }, []);

  const sendCode = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.sendSignupEmail({ email });
      setStep("verify");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "인증 코드 발송에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.verifySignupCode({ email, code });
      setStep("profile");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "인증 코드 확인에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeSignup = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.completeSignup({
        email,
        name,
        password,
        passwordConfirm
      });
      router.push(next);
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "회원가입에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-lava-app px-4 py-8 lg:grid-cols-[minmax(0,1fr)_540px] lg:p-8">
      <section className="hidden rounded-lg border border-lava-border bg-white p-8 shadow-card lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/lava_logo.png" alt="LAVA" width={42} height={42} className="h-[42px] w-[42px]" priority />
          <div>
            <p className="text-xl font-black text-brand-ink">LAVA</p>
            <p className="text-xs font-semibold text-lava-muted">Project intelligence</p>
          </div>
        </Link>
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-warmBg px-3 py-1 text-xs font-black text-brand-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Invite-ready collaboration
          </div>
          <h1 className="lava-text-balance text-[44px] font-black leading-[1.1] text-lava-text">
            프로젝트 시작 전에 필요한 문서를 먼저 갖춥니다.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-lava-secondary">
            이메일 인증만 마치면 초대 응답, 참여 가능 시간 입력, 프로젝트 문서 편집까지 이어집니다.
          </p>
        </div>
        <div className="grid max-w-2xl grid-cols-3 gap-3">
          {["이메일 인증", "팀 초대", "AI 초안"].map((label) => (
            <div key={label} className="rounded-lg border border-lava-border bg-lava-raised p-4">
              <p className="text-sm font-black text-lava-text">{label}</p>
              <p className="mt-1 text-xs leading-5 text-lava-secondary">MVP 핵심 흐름</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center lg:pl-8">
        <Card className="w-full max-w-[480px] p-7 sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary text-white shadow-[0_14px_30px_rgba(255,90,45,0.22)]">
              <MailCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="mb-4 flex gap-2">
              {(["email", "verify", "profile"] as SignupStep[]).map((item) => (
                <span
                  key={item}
                  className={`h-1.5 flex-1 rounded-full ${step === item ? "bg-brand-primary" : "bg-lava-border"}`}
                />
              ))}
            </div>
            <h1 className="text-[30px] font-black leading-[1.18] text-lava-text">LAVA 회원가입</h1>
            <p className="mt-2 text-sm leading-6 text-lava-secondary">이메일 인증 후 프로젝트에 참여할 수 있습니다.</p>
          </div>

          {error ? <ErrorAlert message={error} /> : null}

          {step === "email" ? (
            <div className="space-y-5">
              <FieldWrapper label="이메일" hint="인증 코드를 받을 이메일을 입력해 주세요.">
                <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </FieldWrapper>
              <Button type="button" className="w-full" onClick={sendCode} disabled={isSubmitting}>
                {isSubmitting ? "발송 중" : "인증 코드 받기"}
              </Button>
            </div>
          ) : null}

          {step === "verify" ? (
            <div className="space-y-5">
              <FieldWrapper label="인증 코드" hint="이메일로 받은 6자리 숫자를 입력해 주세요.">
                <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" />
              </FieldWrapper>
              <Button type="button" className="w-full" onClick={verifyCode} disabled={isSubmitting}>
                {isSubmitting ? "확인 중" : "인증 확인"}
              </Button>
            </div>
          ) : null}

          {step === "profile" ? (
            <div className="space-y-5">
              <FieldWrapper label="이름">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" />
              </FieldWrapper>
              <FieldWrapper label="비밀번호" hint="8자 이상, 대소문자, 숫자, 특수문자를 포함해 주세요.">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호"
                />
              </FieldWrapper>
              <FieldWrapper label="비밀번호 확인">
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="비밀번호 확인"
                />
              </FieldWrapper>
              <Button type="button" className="w-full" onClick={completeSignup} disabled={isSubmitting}>
                {isSubmitting ? "가입 중" : "가입 완료"}
              </Button>
            </div>
          ) : null}

          <p className="mt-5 text-center text-sm text-lava-secondary">
            이미 계정이 있다면{" "}
            <Link className="font-black text-brand-primary hover:text-brand-primaryHover" href={`/login?next=${encodeURIComponent(next)}`}>
              로그인
            </Link>
          </p>
        </Card>
      </section>
    </main>
  );
}
