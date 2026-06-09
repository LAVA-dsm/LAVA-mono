"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  Rocket,
  Sparkles
} from "lucide-react";
import {
  PROJECT_IDEA_MIN_LENGTH,
  projectCreateInputSchema,
  type ProjectCreateInput,
  type ProjectType
} from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Input, Textarea } from "@/components/ui/field";

type WizardStep = 0 | 1 | 2 | 3;

type FormState = {
  name: string;
  type: ProjectType;
  originalIdea: string;
  enhancedIdea: string;
  ideaEnhancementUsed: boolean;
  startDate: string;
  endDate: string;
  inviteEmailsText: string;
};

const steps = ["기본 정보", "멤버 초대", "AI 명세 생성", "최종 확인"];

const getTodayString = () => new Date().toISOString().slice(0, 10);
const getOneMonthLaterString = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const initialState: FormState = {
  name: "",
  type: "team",
  originalIdea: "",
  enhancedIdea: "",
  ideaEnhancementUsed: false,
  startDate: getTodayString(),
  endDate: getOneMonthLaterString(),
  inviteEmailsText: ""
};

function parseInviteEmails(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatValidationError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ message: string }> }).issues;
    return issues?.[0]?.message ?? "입력 값을 확인해 주세요.";
  }
  if (error instanceof Error) return error.message;
  return "프로젝트 생성에 실패했어요.";
}

export function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const inviteEmails = useMemo(
    () => parseInviteEmails(form.inviteEmailsText),
    [form.inviteEmailsText]
  );
  const isPersonal = form.type === "personal";
  const ideaLength = form.originalIdea.length;

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setError(null);
    setForm((cur) => ({ ...cur, [key]: value }));
  };

  const nextStep = () => {
    setError(null);
    try {
      if (step === 0) buildPayload();
      if (step === 1 && form.type === "team") buildPayload();
    } catch (validationError) {
      setError(formatValidationError(validationError));
      return;
    }
    setStep((cur) => {
      if (cur === 0 && form.type === "personal") return 2;
      return Math.min(cur + 1, 3) as WizardStep;
    });
  };

  const previousStep = () => {
    setStep((cur) => {
      if (cur === 2 && form.type === "personal") return 0;
      return Math.max(cur - 1, 0) as WizardStep;
    });
  };

  const buildPayload = (): ProjectCreateInput => {
    const parsed = projectCreateInputSchema.safeParse({
      name: form.name,
      type: form.type,
      originalIdea: form.originalIdea,
      enhancedIdea: form.ideaEnhancementUsed ? form.enhancedIdea : undefined,
      ideaEnhancementUsed: form.ideaEnhancementUsed,
      startDate: form.startDate,
      endDate: form.endDate,
      inviteEmails
    });
    if (!parsed.success) throw parsed.error;
    return parsed.data;
  };

  const enhanceIdea = async () => {
    setIsEnhancing(true);
    setError(null);
    try {
      if (!form.name.trim()) {
        setError("프로젝트 이름을 입력해 주세요.");
        return;
      }
      if (!form.startDate || !form.endDate) {
        setError("시작일과 종료일을 입력해 주세요.");
        return;
      }
      if (!form.originalIdea.trim()) {
        setError("아이디어를 입력해 주세요.");
        return;
      }
      const response = await apiClient.enhanceIdea({
        name: form.name,
        type: form.type,
        originalIdea: form.originalIdea,
        startDate: form.startDate,
        endDate: form.endDate
      });
      setForm((cur) => ({
        ...cur,
        enhancedIdea: response.enhancedIdea,
        ideaEnhancementUsed: true
      }));
    } catch (enhanceError) {
      const message =
        enhanceError instanceof Error
          ? enhanceError.message
          : "AI 아이디어 증강에 실패했어요.";
      if (message.includes("로그인이 필요")) {
        router.push(`/login?next=${encodeURIComponent("/projects/new")}`);
        return;
      }
      setError(message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const createProject = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const payload = buildPayload();
      const project = await apiClient.createProject(payload);
      router.refresh();
      router.push(`/projects/${project.id}`);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? formatValidationError(createError)
          : "프로젝트 생성에 실패했어요.";
      if (message.includes("로그인이 필요")) {
        router.push(`/login?next=${encodeURIComponent("/projects/new")}`);
        return;
      }
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Wizard header ─────────────────────────────── */}
      <Card className="relative overflow-hidden sm:pad-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-lava-text sm:text-[26px]">
              새 프로젝트 생성
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-[1.65] text-lava-secondary">
              아이디어, 참여자, 기간을 입력하면 LAVA AI가 기능 명세서와 API 명세서 초안을 자동 생성합니다.
            </p>
          </div>
          <Badge tone={form.ideaEnhancementUsed ? "success" : "gray"}>
            {form.ideaEnhancementUsed ? "AI 증강 완료" : "초안 작성 중"}
          </Badge>
        </div>
        <Stepper step={step} projectType={form.type} />
      </Card>

      {/* ── Main content ──────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 p-6">
          {error && <ErrorAlert className="mb-5" message={error} />}

          {/* Step 0: Basic info */}
          {step === 0 && (
            <section>
              <WizardSectionHeader
                icon={<Sparkles className="h-4 w-4" aria-hidden />}
                eyebrow="Step 1"
                title="프로젝트 기본 정보"
                description="프로젝트의 목표와 기간을 먼저 정리합니다."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <FieldWrapper label="프로젝트 이름" hint="1자 이상 24자 이하">
                  <Input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="예: 포트폴리오용 금융앱 구축"
                  />
                </FieldWrapper>
                <FieldWrapper label="프로젝트 유형">
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["team", "personal"] as ProjectType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField("type", type)}
                        className={[
                          "h-10 rounded-[10px] border text-[13px] font-semibold transition-all duration-150",
                          form.type === type
                            ? "border-brand-primary/40 bg-brand-warmBg text-brand-primary shadow-[inset_0_0_0_1px_rgba(255,90,45,0.12)]"
                            : "border-lava-borderStrong bg-lava-surface text-lava-text hover:border-lava-secondary/40 hover:text-lava-text"
                        ].join(" ")}
                      >
                        {type === "team" ? "팀 프로젝트" : "개인 프로젝트"}
                      </button>
                    ))}
                  </div>
                </FieldWrapper>
                <FieldWrapper label="시작일">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker(); } catch {}
                    }}
                    className="cursor-pointer"
                  />
                </FieldWrapper>
                <FieldWrapper label="종료일" hint="최대 365일까지 가능합니다.">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker(); } catch {}
                    }}
                    className="cursor-pointer"
                  />
                </FieldWrapper>
              </div>
              <div className="mt-4">
                <FieldWrapper
                  label="프로젝트 아이디어"
                  hint={`${form.ideaEnhancementUsed ? form.enhancedIdea.length : ideaLength} / ${PROJECT_IDEA_MIN_LENGTH}자 이상 권장`}
                >
                  <Textarea
                    value={form.ideaEnhancementUsed ? form.enhancedIdea : form.originalIdea}
                    onChange={(e) => {
                      if (form.ideaEnhancementUsed) {
                        updateField("enhancedIdea", e.target.value);
                      } else {
                        updateField("originalIdea", e.target.value);
                      }
                    }}
                    placeholder="어떤 문제를 해결하고 싶은지, 누가 사용할지, 꼭 들어가야 할 기능을 자세히 적어주세요."
                    className="min-h-[200px]"
                  />
                </FieldWrapper>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={enhanceIdea}
                  disabled={form.ideaEnhancementUsed || isEnhancing}
                  loading={isEnhancing}
                  icon={!isEnhancing ? <Sparkles className="h-3.5 w-3.5" /> : undefined}
                >
                  {form.ideaEnhancementUsed ? "AI 증강 완료" : "AI 아이디어 증강"}
                </Button>
                <span className="text-[12px] text-lava-muted">
                  프로젝트 생성 중 1회만 사용 가능합니다.
                </span>
              </div>
              {form.ideaEnhancementUsed && (
                <div className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-warmBg px-4 py-3 text-[12.5px] font-medium text-lava-secondary">
                  <p className="mb-1.5">
                    AI가 아이디어를 현재 입력값에 반영했습니다. 위 텍스트 영역의 내용이 생성에 사용됩니다.
                  </p>
                  <details className="mt-2 text-[11.5px] text-lava-secondary">
                    <summary className="cursor-pointer font-semibold hover:text-brand-primary select-none">
                      내가 작성한 원본 아이디어 보기
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-lava-surface p-3 border border-lava-border font-normal text-lava-text leading-relaxed">
                      {form.originalIdea}
                    </p>
                  </details>
                </div>
              )}
            </section>
          )}

          {/* Step 1: Team invite */}
          {step === 1 && (
            <section>
              <WizardSectionHeader
                icon={<Mail className="h-4 w-4" aria-hidden />}
                eyebrow="Step 2"
                title="팀원 이메일 초대"
                description="초대할 팀원이 없다면 비워 둔 채 다음 단계로 이동할 수 있습니다."
              />
              <FieldWrapper
                label="초대 이메일"
                hint="쉼표 또는 줄바꿈으로 여러 명을 입력할 수 있습니다."
              >
                <Textarea
                  value={form.inviteEmailsText}
                  onChange={(e) => updateField("inviteEmailsText", e.target.value)}
                  placeholder="teammate@example.com"
                  className="min-h-[200px]"
                />
              </FieldWrapper>
              <div className="mt-4 flex flex-wrap gap-2">
                {inviteEmails.length ? (
                  inviteEmails.map((email) => <Badge key={email}>{email}</Badge>)
                ) : (
                  <span className="text-[12.5px] text-lava-muted">
                    초대할 팀원이 없으면 비워 둬도 됩니다.
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Step 2: AI spec preview */}
          {step === 2 && (
            <section>
              <WizardSectionHeader
                icon={<FileText className="h-4 w-4" aria-hidden />}
                eyebrow="Step 3"
                title="AI 명세 생성 준비"
                description="프로젝트 생성 직후 사용할 개발 문서 초안을 준비합니다."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <DeliverableCard title="기능 명세서" label="Feature Spec">
                  프로젝트 목적, 핵심 기능, 제약사항, 예외 처리를 포함한 실행 가능한 초안이 생성됩니다.
                </DeliverableCard>
                <DeliverableCard title="API 명세서" label="REST API">
                  REST API 이름, 메서드, 경로, 요청/응답 스키마, 오류 케이스를 구조화합니다.
                </DeliverableCard>
              </div>
              <div className="mt-4 rounded-xl border border-lava-border bg-lava-raised px-4 py-3 text-[12.5px] font-medium text-lava-secondary">
                AI 호출이 실패해도 프로젝트는 정상 생성되며, 기본 안내 문구가 문서에 저장됩니다.
              </div>
            </section>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <section>
              <WizardSectionHeader
                icon={<Check className="h-4 w-4" aria-hidden />}
                eyebrow="Step 4"
                title="최종 확인"
                description="생성 전 입력값을 한 번 더 확인합니다."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-lava-border bg-lava-surface p-5">
                  <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.08em] text-lava-muted">
                    프로젝트 기본 정보
                  </h2>
                  <dl className="space-y-3 text-[13px]">
                    <ConfirmRow label="프로젝트 이름" value={form.name || "미입력"} />
                    <ConfirmRow
                      label="유형"
                      value={form.type === "team" ? "팀 프로젝트" : "개인 프로젝트"}
                    />
                    <ConfirmRow
                      label="기간"
                      value={`${form.startDate || "시작일 미입력"} ~ ${form.endDate || "종료일 미입력"}`}
                    />
                    <ConfirmRow
                      label="초대 인원"
                      value={isPersonal ? "개인 프로젝트" : `${inviteEmails.length}명`}
                    />
                  </dl>
                </div>
                <div className="rounded-xl border border-lava-border bg-lava-surface p-5">
                  <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.08em] text-lava-muted">
                    아이디어 요약
                  </h2>
                  <p className="max-h-[200px] overflow-auto whitespace-pre-wrap text-[13px] leading-[1.65] text-lava-secondary">
                    {form.originalIdea || "아이디어가 아직 입력되지 않았습니다."}
                  </p>
                </div>
              </div>
            </section>
          )}
        </Card>

        {/* Summary panel */}
        <SummaryPanel form={form} inviteEmails={inviteEmails} step={step} />
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={previousStep}
          disabled={step === 0 || isCreating}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          이전
        </Button>

        {step < 3 ? (
          <Button
            type="button"
            onClick={nextStep}
            iconRight={<ChevronRight className="h-4 w-4" />}
          >
            다음 단계
          </Button>
        ) : (
          <Button
            type="button"
            onClick={createProject}
            disabled={isCreating}
            loading={isCreating}
            icon={!isCreating ? <Rocket className="h-4 w-4" /> : undefined}
          >
            {isCreating ? "AI 문서 생성 중" : "프로젝트 생성하기"}
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md transition-opacity duration-300">
          <div className="max-w-md p-8 text-center space-y-6">
            <div className="relative flex justify-center">
              <Loader2 className="h-16 w-16 text-brand-primary animate-spin" />
              <Sparkles className="absolute h-6 w-6 text-brand-primary animate-pulse top-5" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-white">
                AI 프로젝트 문서 구성 중
              </h3>
              <p className="text-sm text-lava-muted leading-relaxed">
                아이디어를 분석하여 최적의 기능 명세서와<br />
                API 명세서 초안을 자동으로 작성하고 있습니다.<br />
                이 작업은 최대 1분 정도 소요될 수 있습니다.
              </p>
            </div>
            
            <div className="flex justify-center gap-2 text-xs text-brand-primary/80 font-semibold animate-pulse">
              <span>기능 분석 중</span>
              <span>•</span>
              <span>명세서 생성 중</span>
              <span>•</span>
              <span>스프린트 설계 중</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stepper ─────────────────────────────────────────── */
function Stepper({ step, projectType }: { step: WizardStep; projectType: ProjectType }) {
  return (
    <ol className="mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((label, index) => {
        const isSkipped = projectType === "personal" && index === 1;
        const isComplete = index < step && !isSkipped;
        const isCurrent = index === step;

        return (
          <li
            key={label}
            className={[
              "relative rounded-xl border px-4 py-3 transition-all duration-150",
              isCurrent
                ? "border-brand-primary/30 bg-brand-warmBg"
                : isComplete
                ? "border-[rgb(var(--c-success)/0.25)] bg-[rgb(var(--c-success)/0.12)]"
                : isSkipped
                ? "border-lava-border bg-lava-raised opacity-60"
                : "border-lava-border bg-lava-surface"
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold",
                  isComplete
                    ? "bg-lava-success text-white"
                    : isCurrent
                    ? "bg-brand-primary text-white"
                    : isSkipped
                    ? "bg-lava-border text-lava-muted"
                    : "bg-lava-raised text-lava-muted"
                ].join(" ")}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <div>
                <span
                  className={[
                    "text-[13px] font-semibold",
                    isCurrent ? "text-brand-primary" : "text-lava-text"
                  ].join(" ")}
                >
                  {label}
                </span>
                {isSkipped && (
                  <p className="text-[11px] text-lava-muted">개인 프로젝트 제외</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Section header ──────────────────────────────────── */
function WizardSectionHeader({
  icon,
  eyebrow,
  title,
  description
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="sr-only">
        {eyebrow}. {title}
      </span>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lava-raised text-lava-secondary">
        {icon}
      </div>
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-lava-muted">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-[18px] font-bold tracking-tight text-lava-text">{title}</h2>
        <p className="mt-1 text-[13px] text-lava-secondary">{description}</p>
      </div>
    </div>
  );
}

/* ── Deliverable card ────────────────────────────────── */
function DeliverableCard({
  title,
  label,
  children
}: {
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-lava-border bg-lava-surface p-5">
      <Badge tone="purple">{label}</Badge>
      <h3 className="mt-4 text-[15px] font-bold tracking-tight text-lava-text">{title}</h3>
      <p className="mt-2.5 text-[12.5px] leading-[1.65] text-lava-secondary">{children}</p>
    </div>
  );
}

/* ── Confirm row ─────────────────────────────────────── */
function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-lava-muted">{label}</dt>
      <dd className="text-right font-semibold text-lava-text">{value}</dd>
    </div>
  );
}

/* ── Summary panel ───────────────────────────────────── */
function SummaryPanel({
  form,
  inviteEmails,
  step
}: {
  form: FormState;
  inviteEmails: string[];
  step: WizardStep;
}) {
  return (
    <aside className="xl:sticky xl:top-[74px]">
      <Card className="relative overflow-hidden p-6">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-lava-muted">
          실시간 요약
        </p>
        <h2 className="mt-2 text-[17px] font-bold tracking-tight text-lava-text">
          {form.name || "프로젝트 이름"}
        </h2>
        <p className="mt-2 line-clamp-4 text-[12.5px] leading-[1.6] text-lava-secondary">
          {form.originalIdea || "아이디어를 입력하면 이곳에 표시됩니다."}
        </p>

        <div className="mt-5 space-y-2.5">
          <SummaryRow
            label="유형"
            value={form.type === "team" ? "팀 프로젝트" : "개인 프로젝트"}
          />
          <SummaryRow
            label="기간"
            value={`${form.startDate || "시작일"} ~ ${form.endDate || "종료일"}`}
          />
          <SummaryRow
            label="초대"
            value={form.type === "personal" ? "해당 없음" : `${inviteEmails.length}명`}
          />
          <SummaryRow label="단계" value={steps[step] ?? "진행 중"} />
        </div>

        <div className="mt-5 rounded-xl border border-lava-border bg-lava-raised p-4">
          <p className="mb-3 text-[12.5px] font-semibold text-lava-text">생성 예정 산출물</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="purple">기능 명세서</Badge>
            <Badge tone="gray">API 명세서</Badge>
          </div>
        </div>
      </Card>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-lava-border pb-2.5 text-[12.5px] last:border-b-0 last:pb-0">
      <span className="text-lava-muted">{label}</span>
      <span className="min-w-0 truncate font-semibold text-lava-text">{value}</span>
    </div>
  );
}
