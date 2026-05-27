"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-lava-app px-6">
      <Card className="w-full max-w-[440px]">
        <div className="mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-primary text-white">
            <LogIn className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="text-[28px] font-bold leading-[38px] text-lava-text">LAVA 로그인</h1>
          <p className="mt-2 text-sm leading-6 text-lava-secondary">프로젝트 생성과 초대 응답을 계속하려면 로그인해 주세요.</p>
        </div>

        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}

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
          <Link className="font-semibold text-brand-primary" href={`/signup?next=${encodeURIComponent(next)}`}>
            회원가입
          </Link>
        </p>
      </Card>
    </main>
  );
}
