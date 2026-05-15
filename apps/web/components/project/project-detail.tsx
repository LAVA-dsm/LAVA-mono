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
      const message = loadError instanceof Error ? loadError.message : "프로젝트를 불러오지 못했어요.";
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
        <span className="text-base font-semibold text-lava-secondary">
          내 프로젝트 <span className="px-2 text-lava-muted">›</span>
          <span className="text-lava-text">{project?.name || "프로젝트"}</span>
        </span>
      }
    >
      <div className="mx-auto max-w-[1580px]">
        {isLoading ? <p className="text-sm text-lava-secondary">프로젝트를 불러오는 중입니다.</p> : null}
        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}
        {project ? <ProjectContent project={project} onProjectChange={setProject} /> : null}
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
  const featureSpec = project.documents.find((document) => document.type === "feature_spec");
  const apiSpec = project.documents.find((document) => document.type === "api_spec");
  const isLeader = project.currentUserRole === "leader";

  return (
    <>
      <Card className="border-l-4 border-l-brand-primary">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-bold leading-[38px] text-lava-text">{project.name}</h1>
              <Badge tone="warning">진행중</Badge>
              <Badge tone="purple">{project.schedule ? "일정 생성 완료" : "일정 생성 대기"}</Badge>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-lava-secondary">
              {project.enhancedIdea || project.originalIdea}
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-lava-secondary">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" aria-hidden />
                {project.startDate} ~ {project.endDate}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                {project.type === "team" ? `${project.members.length}명 참여 · ${project.inviteCount}명 대기` : "개인 프로젝트"}
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden />
                AI 문서 {project.documents.length}/2 생성 완료
              </span>
            </div>
          </div>
        </div>
      </Card>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <DocumentsSection
            projectId={project.id}
            featureSpecUpdatedAt={featureSpec?.updatedAt}
            apiSpecUpdatedAt={apiSpec?.updatedAt}
          />
          <ScheduleSection project={project} onProjectChange={onProjectChange} />
        </div>
        <div className="space-y-6">
          <ParticipationSection project={project} onProjectChange={onProjectChange} />
          {isLeader ? <InvitationStatusSection project={project} /> : null}
        </div>
      </section>
    </>
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
      <div className="mb-5 flex items-center gap-2">
        <FileText className="h-5 w-5 text-brand-primary" aria-hidden />
        <h2 className="text-[22px] font-bold leading-[30px] text-lava-text">프로젝트 산출물 문서</h2>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <DocumentCard
          icon={<ListChecks className="h-7 w-7 text-lava-purple" aria-hidden />}
          title="기능 명세서"
          description="앱의 핵심 비즈니스 로직과 화면별 상세 기능 요구사항이 정리된 문서입니다."
          meta={featureSpecUpdatedAt ? `최근 수정: ${formatDate(featureSpecUpdatedAt)}` : "생성 대기"}
          label="Markdown"
          href={`/projects/${projectId}/documents/feature_spec`}
        />
        <DocumentCard
          icon={<FileText className="h-7 w-7 text-brand-primary" aria-hidden />}
          title="API 명세서"
          description="프론트엔드와 백엔드 통신을 위한 엔드포인트, Request/Response 규격이 정리된 문서입니다."
          meta={apiSpecUpdatedAt ? `최근 수정: ${formatDate(apiSpecUpdatedAt)}` : "생성 대기"}
          label="REST"
          href={`/projects/${projectId}/documents/api_spec`}
        />
        <DocumentCard
          icon={<CalendarCheck className="h-7 w-7 text-lava-success" aria-hidden />}
          title="개발 일정표"
          description="팀원 참여 정보를 반영해 역할 분담, 작업, 회의 일정을 날짜 단위로 관리합니다."
          meta="2차 스프린트"
          label="Calendar"
        />
      </div>
    </section>
  );
}

function DocumentCard({
  icon,
  title,
  description,
  meta,
  label,
  href
}: {
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
  label: string;
  href?: string;
}) {
  return (
    <Card className="shadow-none">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-brand-warmBg p-4">
        {icon}
      </div>
      <h3 className="text-[18px] font-bold leading-[26px] text-lava-text">{title}</h3>
      <p className="mt-3 min-h-12 text-sm leading-6 text-lava-secondary">{description}</p>
      <div className="mt-6 flex items-center justify-between border-t border-lava-border pt-4">
        <span className="text-xs text-lava-secondary">{meta}</span>
        <Badge>{label}</Badge>
      </div>
      {href ? (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-lava-borderStrong bg-white px-5 text-sm font-semibold text-lava-text transition hover:border-brand-primary hover:text-brand-primary"
        >
          열기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </Card>
  );
}

function ParticipationSection({
  project,
  onProjectChange
}: {
  project: ProjectSummary;
  onProjectChange: (project: ProjectSummary) => void;
}) {
  const myMember = project.members.find((member) => member.userId === project.currentUserId);
  const [major, setMajor] = useState(myMember?.major || "");
  const [techStacksText, setTechStacksText] = useState(myMember?.techStacks.join(", ") || "");
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>(
    myMember?.availableTimes.length ? myMember.availableTimes : [{ dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }]
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
    <Card>
      <h2 className="text-[18px] font-bold leading-[26px] text-lava-text">내 참여 정보</h2>
      <p className="mt-2 text-sm leading-6 text-lava-secondary">AI 일정 생성에 사용하는 기본 정보입니다.</p>
      {error ? <p className="mt-4 text-sm font-semibold text-brand-red">{error}</p> : null}
      <div className="mt-5 space-y-4">
        <FieldWrapper label="전공">
          <Input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="컴퓨터공학" />
        </FieldWrapper>
        <FieldWrapper label="기술 스택">
          <Input value={techStacksText} onChange={(event) => setTechStacksText(event.target.value)} placeholder="React, NestJS" />
        </FieldWrapper>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-lava-text">참여 가능 시간</span>
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 px-3"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setAvailableTimes((current) => [...current, { dayOfWeek: "mon", startTime: "19:00", endTime: "21:00" }])}
            >
              추가
            </Button>
          </div>
          <AvailabilityEditor availableTimes={availableTimes} onChange={setAvailableTimes} />
        </div>
        <Button type="button" className="w-full" onClick={save} disabled={isSaving} icon={<Save className="h-4 w-4" />}>
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
  const update = <Key extends keyof AvailableTime>(index: number, key: Key, value: AvailableTime[Key]) => {
    onChange(availableTimes.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  return (
    <div className="space-y-3">
      {availableTimes.map((time, index) => (
        <div key={`${time.dayOfWeek}-${index}`} className="grid gap-2 rounded-md border border-lava-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            className="h-11 rounded-md border border-lava-borderStrong bg-white px-3 text-sm text-lava-text"
            value={time.dayOfWeek}
            onChange={(event) => update(index, "dayOfWeek", event.target.value as DayOfWeek)}
          >
            {dayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <Input type="time" value={time.startTime} onChange={(event) => update(index, "startTime", event.target.value)} />
          <Input type="time" value={time.endTime} onChange={(event) => update(index, "endTime", event.target.value)} />
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 px-3 text-brand-red"
            onClick={() => onChange(availableTimes.filter((_, itemIndex) => itemIndex !== index))}
            disabled={availableTimes.length === 1}
            aria-label="참여 가능 시간 삭제"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}

function InvitationStatusSection({ project }: { project: ProjectSummary }) {
  return (
    <Card>
      <h2 className="text-[18px] font-bold leading-[26px] text-lava-text">초대 상태</h2>
      <div className="mt-5 space-y-3">
        {project.invitations.length ? (
          project.invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between gap-3 border-b border-lava-border pb-3 last:border-b-0 last:pb-0">
              <span className="truncate text-sm font-semibold text-lava-text">{invitation.email}</span>
              <Badge tone={invitation.status === "pending" ? "warning" : invitation.status === "accepted" ? "success" : "gray"}>
                {formatInvitationStatus(invitation.status)}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-lava-secondary">초대된 멤버가 없습니다.</p>
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
    () => project.members.filter((member) => member.status === "accepted"),
    [project.members]
  );

  const syncProjectSchedule = (nextSchedule: ProjectScheduleSummary) => {
    setSchedule(nextSchedule);
    setItems(nextSchedule.items);
    onProjectChange({ ...project, schedule: nextSchedule });
  };

  const generate = async () => {
    setIsBusy(true);
    setError(null);
    try {
      syncProjectSchedule(await apiClient.generateSchedule(project.id));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "일정 생성에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  const save = async () => {
    setIsBusy(true);
    setError(null);
    try {
      syncProjectSchedule(await apiClient.updateSchedule(project.id, { items }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "일정 저장에 실패했어요.");
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
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "AI 일정 수정에 실패했어요.");
    } finally {
      setIsBusy(false);
    }
  };

  const updateItem = <Key extends keyof ScheduleItemInput>(index: number, key: Key, value: ScheduleItemInput[Key]) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-brand-primary" aria-hidden />
          <h2 className="text-[22px] font-bold leading-[30px] text-lava-text">프로젝트 일정</h2>
        </div>
        {isLeader ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={generate} disabled={isBusy} icon={isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
              AI 일정 생성
            </Button>
            <Button type="button" variant="secondary" onClick={save} disabled={isBusy || !items.length} icon={<Save className="h-4 w-4" />}>
              일정 저장
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}

        {!items.length ? (
          <p className="text-sm leading-6 text-lava-secondary">생성된 일정이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id ?? index} className="rounded-lg border border-lava-border p-4">
                {isLeader ? (
                  <EditableScheduleItem
                    item={item}
                    members={acceptedMembers}
                    onChange={(key, value) => updateItem(index, key, value)}
                    onDelete={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />
                ) : (
                  <ReadOnlyScheduleItem item={item} members={acceptedMembers} />
                )}
              </div>
            ))}
          </div>
        )}

        {isLeader ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setItems((current) => [
                  ...current,
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
              icon={<Plus className="h-4 w-4" />}
            >
              일정 추가
            </Button>
          </div>
        ) : null}

        {isLeader && schedule ? (
          <div className="mt-8 border-t border-lava-border pt-5">
            <FieldWrapper label="AI 일정 수정 요청">
              <Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="예: 회의 일정을 주말 대신 평일 저녁으로 조정해줘." />
            </FieldWrapper>
            <Button type="button" className="mt-3" onClick={aiEdit} disabled={isBusy || !aiPrompt.trim()} icon={<Sparkles className="h-4 w-4" />}>
              AI로 일정 수정
            </Button>
          </div>
        ) : null}
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
    const nextAssignees = item.assigneeUserIds.includes(userId)
      ? item.assigneeUserIds.filter((assigneeId) => assigneeId !== userId)
      : [...item.assigneeUserIds, userId];
    onChange("assigneeUserIds", nextAssignees);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
        <Input value={item.title} onChange={(event) => onChange("title", event.target.value)} placeholder="일정 제목" />
        <select
          className="h-11 rounded-md border border-lava-borderStrong bg-white px-3 text-sm text-lava-text"
          value={item.type}
          onChange={(event) => onChange("type", event.target.value as ScheduleItemType)}
        >
          {scheduleTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="ghost" className="min-h-11 px-3 text-brand-red" onClick={onDelete} aria-label="일정 삭제">
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input type="date" value={item.startDate} onChange={(event) => onChange("startDate", event.target.value)} />
        <Input type="date" value={item.endDate} onChange={(event) => onChange("endDate", event.target.value)} />
      </div>
      <Textarea value={item.description} onChange={(event) => onChange("description", event.target.value)} placeholder="상세 설명" className="min-h-24" />
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <button
            key={member.userId}
            type="button"
            onClick={() => toggleAssignee(member.userId)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              item.assigneeUserIds.includes(member.userId)
                ? "bg-brand-warmBg text-brand-primary"
                : "bg-gray-100 text-lava-secondary"
            }`}
          >
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyScheduleItem({ item, members }: { item: ScheduleItemInput; members: ProjectMemberSummary[] }) {
  const assigneeNames = item.assigneeUserIds
    .map((userId) => members.find((member) => member.userId === userId)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-lava-text">{item.title}</h3>
        <Badge tone={item.type === "meeting" ? "warning" : item.type === "sprint" ? "purple" : "gray"}>
          {scheduleTypes.find((type) => type.value === item.type)?.label}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-lava-secondary">{item.description}</p>
      <p className="mt-3 text-xs text-lava-secondary">
        {item.startDate} ~ {item.endDate}
        {assigneeNames ? ` · ${assigneeNames}` : ""}
      </p>
    </div>
  );
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatInvitationStatus(status: ProjectSummary["invitations"][number]["status"]): string {
  const statusMap: Record<ProjectSummary["invitations"][number]["status"], string> = {
    pending: "응답 대기",
    accepted: "수락",
    rejected: "거부",
    expired: "만료"
  };
  return statusMap[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
