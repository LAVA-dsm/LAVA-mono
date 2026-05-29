"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import koLocale from "@fullcalendar/core/locales/ko";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  FolderOpen,
  Plus,
  Sparkles,
  Users
} from "lucide-react";
import type { EventInput } from "@fullcalendar/core";
import type { ProjectCalendarItem, ProjectListItem } from "@lava/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { apiClient } from "@/lib/api-client";

const projectColors = ["#FF5A2D", "#20A99A", "#5865F2", "#35B85A", "#F5A400", "#7B61FF"];

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
        const message = loadError instanceof Error ? loadError.message : "대시보드를 불러오지 못했어요.";
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
          borderColor: color,
          textColor: "#FFFFFF"
        };
      }),
    [calendarItems]
  );

  const pendingInvitationCount = projects.reduce((sum, project) => sum + project.pendingInvitationCount, 0);
  const scheduleItemCount = projects.reduce((sum, project) => sum + project.scheduleItemCount, 0);
  const aiDocumentCount = projects.reduce((sum, project) => sum + project.documentCount, 0);

  return (
    <AppShell
      title={
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-primary">Workspace</p>
          <h1 className="truncate text-lg font-black text-lava-text sm:text-xl">대시보드</h1>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-lava-border bg-white p-6 shadow-card sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <Badge tone="red">AI 프로젝트 시작대</Badge>
                <h2 className="lava-text-balance mt-4 text-[30px] font-black leading-[1.18] text-lava-text sm:text-[38px]">
                  아이디어에서 명세, API, 일정까지 한 번에 이어갑니다.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-lava-secondary">
                  현재 참여 중인 프로젝트와 산출물 상태를 한 화면에서 확인하고, 필요한 프로젝트를 바로 열어 다음 작업으로 이동하세요.
                </p>
              </div>
              <Link href="/projects/new">
                <Button type="button" icon={<Plus className="h-4 w-4" aria-hidden />}>
                  새 프로젝트 생성
                </Button>
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <MetricCard
                icon={<FolderOpen className="h-5 w-5" aria-hidden />}
                label="참여 프로젝트"
                value={projects.length}
                caption="열려 있는 작업 공간"
                onClick={() => {
                  const el = document.getElementById("projects");
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 90;
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }
                }}
              />
              <MetricCard
                icon={<FileText className="h-5 w-5" aria-hidden />}
                label="AI 문서"
                value={aiDocumentCount}
                caption="생성된 산출물"
              />
              <MetricCard
                icon={<Users className="h-5 w-5" aria-hidden />}
                label="초대 대기"
                value={pendingInvitationCount}
                caption="응답이 필요한 멤버"
              />
            </div>
          </div>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#FF5A2D,#20A99A,#5865F2)]" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-lava-muted">Today</p>
                <h2 className="mt-2 text-xl font-black text-lava-text">오늘의 작업 신호</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-warmBg text-brand-primary">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <SignalRow label="전체 일정" value={`${scheduleItemCount}개`} tone="orange" />
              <SignalRow label="생성된 문서" value={`${aiDocumentCount}개`} tone="teal" />
              <SignalRow label="대기 중인 초대" value={`${pendingInvitationCount}건`} tone="red" />
            </div>
          </Card>
        </section>

        {error ? <ErrorAlert message={error} onRetry={() => setRetryTrigger((prev) => prev + 1)} /> : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
          <Card id="projects" className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-brand-primary" aria-hidden />
                  <h2 className="text-[22px] font-black leading-[30px] text-lava-text">프로젝트</h2>
                </div>
                <p className="mt-1 text-sm text-lava-secondary">최근 작업할 프로젝트를 빠르게 열 수 있습니다.</p>
              </div>
              <Link className="inline-flex items-center gap-1 text-sm font-black text-brand-primary hover:text-brand-primaryHover" href="/projects/new">
                추가
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            {isLoading ? <LoadingRows /> : null}

            {!isLoading && !projects.length ? (
              <div className="rounded-lg border border-dashed border-lava-borderStrong bg-lava-raised p-8 text-center">
                <p className="text-sm font-black text-lava-text">참여 중인 프로젝트가 없습니다.</p>
                <p className="mt-2 text-sm text-lava-secondary">새 프로젝트를 생성하면 이곳에 표시됩니다.</p>
              </div>
            ) : null}

            <div className="space-y-3">
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          </Card>

          <Card id="calendar" className="min-w-0">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-brand-primary" aria-hidden />
                  <h2 className="text-[22px] font-black leading-[30px] text-lava-text">전체 일정</h2>
                </div>
                <p className="mt-1 text-sm text-lava-secondary">프로젝트별 주요 일정을 월 단위로 봅니다.</p>
              </div>
              <Badge tone="gray">{scheduleItemCount} items</Badge>
            </div>
            <div className="lava-calendar overflow-hidden">
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

function MetricCard({
  icon,
  label,
  value,
  caption,
  onClick
}: {
  icon: ReactNode;
  label: string;
  value: number;
  caption: string;
  onClick?: () => void;
}) {
  const className = `lava-panel-subtle group rounded-lg p-4 text-left transition-all duration-200 ${
    onClick ? "hover:-translate-y-0.5 hover:border-brand-primary hover:bg-white hover:shadow-card" : ""
  }`;
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-lava-muted">{label}</p>
        <p className="mt-2 text-[30px] font-black leading-none text-lava-text">{value}</p>
        <p className="mt-2 text-xs font-semibold text-lava-secondary">{caption}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-warmBg text-brand-primary">
        {icon}
      </div>
    </div>
  );

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function SignalRow({ label, value, tone }: { label: string; value: string; tone: "orange" | "teal" | "red" }) {
  const tones = {
    orange: "bg-brand-primary",
    teal: "bg-lava-teal",
    red: "bg-brand-red"
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-lava-border bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${tones[tone]}`} />
        <span className="text-sm font-bold text-lava-secondary">{label}</span>
      </div>
      <span className="text-sm font-black text-lava-text">{value}</span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border border-lava-border bg-lava-raised p-4">
          <div className="h-4 w-44 animate-lava-pulse rounded bg-lava-border" />
          <div className="mt-4 h-3 w-72 max-w-full animate-lava-pulse rounded bg-lava-border" />
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  const documentProgress = Math.min(project.documentCount / 2, 1) * 100;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group grid gap-4 rounded-lg border border-lava-border bg-white px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-card md:grid-cols-[minmax(0,1fr)_180px_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[18px] font-black leading-[26px] text-lava-text">{project.name}</h3>
          <Badge tone={project.currentUserRole === "leader" ? "purple" : "gray"}>
            {project.currentUserRole === "leader" ? "리더" : "멤버"}
          </Badge>
          <Badge tone="warning">{project.type === "team" ? "팀" : "개인"}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-lava-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {project.startDate} ~ {project.endDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {project.memberCount}명 참여
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            문서 {project.documentCount}개 · 일정 {project.scheduleItemCount}개
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-lava-border md:w-32 md:flex-none">
          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${documentProgress}%` }} />
        </div>
        <span className="text-xs font-black text-lava-secondary">{project.documentCount}/2</span>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm font-black text-brand-primary">
        열기
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}

function getProjectColor(projectId: string): string {
  const index = Array.from(projectId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % projectColors.length;
  return projectColors[index] ?? "#FF5A2D";
}

function addOneDay(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
