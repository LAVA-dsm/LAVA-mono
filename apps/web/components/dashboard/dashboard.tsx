"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import koLocale from "@fullcalendar/core/locales/ko";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Plus, Users } from "lucide-react";
import type { EventInput } from "@fullcalendar/core";
import type { ProjectCalendarItem, ProjectListItem } from "@lava/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { apiClient } from "@/lib/api-client";

const PROJECT_COLORS = ["#FF5A2D", "#20A99A", "#5865F2", "#2E9E59", "#D98A2B", "#8C4FE0"];

function getProjectColor(projectId: string): string {
  const index =
    Array.from(projectId).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    PROJECT_COLORS.length;
  return PROJECT_COLORS[index] ?? "#FF5A2D";
}

function addOneDay(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [calendarItems, setCalendarItems] = useState<ProjectCalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [projectResponse, calendarResponse] = await Promise.all([
          apiClient.listProjects(),
          apiClient.getCalendarItems()
        ]);
        setProjects(projectResponse.projects);
        setCalendarItems(calendarResponse.items);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "대시보드를 불러오지 못했어요.";
        if (message.includes("로그인이 필요")) {
          router.push(`/login?next=${encodeURIComponent("/")}`);
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [router, retryTrigger]);

  const events = useMemo<EventInput[]>(
    () =>
      calendarItems.map((item) => {
        const color = getProjectColor(item.projectId);
        return {
          id: item.id,
          title: `${item.projectName} · ${item.title}`,
          start: item.startDate,
          end: addOneDay(item.endDate),
          allDay: true,
          backgroundColor: color,
          borderColor: "transparent",
          textColor: "#FFFFFF"
        };
      }),
    [calendarItems]
  );

  const pendingInvitationCount = projects.reduce((s, p) => s + p.pendingInvitationCount, 0);
  const scheduleItemCount = projects.reduce((s, p) => s + p.scheduleItemCount, 0);
  const aiDocumentCount = projects.reduce((s, p) => s + p.documentCount, 0);

  return (
    <AppShell
      title={
        <h1 className="truncate text-[14.5px] font-semibold tracking-tight text-lava-text">
          대시보드
        </h1>
      }
    >
      <div className="space-y-5">
        {error && (
          <ErrorAlert message={error} onRetry={() => setRetryTrigger((prev) => prev + 1)} />
        )}

        {/* ── Overview metrics (Stripe-style single bar) ── */}
        <Card noPad className="grid grid-cols-2 divide-lava-border md:grid-cols-4 md:divide-x">
          <Stat label="참여 프로젝트" value={projects.length} accent />
          <Stat label="AI 문서" value={aiDocumentCount} />
          <Stat label="전체 일정" value={scheduleItemCount} />
          <Stat label="초대 대기" value={pendingInvitationCount} muted={pendingInvitationCount === 0} />
        </Card>

        {/* ── Projects + Calendar ───────────────────────── */}
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_452px]">
          {/* Projects */}
          <Card id="projects-section" noPad className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold tracking-tight text-lava-text">프로젝트</h2>
                <span className="rounded-md bg-lava-raised px-1.5 py-0.5 text-[11px] font-semibold text-lava-muted">
                  {projects.length}
                </span>
              </div>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-lava-secondary transition-colors hover:text-brand-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                새 프로젝트
              </Link>
            </div>

            <div className="border-t border-lava-border">
              {isLoading && <ProjectLoadingRows />}

              {!isLoading && !projects.length && <EmptyProjects />}

              <div className="divide-y divide-lava-border">
                {projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            </div>
          </Card>

          {/* Calendar */}
          <Card id="calendar" noPad className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lava-border px-5 py-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-lava-muted" aria-hidden />
                <h2 className="text-[14px] font-bold tracking-tight text-lava-text">일정</h2>
              </div>
              <span className="text-[11.5px] font-medium text-lava-muted">{scheduleItemCount}개 항목</span>
            </div>
            <div className="lava-calendar overflow-hidden p-4">
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                locale={koLocale}
                events={events}
                headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
                height="auto"
                dayMaxEventRows={3}
              />
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function Stat({
  label,
  value,
  accent = false,
  muted = false
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11.5px] font-medium text-lava-muted">{label}</p>
      <p
        className={[
          "mt-1.5 text-[26px] font-extrabold leading-none tracking-tight tabular-nums",
          muted ? "text-lava-muted" : accent ? "text-brand-primary" : "text-lava-text"
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-lava-border bg-lava-raised">
        <Plus className="h-5 w-5 text-lava-muted" aria-hidden />
      </div>
      <p className="text-[14px] font-semibold text-lava-text">아직 프로젝트가 없습니다</p>
      <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-[1.6] text-lava-muted">
        아이디어만 입력하면 LAVA AI가 기능 명세 · API 명세 · 일정을 자동으로 구성해 드립니다.
      </p>
      <Link href="/projects/new" className="mt-5 inline-block">
        <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
          첫 프로젝트 만들기
        </Button>
      </Link>
    </div>
  );
}

function ProjectLoadingRows() {
  return (
    <div className="divide-y divide-lava-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3.5 px-5 py-4">
          <div className="lava-skeleton h-9 w-9 rounded-[10px]" />
          <div className="flex-1">
            <div className="lava-skeleton h-3.5 w-44 rounded-full" />
            <div className="mt-2.5 lava-skeleton h-2.5 w-60 max-w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectGlyph({ name, color }: { name: string; color: string }) {
  const ch = name.trim().slice(0, 1) || "P";
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-bold text-white"
      style={{ background: color }}
      aria-hidden
    >
      {ch}
    </span>
  );
}

function DocRing({ count }: { count: number }) {
  const total = 2;
  const pct = Math.min(count / total, 1);
  const r = 9;
  const c = 2 * Math.PI * r;
  const done = count >= total;
  return (
    <div className="flex items-center gap-1.5">
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="#ECEDF0" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={done ? "#15935A" : "#FF5A2D"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="text-[11px] font-semibold tabular-nums text-lava-muted">{count}/{total}</span>
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  const color = getProjectColor(project.id);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-lava-raised/70"
    >
      <ProjectGlyph name={project.name} color={color} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[13.5px] font-semibold tracking-tight text-lava-text">
            {project.name}
          </h3>
          <Badge tone={project.currentUserRole === "leader" ? "purple" : "gray"} dot>
            {project.currentUserRole === "leader" ? "리더" : "멤버"}
          </Badge>
          {project.pendingInvitationCount > 0 && (
            <Badge tone="warning" dot>
              초대 {project.pendingInvitationCount}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-lava-muted">
          <span className="tabular-nums">{project.startDate} – {project.endDate}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {project.memberCount}
          </span>
          <span>{project.type === "team" ? "팀" : "개인"}</span>
        </div>
      </div>

      <DocRing count={project.documentCount} />

      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-lava-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}
