"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Plus, Trash2, X } from "lucide-react";
import type { AvailableTime, DayOfWeek, InvitationDetail, ParticipationInput } from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <main className="min-h-screen bg-lava-app px-6 py-12">
      <div className="mx-auto max-w-[760px]">
        <Card>
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-warmBg text-brand-primary">
              <CalendarPlus className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-[38px] text-lava-text">프로젝트 초대</h1>
              <p className="mt-2 text-sm leading-6 text-lava-secondary">
                초대를 수락하면 전공, 기술 스택, 참여 가능 시간이 일정 생성에 반영됩니다.
              </p>
            </div>
          </div>

          {isLoading ? <p className="text-sm text-lava-secondary">초대를 불러오는 중입니다.</p> : null}

          {error ? (
            <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
              {error}
            </div>
          ) : null}

          {invitation ? (
            <div className="mb-7 rounded-lg border border-lava-borderStrong p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-lava-secondary">초대 프로젝트</p>
                  <h2 className="mt-1 text-[22px] font-bold leading-[30px] text-lava-text">{invitation.projectName}</h2>
                </div>
                <Badge tone={invitation.status === "pending" ? "warning" : invitation.status === "accepted" ? "success" : "gray"}>
                  {formatStatus(invitation.status)}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-lava-secondary">초대 이메일: {invitation.email}</p>
            </div>
          ) : null}

          {invitation?.status === "pending" ? (
            <div className="space-y-5">
              <FieldWrapper label="전공">
                <Input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="예: 컴퓨터공학" />
              </FieldWrapper>
              <FieldWrapper label="기술 스택" hint="쉼표로 여러 개를 입력할 수 있습니다.">
                <Input
                  value={techStacksText}
                  onChange={(event) => setTechStacksText(event.target.value)}
                  placeholder="React, NestJS, PostgreSQL"
                />
              </FieldWrapper>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-lava-text">참여 가능 시간</span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-9 px-3"
                    onClick={() => setAvailableTimes((current) => [...current, defaultTime])}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    추가
                  </Button>
                </div>
                <div className="space-y-3">
                  {availableTimes.map((time, index) => (
                    <div key={`${time.dayOfWeek}-${index}`} className="grid gap-3 rounded-md border border-lava-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <select
                        className="h-11 rounded-md border border-lava-borderStrong bg-white px-3 text-sm text-lava-text"
                        value={time.dayOfWeek}
                        onChange={(event) => updateTime(index, "dayOfWeek", event.target.value as DayOfWeek)}
                      >
                        {dayOptions.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                      <Input type="time" value={time.startTime} onChange={(event) => updateTime(index, "startTime", event.target.value)} />
                      <Input type="time" value={time.endTime} onChange={(event) => updateTime(index, "endTime", event.target.value)} />
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 px-3 text-brand-red"
                        onClick={() => setAvailableTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={availableTimes.length === 1}
                        aria-label="참여 가능 시간 삭제"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 pt-4">
                <Button type="button" variant="danger" onClick={submitReject} disabled={isSubmitting} icon={<X className="h-4 w-4" />}>
                  초대 거부
                </Button>
                <Button type="button" onClick={submitAccept} disabled={isSubmitting} icon={<Check className="h-4 w-4" />}>
                  {isSubmitting ? "처리 중" : "초대 수락"}
                </Button>
              </div>
            </div>
          ) : null}
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
