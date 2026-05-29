"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Input } from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/");
  }, []);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.login({ email, password });
      router.push(next);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-lava-app px-4 py-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:p-8">
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
            AI-ready planning workspace
          </div>
          <h1 className="lava-text-balance text-[44px] font-black leading-[1.1] text-lava-text">
            아이디어를 곧바로 실행 가능한 프로젝트 문서로.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-lava-secondary">
            기능 명세서, API 명세서, 일정을 하나의 흐름에서 생성하고 팀과 함께 다듬습니다.
          </p>
        </div>
        <div className="grid max-w-2xl grid-cols-3 gap-3">
          {["기능 명세", "API 명세", "일정 생성"].map((label) => (
            <div key={label} className="rounded-lg border border-lava-border bg-lava-raised p-4">
              <p className="text-sm font-black text-lava-text">{label}</p>
              <p className="mt-1 text-xs leading-5 text-lava-secondary">AI 초안 기반</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center lg:pl-8">
        <Card className="w-full max-w-[460px] p-7 sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary text-white shadow-[0_14px_30px_rgba(255,90,45,0.22)]">
              <LogIn className="h-5 w-5" aria-hidden />
            </div>
            <h1 className="text-[30px] font-black leading-[1.18] text-lava-text">LAVA 로그인</h1>
            <p className="mt-2 text-sm leading-6 text-lava-secondary">프로젝트 생성과 초대 응답을 계속하려면 로그인해 주세요.</p>
          </div>

          {error ? <ErrorAlert message={error} /> : null}

          <div className="space-y-5">
            <FieldWrapper label="이메일">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </FieldWrapper>
            <FieldWrapper label="비밀번호">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
              />
            </FieldWrapper>
          </div>

          <Button type="button" className="mt-7 w-full" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "로그인 중" : "로그인"}
          </Button>

          <p className="mt-5 text-center text-sm text-lava-secondary">
            계정이 없다면{" "}
            <Link className="font-black text-brand-primary hover:text-brand-primaryHover" href={`/signup?next=${encodeURIComponent(next)}`}>
              회원가입
            </Link>
          </p>
        </Card>
      </section>
    </main>
  );
}
