import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  FileCode2,
  ListChecks,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "LAVA · 아이디어를 실행 가능한 프로젝트로",
  description:
    "아이디어만 입력하면 LAVA AI가 기능 명세서, API 명세서, 개발 일정을 자동으로 생성합니다. 팀 협업까지 한 흐름에서."
};

const FEATURES = [
  {
    icon: ListChecks,
    title: "기능 명세서 자동 생성",
    desc: "아이디어를 분석해 핵심 비즈니스 로직과 화면별 요구사항을 구조화된 문서로 정리합니다."
  },
  {
    icon: FileCode2,
    title: "API 명세서 설계",
    desc: "엔드포인트와 Request / Response 규격을 REST 표준에 맞춰 초안으로 작성합니다."
  },
  {
    icon: CalendarClock,
    title: "참여 기반 일정 배분",
    desc: "팀원의 가용 시간과 역할을 반영해 스프린트와 작업 일정을 날짜 단위로 구성합니다."
  }
];

const STEPS = [
  { n: "01", title: "아이디어 입력", desc: "만들고 싶은 것을 한 문단으로 적습니다." },
  { n: "02", title: "AI 명세 생성", desc: "기능·API 명세 초안이 즉시 만들어집니다." },
  { n: "03", title: "팀과 실행", desc: "멤버를 초대하고 일정을 받아 바로 시작합니다." }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-lava-app text-lava-text">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="lava-glass sticky top-0 z-40 border-b border-lava-border">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Link href="/landing" className="flex items-center gap-2.5">
            <Image
              src="/lava_logo.png"
              alt="LAVA"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
            <span className="text-[16px] font-extrabold tracking-tight">LAVA</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-[13.5px] font-medium text-lava-secondary transition-colors hover:text-lava-text">
              기능
            </a>
            <a href="#how" className="text-[13.5px] font-medium text-lava-secondary transition-colors hover:text-lava-text">
              작동 방식
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-[10px] px-3.5 text-[13px] font-semibold text-lava-secondary transition-colors hover:text-lava-text sm:flex"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-brand-primary px-4 text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-brand-primaryHover"
            >
              시작하기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1120px] px-5 pb-8 pt-20 text-center sm:px-8 sm:pt-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-lava-border bg-lava-surface px-3.5 py-1.5 shadow-xs">
          <Zap className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
          <span className="text-[12px] font-semibold text-lava-secondary">AI 프로젝트 워크스페이스</span>
        </div>

        <h1 className="lava-text-balance mx-auto max-w-[760px] text-[40px] font-extrabold leading-[1.1] tracking-tight sm:text-[58px]">
          아이디어를 실행 가능한
          <br className="hidden sm:block" /> 프로젝트로 바꾸는 가장 빠른 길
        </h1>
        <p className="lava-text-balance mx-auto mt-6 max-w-[560px] text-[15px] leading-[1.7] text-lava-secondary sm:text-[16px]">
          한 문단의 아이디어만 입력하면 LAVA AI가 기능 명세서, API 명세서, 개발
          일정을 자동으로 만들어 줍니다. 기획부터 협업까지, 하나의 흐름에서.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex h-11 items-center gap-2 rounded-xl bg-brand-primary px-6 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-primaryHover"
          >
            무료로 시작하기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/login"
            className="flex h-11 items-center rounded-xl border border-lava-borderStrong bg-lava-surface px-6 text-[14px] font-semibold text-lava-text shadow-xs transition-colors hover:bg-lava-raised"
          >
            로그인
          </Link>
        </div>

        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12.5px] text-lava-muted">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-lava-success" aria-hidden /> 신용카드 불필요
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-lava-success" aria-hidden /> 2분 안에 첫 프로젝트
          </span>
        </p>
      </section>

      {/* ── Product preview ─────────────────────────────── */}
      <section className="mx-auto max-w-[1000px] px-5 pb-24 sm:px-8">
        <AppPreview />
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="border-t border-lava-border bg-lava-surface/40">
        <div className="mx-auto max-w-[1120px] px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-[620px] text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-primary">
              Capabilities
            </p>
            <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
              기획에 드는 시간을 90% 줄입니다
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-lava-secondary">
              문서 작성, 일정 설계, 역할 분담 — 반복적인 프로젝트 셋업을 AI가 대신합니다.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-lava-border bg-lava-surface p-6 shadow-xs"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-warmBg text-brand-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-[16px] font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-[1.65] text-lava-secondary">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section id="how" className="border-t border-lava-border">
        <div className="mx-auto max-w-[1120px] px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-[620px] text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-primary">
              How it works
            </p>
            <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
              세 단계면 충분합니다
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-lava-border bg-lava-surface p-7 shadow-xs">
                <span className="text-[13px] font-extrabold tracking-tight text-brand-primary">{s.n}</span>
                <h3 className="mt-3 text-[17px] font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-lava-secondary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="border-t border-lava-border bg-lava-surface/40">
        <div className="mx-auto max-w-[1120px] px-5 py-24 sm:px-8">
          <div className="overflow-hidden rounded-3xl border border-lava-border bg-lava-surface px-8 py-16 text-center shadow-sm">
            <Sparkles className="mx-auto h-7 w-7 text-brand-primary" aria-hidden />
            <h2 className="lava-text-balance mx-auto mt-5 max-w-[520px] text-[30px] font-extrabold tracking-tight sm:text-[36px]">
              지금 첫 프로젝트를 시작하세요
            </h2>
            <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-[1.7] text-lava-secondary">
              아이디어 한 줄이면 충분합니다. 나머지는 LAVA AI가 채웁니다.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-primary px-7 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-primaryHover"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-lava-border">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/lava_logo.png" alt="LAVA" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
            <span className="text-[13px] font-bold tracking-tight">LAVA</span>
            <span className="text-[12px] text-lava-muted">© 2026 LAVA</span>
          </div>
          <p className="text-[12px] text-lava-muted">AI 기반 프로젝트 기획 · 협업 플랫폼</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Faux product preview, built from the real design tokens ── */
function AppPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-lava-border bg-lava-surface shadow-lg">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-lava-border bg-lava-raised px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 rounded-md bg-lava-surface px-2.5 py-1 text-[11px] font-medium text-lava-muted">
          app.lava.dev/dashboard
        </span>
      </div>

      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden w-[150px] shrink-0 flex-col gap-1 bg-[var(--side-bg)] p-3 sm:flex">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-5 w-5 rounded-md bg-brand-primary" />
            <span className="text-[12px] font-bold text-white">LAVA</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-white/[0.07] px-2 py-1.5 text-[11px] font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" /> 대시보드
          </div>
          <div className="px-2 py-1.5 text-[11px] font-medium text-[color:var(--side-text-2)]">새 프로젝트</div>
          <div className="px-2 py-1.5 text-[11px] font-medium text-[color:var(--side-text-2)]">설정</div>
        </div>

        {/* mini content */}
        <div className="min-w-0 flex-1 p-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: "참여 프로젝트", v: "8" },
              { l: "AI 문서", v: "16" },
              { l: "전체 일정", v: "42" }
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-lava-border bg-lava-surface px-3.5 py-3">
                <p className="text-[10.5px] font-medium text-lava-muted">{s.l}</p>
                <p className="mt-1 text-[20px] font-extrabold tracking-tight tabular-nums">{s.v}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-lava-border bg-lava-surface">
            <div className="border-b border-lava-border px-4 py-2.5 text-[12px] font-bold">프로젝트</div>
            {[
              { n: "핀테크 모바일 앱 MVP", c: "#FF5A2D", role: "리더" },
              { n: "사내 디자인 시스템", c: "#20A99A", role: "멤버" },
              { n: "포트폴리오 블로그", c: "#5865F2", role: "리더" }
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-3 border-b border-lava-border px-4 py-2.5 last:border-0">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
                  style={{ background: p.c }}
                >
                  {p.n.slice(0, 1)}
                </span>
                <span className="flex-1 truncate text-[12px] font-semibold">{p.n}</span>
                <span className="inline-flex items-center gap-1 text-[10.5px] text-lava-muted">
                  <Users className="h-3 w-3" aria-hidden /> {p.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
