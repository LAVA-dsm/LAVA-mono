"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Input } from "@/components/ui/field";

type SignupStep = "email" | "verify" | "profile";

const STEP_LABELS: Record<SignupStep, string> = {
  email: "이메일 입력",
  verify: "인증 코드 확인",
  profile: "프로필 설정"
};

const STEPS: SignupStep[] = ["email", "verify", "profile"];

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증 코드 발송에 실패했어요.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증 코드 확인에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeSignup = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.completeSignup({ email, name, password, passwordConfirm });
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <main className="flex min-h-screen items-center justify-center bg-lava-app px-5 py-12">
      <div className="w-full max-w-[400px] animate-lava-enter">
        {/* Logo */}
        <Link href="/landing" className="mb-9 inline-flex items-center gap-2.5">
          <Image
            src="/lava_logo.png"
            alt="LAVA"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          <span className="text-[16px] font-extrabold tracking-tight text-lava-text">LAVA</span>
        </Link>

        {/* Step progress */}
        <div className="mb-7">
          <div className="mb-2.5 flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={[
                  "h-[3px] flex-1 rounded-full transition-all duration-300",
                  i <= currentStepIndex ? "bg-brand-primary" : "bg-lava-border"
                ].join(" ")}
              />
            ))}
          </div>
          <p className="text-[11px] font-semibold text-lava-muted">
            {currentStepIndex + 1} / {STEPS.length} · {STEP_LABELS[step]}
          </p>
        </div>

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-[22px] font-bold tracking-tight text-lava-text">
            {step === "email" && "회원가입"}
            {step === "verify" && "이메일을 확인해 주세요"}
            {step === "profile" && "프로필을 완성해 주세요"}
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-lava-secondary">
            {step === "email" && "이메일로 인증 코드를 받아 시작합니다."}
            {step === "verify" && `${email}로 발송된 6자리 코드를 입력해 주세요.`}
            {step === "profile" && "이름과 비밀번호를 설정하면 바로 시작합니다."}
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Email step */}
        {step === "email" && (
          <div className="space-y-4">
            <FieldWrapper label="이메일">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && void sendCode()}
              />
            </FieldWrapper>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={sendCode}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "발송 중" : "인증 코드 받기"}
            </Button>
          </div>
        )}

        {/* Verify step */}
        {step === "verify" && (
          <div className="space-y-4">
            <FieldWrapper label="인증 코드" hint="이메일로 받은 6자리 숫자를 입력해 주세요.">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && void verifyCode()}
              />
            </FieldWrapper>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={verifyCode}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "확인 중" : "인증 확인"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-center text-[12.5px] text-lava-secondary transition-colors hover:text-lava-text"
            >
              이메일 다시 입력하기
            </button>
          </div>
        )}

        {/* Profile step */}
        {step === "profile" && (
          <div className="space-y-4">
            <FieldWrapper label="이름">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                autoFocus
              />
            </FieldWrapper>
            <FieldWrapper label="비밀번호" hint="8자 이상, 대소문자 · 숫자 · 특수문자 포함">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 설정"
                autoComplete="new-password"
              />
            </FieldWrapper>
            <FieldWrapper label="비밀번호 확인">
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && void completeSignup()}
              />
            </FieldWrapper>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={completeSignup}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "가입 중" : "가입 완료"}
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-[13px] text-lava-secondary">
          이미 계정이 있으신가요?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-semibold text-brand-primary transition-colors hover:text-brand-primaryHover"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
