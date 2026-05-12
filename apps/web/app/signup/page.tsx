"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldWrapper, Input } from "@/components/ui/field";

type SignupStep = "email" | "verify" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const [next, setNext] = useState("/projects/new");
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
    setNext(params.get("next") || "/projects/new");
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
    <main className="flex min-h-screen items-center justify-center bg-lava-app px-6">
      <Card className="w-full max-w-[480px]">
        <div className="mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-primary text-white">
            <MailCheck className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="text-[28px] font-bold leading-[38px] text-lava-text">LAVA 회원가입</h1>
          <p className="mt-2 text-sm leading-6 text-lava-secondary">이메일 인증 후 프로젝트에 참여할 수 있습니다.</p>
        </div>

        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}

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
          <Link className="font-semibold text-brand-primary" href={`/login?next=${encodeURIComponent(next)}`}>
            로그인
          </Link>
        </p>
      </Card>
    </main>
  );
}
