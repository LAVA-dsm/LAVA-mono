"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

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

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-[22px] font-bold tracking-tight text-lava-text">로그인</h1>
          <p className="mt-1.5 text-[13.5px] text-lava-secondary">
            계정에 로그인하여 프로젝트를 이어 진행하세요.
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Form */}
        <div className="space-y-4" onKeyDown={handleKeyDown}>
          <FieldWrapper label="이메일">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </FieldWrapper>
          <FieldWrapper label="비밀번호">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
          </FieldWrapper>

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={submit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? "로그인 중" : "로그인"}
          </Button>
        </div>

        <p className="mt-6 text-center text-[13px] text-lava-secondary">
          계정이 없으신가요?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="font-semibold text-brand-primary transition-colors hover:text-brand-primaryHover"
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
