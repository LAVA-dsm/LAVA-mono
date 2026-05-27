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
  Users
} from "lucide-react";
import type { EventInput } from "@fullcalendar/core";
import type { ProjectCalendarItem, ProjectListItem } from "@lava/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

const projectColors = ["#FF5A2D", "#7B61FF", "#5865F2", "#35B85A", "#F5A400", "#E6002D"];

export function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [calendarItems, setCalendarItems] = useState<ProjectCalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [router]);

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

  return (
    <AppShell
      title={
        <div>
          <p className="text-xs font-semibold uppercase text-brand-primary">Dashboard</p>
          <h1 className="text-xl font-bold text-lava-text">대시보드</h1>
        </div>
      }
      activeNav="dashboard"
    >
      <div className="mx-auto max-w-[1580px]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-bold leading-[38px] text-lava-text">진행 중인 프로젝트</h2>
            <p className="mt-2 text-sm leading-6 text-lava-secondary">참여 프로젝트와 전체 일정을 한 화면에서 확인합니다.</p>
          </div>
          <Link href="/projects/new">
            <Button type="button" icon={<Plus className="h-4 w-4" aria-hidden />}>
              새 프로젝트 생성
            </Button>
          </Link>
        </div>

        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <MetricCard icon={<FolderOpen className="h-5 w-5" aria-hidden />} label="참여 프로젝트" value={projects.length} />
          <MetricCard icon={<CalendarDays className="h-5 w-5" aria-hidden />} label="전체 일정 항목" value={scheduleItemCount} />
          <MetricCard icon={<Users className="h-5 w-5" aria-hidden />} label="응답 대기 초대" value={pendingInvitationCount} />
        </div>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
          <Card id="projects" className="shadow-none">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-brand-primary" aria-hidden />
                <h2 className="text-[22px] font-bold leading-[30px] text-lava-text">내 프로젝트</h2>
              </div>
              <Link className="text-sm font-semibold text-brand-primary" href="/projects/new">
                프로젝트 추가
              </Link>
            </div>

            {isLoading ? <p className="text-sm text-lava-secondary">프로젝트를 불러오는 중입니다.</p> : null}

            {!isLoading && !projects.length ? (
              <div className="rounded-lg border border-dashed border-lava-borderStrong bg-lava-app p-8 text-center">
                <p className="text-sm font-semibold text-lava-text">참여 중인 프로젝트가 없습니다.</p>
                <p className="mt-2 text-sm text-lava-secondary">새 프로젝트를 생성하면 이곳에 표시됩니다.</p>
              </div>
            ) : null}

            <div className="space-y-3">
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          </Card>

          <Card id="calendar" className="shadow-none">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-primary" aria-hidden />
              <h2 className="text-[22px] font-bold leading-[30px] text-lava-text">전체 일정</h2>
            </div>
            <div className="lava-calendar">
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

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="shadow-none">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-lava-secondary">{label}</p>
          <p className="mt-2 text-[28px] font-bold leading-[38px] text-lava-text">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-warmBg text-brand-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="grid gap-4 rounded-lg border border-lava-border px-4 py-4 transition hover:border-brand-primary md:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[18px] font-bold leading-[26px] text-lava-text">{project.name}</h3>
          <Badge tone={project.currentUserRole === "leader" ? "purple" : "gray"}>
            {project.currentUserRole === "leader" ? "리더" : "멤버"}
          </Badge>
          <Badge tone="warning">{project.type === "team" ? "팀" : "개인"}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-lava-secondary">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {project.startDate} ~ {project.endDate}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {project.memberCount}명 참여
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            문서 {project.documentCount}개 · 일정 {project.scheduleItemCount}개
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm font-semibold text-brand-primary">
        열기
        <ArrowRight className="h-4 w-4" aria-hidden />
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
