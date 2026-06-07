"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Clock3,
  FileText,
  ListChecks,
  Loader2,
  LogOut,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import type {
  AvailableTime,
  DayOfWeek,
  ProjectMemberSummary,
  ProjectScheduleSummary,
  ProjectSummary,
  ScheduleItemInput,
  ScheduleItemType
} from "@lava/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldWrapper, Input, Textarea } from "@/components/ui/field";
import { apiClient } from "@/lib/api-client";

const dayOptions: Array<{ value: DayOfWeek; label: string }> = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" }
];

const scheduleTypes: Array<{ value: ScheduleItemType; label: string }> = [
  { value: "task", label: "작업" },
  { value: "sprint", label: "스프린트" },
  { value: "meeting", label: "회의" }
];

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getProject(projectId);
      setProject(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "프로젝트를 불러오지 못했어요.";
      if (message.includes("로그인이 필요")) {
        router.push(`/login?next=${encodeURIComponent(`/projects/${projectId}`)}`);
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  return (
    <AppShell
      title={
        <span className="flex items-center gap-1.5 text-[14px]">
          <Link href="/" className="font-medium text-lava-muted transition-colors hover:text-lava-text">
            대시보드
          </Link>
          <span className="text-lava-border">/</span>
          <span className="font-semibold text-lava-text">
            {project?.name ?? "프로젝트"}
          </span>
        </span>
      }
    >
      <div className="mx-auto max-w-[1580px]">
        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-[13px] text-lava-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            프로젝트를 불러오는 중입니다.
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[rgb(var(--c-red)/0.22)] bg-[rgb(var(--c-red)/0.10)] px-4 py-3 text-[13px] font-medium text-brand-red"
          >
            {error}
          </div>
        )}
        {project && (
          <ProjectContent project={project} onProjectChange={setProject} />
        )}
      </div>
    </AppShell>
  );
}

function ProjectContent({
  project,
  onProjectChange
}: {
  project: ProjectSummary;
  onProjectChange: (project: ProjectSummary) => void;
}) {
  const featureSpec = project.documents.find((d) => d.type === "feature_spec");
  const apiSpec = project.documents.find((d) => d.type === "api_spec");
  const isLeader = project.currentUserRole === "leader";

  return (
    <>
      {/* ── Project Header ────────────────────────────── */}
      <Card className="relative overflow-hidden pad-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-lava-text sm:text-[28px]">
                {project.name}
              </h1>
              <Badge tone={project.schedule ? "success" : "gray"}>
                {project.schedule ? "일정 생성 완료" : "일정 생성 대기"}
              </Badge>
            </div>
            <p className="lava-text-balance mt-3 max-w-3xl text-[13.5px] leading-[1.65] text-lava-secondary">
              {project.enhancedIdea || project.originalIdea}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <InfoChip icon={<Clock3 className="h-3.5 w-3.5" />}>
                {project.startDate} ~ {project.endDate}
              </InfoChip>
              <InfoChip icon={<Users className="h-3.5 w-3.5" />}>
                {project.type === "team"
                  ? `${project.members.length}명 참여 · ${project.inviteCount}명 대기`
                  : "개인 프로젝트"}
              </InfoChip>
              <InfoChip icon={<FileText className="h-3.5 w-3.5" />}>
                AI 문서 {project.documents.length}/2 생성 완료
              </InfoChip>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Content Grid ──────────────────────────────── */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <DocumentsSection
            projectId={project.id}
            featureSpecUpdatedAt={featureSpec?.updatedAt}
            apiSpecUpdatedAt={apiSpec?.updatedAt}
          />
          <ScheduleSection project={project} onProjectChange={onProjectChange} />
        </div>
        <div className="space-y-5">
          <ParticipationSection project={project} onProjectChange={onProjectChange} />
          {isLeader && <InvitationStatusSection project={project} />}
          <ProjectManagementSection project={project} />
        </div>
      </section>
    </>
  );
}

function InfoChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-lava-border bg-lava-raised px-3 py-1.5 text-[12.5px] font-medium text-lava-secondary">
      <span className="text-lava-muted">{icon}</span>
      {children}
    </span>
  );
}

function DocumentsSection({
  projectId,
  featureSpecUpdatedAt,
  apiSpecUpdatedAt
}: {
  projectId: string;
  featureSpecUpdatedAt?: string;
  apiSpecUpdatedAt?: string;
}) {
  return (
    <section>
      <SectionHeader
        icon={<FileText className="h-4 w-4" />}
        title="프로젝트 산출물 문서"
        description="AI 초안을 열고 바로 편집할 수 있습니다."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <DocumentCard
          icon={<ListChecks className="h-6 w-6 text-lava-purple" />}
          iconBg="bg-[rgb(var(--c-purple)/0.12)]"
          title="기능 명세서"
          description="핵심 비즈니스 로직과 화면별 상세 기능 요구사항이 정리된 문서입니다."
          meta={featureSpecUpdatedAt ? `최근 수정 ${formatDate(featureSpecUpdatedAt)}` : "생성 대기"}
          label="Markdown"
          href={`/projects/${projectId}/documents/feature_spec`}
        />
        <DocumentCard
          icon={<FileText className="h-6 w-6 text-brand-primary" />}
          iconBg="bg-[rgb(var(--c-brand)/0.12)]"
          title="API 명세서"
          description="엔드포인트와 Request / Response 규격이 정리된 REST API 문서입니다."
          meta={apiSpecUpdatedAt ? `최근 수정 ${formatDate(apiSpecUpdatedAt)}` : "생성 대기"}
          label="REST"
          href={`/projects/${projectId}/documents/api_spec`}
        />
        <DocumentCard
          icon={<CalendarCheck className="h-6 w-6 text-lava-success" />}
          iconBg="bg-[rgb(var(--c-success)/0.12)]"
          title="개발 일정표"
          description="팀원 참여 정보를 반영해 역할 분담과 작업 일정을 날짜 단위로 관리합니다."
          meta="일정 섹션에서 관리"
          label="Calendar"
        />
      </div>
    </section>
  );
}

function DocumentCard({
  icon,
  iconBg,
  title,
  description,
  meta,
  label,
  href
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  meta: string;
  label: string;
  href?: string;
}) {
  return (
    <Card className="group flex min-h-[260px] flex-col overflow-hidden p-5 transition-colors duration-150 hover:border-lava-borderStrong">
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <h3 className="text-[15px] font-bold tracking-tight text-lava-text">{title}</h3>
      <p className="mt-2 flex-1 text-[12.5px] leading-[1.6] text-lava-secondary">
        {description}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-lava-border pt-4">
        <span className="text-[11.5px] text-lava-muted">{meta}</span>
        <Badge>{label}</Badge>
      </div>
      {href && (
        <Link
          href={href}
          className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-lava-borderStrong bg-lava-surface text-[13px] font-semibold text-lava-text transition-all hover:border-brand-primary/50 hover:text-brand-primary"
        >
          문서 열기
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </Card>
  );
}

function SectionHeader({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lava-raised text-lava-secondary">
        {icon}
      </div>
      <div>
        <h2 className="text-[16px] font-bold tracking-tight text-lava-text">{title}</h2>
        {description && (
          <p className="mt-[1px] text-[12px] text-lava-muted">{description}</p>
        )}
      </div>
    </div>
  );
}

function ParticipationSection({
  project,
  onProjectChange
}: {
  project: ProjectSummary;
  onProjectChange: (project: ProjectSummary) => void;
}) {
  const myMember = project.members.find((m) => m.userId === project.currentUserId);
  const [major, setMajor] = useState(myMember?.major || "");
  const [techStacksText, setTechStacksText] = useState(myMember?.techStacks.join(", ") || "");
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>(
    myMember?.availableTimes.length
      ? myMember.availableTimes
      : [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateMyParticipation(project.id, {
        major,
        techStacks: parseCommaList(techStacksText),
        availableTimes
      });
      onProjectChange(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "참여 정보 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold tracking-tight text-lava-text">내 참여 정보</h2>
      <p className="mt-1 text-[12.5px] text-lava-secondary">
        AI 일정 생성에 사용하는 기본 정보입니다.
      </p>
      {error && (
        <p className="mt-3 text-[12.5px] font-medium text-brand-red">{error}</p>
      )}
      <div className="mt-4 space-y-4">
        <FieldWrapper label="전공">
          <Input
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="컴퓨터공학"
          />
        </FieldWrapper>
        <FieldWrapper label="기술 스택">
          <Input
            value={techStacksText}
            onChange={(e) => setTechStacksText(e.target.value)}
            placeholder="React, NestJS, TypeScript"
          />
        </FieldWrapper>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-lava-text">참여 가능 시간</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() =>
                setAvailableTimes((cur) => [
                  ...cur,
                  { dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }
                ])
              }
            >
              추가
            </Button>
          </div>
          <AvailabilityEditor
            availableTimes={availableTimes}
            onChange={setAvailableTimes}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={save}
          disabled={isSaving}
          loading={isSaving}
          icon={<Save className="h-4 w-4" />}
        >
          {isSaving ? "저장 중" : "참여 정보 저장"}
        </Button>
      </div>
    </Card>
  );
}

function AvailabilityEditor({
  availableTimes,
  onChange
}: {
  availableTimes: AvailableTime[];
  onChange: (value: AvailableTime[]) => void;
}) {
  const update = <Key extends keyof AvailableTime>(
    index: number,
    key: Key,
    value: AvailableTime[Key]
  ) => {
    onChange(
      availableTimes.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  return (
    <div className="space-y-2.5">
      {availableTimes.map((time, index) => (
        <div
          key={`${time.dayOfWeek}-${index}`}
          className="grid gap-2 rounded-xl border border-lava-border bg-lava-raised p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <select
            className="h-10 rounded-[10px] border border-lava-borderStrong bg-lava-surface px-3 text-[13px] text-lava-text shadow-sm focus:border-brand-primary focus:outline-none"
            value={time.dayOfWeek}
            onChange={(e) => update(index, "dayOfWeek", e.target.value as DayOfWeek)}
          >
            {dayOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <Input
            type="time"
            value={time.startTime}
            onChange={(e) => update(index, "startTime", e.target.value)}
          />
          <Input
            type="time"
            value={time.endTime}
            onChange={(e) => update(index, "endTime", e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 px-2.5 text-brand-red hover:bg-[rgb(var(--c-red)/0.12)]"
            onClick={() => onChange(availableTimes.filter((_, i) => i !== index))}
            disabled={availableTimes.length === 1}
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}

function InvitationStatusSection({ project }: { project: ProjectSummary }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold tracking-tight text-lava-text">초대 상태</h2>
      <div className="mt-4 space-y-2.5">
        {project.invitations.length ? (
          project.invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-lava-border bg-lava-surface px-3 py-2.5"
            >
              <span className="truncate text-[13px] font-medium text-lava-text">
                {inv.email}
              </span>
              <Badge
                tone={
                  inv.status === "pending"
                    ? "warning"
                    : inv.status === "accepted"
                    ? "success"
                    : "gray"
                }
              >
                {formatInvitationStatus(inv.status)}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-[12.5px] text-lava-muted">초대된 멤버가 없습니다.</p>
        )}
      </div>
    </Card>
  );
}

function ProjectManagementSection({ project }: { project: ProjectSummary }) {
  const router = useRouter();
  const isLeader = project.currentUserRole === "leader";
  const newLeaderCandidates = project.members.filter(
    (m) => m.status === "accepted" && m.userId !== project.currentUserId
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [newLeaderUserId, setNewLeaderUserId] = useState(
    newLeaderCandidates[0]?.userId || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const deleteProject = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await apiClient.deleteProject(project.id);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "프로젝트 삭제에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  const leaveProject = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await apiClient.leaveProject(project.id, isLeader ? { newLeaderUserId } : {});
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "프로젝트 탈퇴에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold tracking-tight text-lava-text">프로젝트 관리</h2>
      <p className="mt-1 text-[12.5px] text-lava-secondary">
        삭제와 탈퇴는 프로젝트 접근 권한에 바로 영향을 줍니다.
      </p>
      {error && (
        <p className="mt-3 text-[12.5px] font-medium text-brand-red">{error}</p>
      )}

      <div className="mt-4 space-y-3">
        {/* Leave */}
        <div className="rounded-xl border border-lava-border bg-lava-raised p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-lava-text">프로젝트 나가기</p>
              <p className="mt-0.5 text-[12px] text-lava-muted">
                {isLeader
                  ? "새 리더를 지정한 뒤 나갈 수 있습니다."
                  : "나가면 내 프로젝트 목록에서 사라집니다."}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-brand-red"
              onClick={() => setShowLeaveConfirm((v) => !v)}
              icon={<LogOut className="h-3.5 w-3.5" />}
            >
              나가기
            </Button>
          </div>
          {showLeaveConfirm && (
            <div className="mt-4 space-y-3 border-t border-lava-border pt-4">
              {isLeader && (
                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-lava-text">
                    새 리더
                  </label>
                  <select
                    className="h-10 w-full rounded-[10px] border border-lava-borderStrong bg-lava-surface px-3 text-[13px] text-lava-text shadow-sm focus:border-brand-primary focus:outline-none"
                    value={newLeaderUserId}
                    onChange={(e) => setNewLeaderUserId(e.target.value)}
                  >
                    {newLeaderCandidates.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                  {!newLeaderCandidates.length && (
                    <p className="mt-2 text-[12px] font-medium text-brand-red">
                      참여 중인 다른 멤버가 없어 리더 탈퇴를 진행할 수 없습니다.
                    </p>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={leaveProject}
                disabled={isBusy || (isLeader && !newLeaderUserId)}
                loading={isBusy}
              >
                {isBusy ? "처리 중" : "나가기 확인"}
              </Button>
            </div>
          )}
        </div>

        {/* Delete (leader only) */}
        {isLeader && (
          <div className="rounded-xl border border-[rgb(var(--c-red)/0.22)] bg-[rgb(var(--c-red)/0.10)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-brand-red">프로젝트 삭제</p>
                <p className="mt-0.5 text-[12px] text-brand-red/70">
                  삭제한 프로젝트는 복구할 수 없습니다.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm((v) => !v)}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                삭제
              </Button>
            </div>
            {showDeleteConfirm && (
              <div className="mt-4 border-t border-[rgb(var(--c-red)/0.22)] pt-4">
                <p className="mb-3 text-[13px] font-semibold text-brand-red">
                  정말 삭제하시겠어요?
                </p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={deleteProject}
                  disabled={isBusy}
                  loading={isBusy}
                >
                  {isBusy ? "삭제 중" : "삭제 확인"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ScheduleSection({
  project,
  onProjectChange
}: {
  project: ProjectSummary;
  onProjectChange: (project: ProjectSummary) => void;
}) {
  const isLeader = project.currentUserRole === "leader";
  const [schedule, setSchedule] = useState<ProjectScheduleSummary | null>(project.schedule);
  const [items, setItems] = useState<ScheduleItemInput[]>(project.schedule?.items ?? []);
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setSchedule(project.schedule);
    setItems(project.schedule?.items ?? []);
  }, [project.schedule]);

  const acceptedMembers = useMemo(
    () => project.members.filter((m) => m.status === "accepted"),
    [project.members]
  );

  const syncProjectSchedule = (next: ProjectScheduleSummary) => {
    setSchedule(next);
    setItems(next.items);
    onProjectChange({ ...project, schedule: next });
  };

  const generate = async () => {
    setIsBusy(true);
    setError(null);
    try {
      syncProjectSchedule(await apiClient.generateSchedule(project.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "일정 생성에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  const save = async () => {
    setIsBusy(true);
    setError(null);
    try {
      syncProjectSchedule(await apiClient.updateSchedule(project.id, { items }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "일정 저장에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  const aiEdit = async () => {
    if (!aiPrompt.trim()) {
      setError("AI 일정 수정 요청을 입력해 주세요.");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      syncProjectSchedule(await apiClient.editScheduleWithAi(project.id, { prompt: aiPrompt }));
      setAiPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 일정 수정에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  const updateItem = <Key extends keyof ScheduleItemInput>(
    index: number,
    key: Key,
    value: ScheduleItemInput[Key]
  ) => {
    setItems((cur) =>
      cur.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          icon={<CalendarCheck className="h-4 w-4" />}
          title="프로젝트 일정"
          description="AI로 일정을 자동 생성하거나 직접 편집할 수 있습니다."
        />
        {isLeader && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={generate}
              disabled={isBusy}
              loading={isBusy}
              icon={!isBusy ? <Sparkles className="h-3.5 w-3.5" /> : undefined}
            >
              AI 일정 생성
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={save}
              disabled={isBusy || !items.length}
              icon={<Save className="h-3.5 w-3.5" />}
            >
              저장
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden p-5">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[rgb(var(--c-red)/0.22)] bg-[rgb(var(--c-red)/0.10)] px-4 py-3 text-[13px] font-medium text-brand-red"
          >
            {error}
          </div>
        )}

        {!items.length ? (
          <div className="py-6 text-center">
            <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-lava-muted" />
            <p className="text-[13.5px] font-semibold text-lava-text">
              생성된 일정이 없습니다.
            </p>
            <p className="mt-1.5 text-[12.5px] text-lava-muted">
              AI 일정 생성 버튼을 눌러 자동으로 일정을 만들어 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id ?? index}
                className="rounded-xl border border-lava-border bg-lava-surface p-4"
              >
                {isLeader ? (
                  <EditableScheduleItem
                    item={item}
                    members={acceptedMembers}
                    onChange={(key, value) => updateItem(index, key, value)}
                    onDelete={() =>
                      setItems((cur) => cur.filter((_, i) => i !== index))
                    }
                  />
                ) : (
                  <ReadOnlyScheduleItem item={item} members={acceptedMembers} />
                )}
              </div>
            ))}
          </div>
        )}

        {isLeader && (
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setItems((cur) => [
                  ...cur,
                  {
                    title: "",
                    type: "task",
                    description: "",
                    assigneeUserIds: [],
                    startDate: project.startDate,
                    endDate: project.startDate
                  }
                ])
              }
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              일정 추가
            </Button>
          </div>
        )}

        {isLeader && schedule && (
          <div className="mt-6 rounded-xl border border-lava-border bg-lava-raised p-4">
            <p className="mb-3 text-[13px] font-semibold text-lava-text">AI 일정 수정 요청</p>
            <FieldWrapper label="" hint="예: 회의 일정을 주말 대신 평일 저녁으로 조정해줘.">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="어떻게 일정을 조정할까요?"
                className="min-h-[80px]"
              />
            </FieldWrapper>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={aiEdit}
              disabled={isBusy || !aiPrompt.trim()}
              loading={isBusy}
              icon={!isBusy ? <Sparkles className="h-3.5 w-3.5" /> : undefined}
            >
              AI로 일정 수정
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}

function EditableScheduleItem({
  item,
  members,
  onChange,
  onDelete
}: {
  item: ScheduleItemInput;
  members: ProjectMemberSummary[];
  onChange: <Key extends keyof ScheduleItemInput>(key: Key, value: ScheduleItemInput[Key]) => void;
  onDelete: () => void;
}) {
  const toggleAssignee = (userId: string) => {
    const next = item.assigneeUserIds.includes(userId)
      ? item.assigneeUserIds.filter((id) => id !== userId)
      : [...item.assigneeUserIds, userId];
    onChange("assigneeUserIds", next);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 md:grid-cols-[1fr_140px_auto]">
        <Input
          value={item.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="일정 제목"
        />
        <select
          className="h-10 rounded-[10px] border border-lava-borderStrong bg-lava-surface px-3 text-[13px] text-lava-text shadow-sm focus:border-brand-primary focus:outline-none"
          value={item.type}
          onChange={(e) => onChange("type", e.target.value as ScheduleItemType)}
        >
          {scheduleTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 px-2.5 text-brand-red hover:bg-[rgb(var(--c-red)/0.12)]"
          onClick={onDelete}
          aria-label="일정 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        <Input
          type="date"
          value={item.startDate}
          onChange={(e) => onChange("startDate", e.target.value)}
        />
        <Input
          type="date"
          value={item.endDate}
          onChange={(e) => onChange("endDate", e.target.value)}
        />
      </div>
      <Textarea
        value={item.description}
        onChange={(e) => onChange("description", e.target.value)}
        placeholder="상세 설명"
        className="min-h-[80px]"
      />
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => toggleAssignee(member.userId)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-100",
                item.assigneeUserIds.includes(member.userId)
                  ? "border-brand-primary/30 bg-brand-warmBg text-brand-primary"
                  : "border-lava-border bg-lava-raised text-lava-secondary hover:border-lava-borderStrong hover:text-lava-text"
              ].join(" ")}
            >
              {member.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadOnlyScheduleItem({
  item,
  members
}: {
  item: ScheduleItemInput;
  members: ProjectMemberSummary[];
}) {
  const assigneeNames = item.assigneeUserIds
    .map((id) => members.find((m) => m.userId === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-lava-text">{item.title}</h3>
        <Badge
          tone={
            item.type === "meeting"
              ? "warning"
              : item.type === "sprint"
              ? "purple"
              : "gray"
          }
        >
          {scheduleTypes.find((t) => t.value === item.type)?.label}
        </Badge>
      </div>
      <p className="mt-2 text-[12.5px] leading-[1.6] text-lava-secondary">
        {item.description}
      </p>
      <p className="mt-2.5 text-[12px] text-lava-muted">
        {item.startDate} ~ {item.endDate}
        {assigneeNames ? ` · ${assigneeNames}` : ""}
      </p>
    </div>
  );
}

/* ── Utilities ───────────────────────────────────────── */

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatInvitationStatus(
  status: ProjectSummary["invitations"][number]["status"]
): string {
  const map: Record<typeof status, string> = {
    pending: "응답 대기",
    accepted: "수락",
    rejected: "거부",
    expired: "만료"
  };
  return map[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
