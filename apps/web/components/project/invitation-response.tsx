"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Plus, Trash2, X } from "lucide-react";
import type { AvailableTime, DayOfWeek, InvitationDetail, ParticipationInput } from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Input } from "@/components/ui/field";

const dayOptions: Array<{ value: DayOfWeek; label: string }> = [
  { value: "mon", label: "월요일" },
  { value: "tue", label: "화요일" },
  { value: "wed", label: "수요일" },
  { value: "thu", label: "목요일" },
  { value: "fri", label: "금요일" },
  { value: "sat", label: "토요일" },
  { value: "sun", label: "일요일" }
];

const defaultTime: AvailableTime = {
  dayOfWeek: "mon",
  startTime: "19:00",
  endTime: "21:00"
};

export function InvitationResponse({ token }: { token: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [major, setMajor] = useState("");
  const [techStacksText, setTechStacksText] = useState("");
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([defaultTime]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    apiClient
      .getInvitation(token)
      .then((data) => {
        if (alive) setInvitation(data);
      })
      .catch((loadError) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : "초대를 불러오지 못했어요.");
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const submitAccept = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: ParticipationInput = {
        major,
        techStacks: parseTechStacks(techStacksText),
        availableTimes
      };
      const project = await apiClient.acceptInvitation(token, payload);
      router.push(`/projects/${project.id}`);
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : "초대 수락에 실패했어요.";
      if (message.includes("로그인이 필요")) {
        router.push(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
        return;
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReject = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.rejectInvitation(token);
      setInvitation(result);
    } catch (rejectError) {
      const message = rejectError instanceof Error ? rejectError.message : "초대 거부에 실패했어요.";
      if (message.includes("로그인이 필요")) {
        router.push(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
        return;
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTime = <Key extends keyof AvailableTime>(index: number, key: Key, value: AvailableTime[Key]) => {
    setAvailableTimes((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  };

  return (
    <main className="min-h-screen bg-lava-app px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[680px]">
        <Card className="relative overflow-hidden pad-7 sm:pad-8">
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-warmBg text-brand-primary">
              <CalendarPlus className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-lava-text">
                프로젝트 초대
              </h1>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-lava-secondary">
                초대를 수락하면 전공, 기술 스택, 참여 가능 시간이 일정 생성에 반영됩니다.
              </p>
            </div>
          </div>

          {isLoading && (
            <p className="text-[13px] text-lava-muted">초대를 불러오는 중입니다.</p>
          )}
          {error && <ErrorAlert message={error} />}

          {invitation && (
            <div className="mb-6 rounded-xl border border-lava-border bg-lava-raised p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-lava-muted">
                    초대 프로젝트
                  </p>
                  <h2 className="mt-1.5 text-[18px] font-bold tracking-tight text-lava-text">
                    {invitation.projectName}
                  </h2>
                </div>
                <Badge
                  tone={
                    invitation.status === "pending"
                      ? "warning"
                      : invitation.status === "accepted"
                      ? "success"
                      : "gray"
                  }
                >
                  {formatStatus(invitation.status)}
                </Badge>
              </div>
              <p className="mt-3 text-[12.5px] text-lava-secondary">
                초대 이메일: {invitation.email}
              </p>
            </div>
          )}

          {invitation?.status === "pending" && (
            <div className="space-y-4">
              <FieldWrapper label="전공">
                <Input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="예: 컴퓨터공학"
                />
              </FieldWrapper>
              <FieldWrapper label="기술 스택" hint="쉼표로 여러 개를 입력할 수 있습니다.">
                <Input
                  value={techStacksText}
                  onChange={(e) => setTechStacksText(e.target.value)}
                  placeholder="React, NestJS, PostgreSQL"
                />
              </FieldWrapper>

              <div>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-lava-text">참여 가능 시간</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAvailableTimes((cur) => [...cur, defaultTime])}
                    icon={<Plus className="h-3.5 w-3.5" />}
                  >
                    추가
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {availableTimes.map((time, index) => (
                    <div
                      key={`${time.dayOfWeek}-${index}`}
                      className="grid gap-2 rounded-xl border border-lava-border bg-lava-raised p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <select
                        className="h-10 rounded-[10px] border border-lava-borderStrong bg-lava-surface px-3 text-[13px] text-lava-text shadow-sm focus:border-brand-primary focus:outline-none"
                        value={time.dayOfWeek}
                        onChange={(e) =>
                          updateTime(index, "dayOfWeek", e.target.value as DayOfWeek)
                        }
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
                        onChange={(e) => updateTime(index, "startTime", e.target.value)}
                      />
                      <Input
                        type="time"
                        value={time.endTime}
                        onChange={(e) => updateTime(index, "endTime", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 px-2.5 text-brand-red hover:bg-[rgb(var(--c-red)/0.12)]"
                        onClick={() =>
                          setAvailableTimes((cur) => cur.filter((_, i) => i !== index))
                        }
                        disabled={availableTimes.length === 1}
                        aria-label="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 border-t border-lava-border pt-5">
                <Button
                  type="button"
                  variant="danger"
                  onClick={submitReject}
                  disabled={isSubmitting}
                  icon={<X className="h-4 w-4" />}
                >
                  초대 거부
                </Button>
                <Button
                  type="button"
                  onClick={submitAccept}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  icon={!isSubmitting ? <Check className="h-4 w-4" /> : undefined}
                >
                  {isSubmitting ? "처리 중" : "초대 수락"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function parseTechStacks(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatStatus(status: InvitationDetail["status"]): string {
  const statusMap: Record<InvitationDetail["status"], string> = {
    pending: "응답 대기",
    accepted: "수락 완료",
    rejected: "거부 완료",
    expired: "만료"
  };
  return statusMap[status];
}
