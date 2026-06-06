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
  if (error instanceof Error) {
    return error.message;
  }
  return "프로젝트 생성에 실패했어요.";
}

export function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const inviteEmails = useMemo(() => parseInviteEmails(form.inviteEmailsText), [form.inviteEmailsText]);
  const isPersonal = form.type === "personal";
  const ideaLength = form.originalIdea.length;

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const nextStep = () => {
    setError(null);
    try {
      if (step === 0) {
        buildPayload();
      }
      if (step === 1 && form.type === "team") {
        buildPayload();
      }
    } catch (validationError) {
      setError(formatValidationError(validationError));
      return;
    }

    setStep((current) => {
      if (current === 0 && form.type === "personal") return 2;
      return Math.min(current + 1, 3) as WizardStep;
    });
  };

  const previousStep = () => {
    setStep((current) => {
      if (current === 2 && form.type === "personal") return 0;
      return Math.max(current - 1, 0) as WizardStep;
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

    if (!parsed.success) {
      throw parsed.error;
    }

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
      setForm((current) => ({
        ...current,
        enhancedIdea: response.enhancedIdea,
        ideaEnhancementUsed: true
      }));
    } catch (enhanceError) {
      const message = enhanceError instanceof Error ? enhanceError.message : "AI 아이디어 증강에 실패했어요.";
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
      router.push(`/projects/${project.id}`);
    } catch (createError) {
      const message = createError instanceof Error ? formatValidationError(createError) : "프로젝트 생성에 실패했어요.";
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
      <section className="rounded-lg border border-lava-border bg-white p-6 shadow-card sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Badge tone="red">Project setup</Badge>
            <h1 className="mt-4 text-[30px] font-black leading-[1.18] text-lava-text sm:text-[36px]">새 프로젝트 생성</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-lava-secondary">
              아이디어, 참여자, 기간을 입력하면 LAVA가 기능 명세서와 API 명세서 초안을 생성합니다.
            </p>
          </div>
          <Badge tone={form.ideaEnhancementUsed ? "success" : "gray"}>
            {form.ideaEnhancementUsed ? "AI 증강 완료" : "초안 작성 중"}
          </Badge>
        </div>
        <Stepper step={step} projectType={form.type} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          {error ? <ErrorAlert className="mb-6" message={error} /> : null}

          {step === 0 ? (
            <section>
              <SectionHeader
                icon={<Sparkles className="h-5 w-5 text-brand-primary" aria-hidden />}
                eyebrow="Step 1"
                title="프로젝트 기본 정보"
                description="프로젝트의 목표와 기간을 먼저 정리합니다."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <FieldWrapper label="프로젝트 이름" hint="1자 이상 24자 이하">
                  <Input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="예: 포트폴리오용 금융앱 구축"
                  />
                </FieldWrapper>
                <FieldWrapper label="프로젝트 유형">
                  <div className="grid grid-cols-2 gap-3">
                    {(["team", "personal"] as ProjectType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField("type", type)}
                        className={`h-11 rounded-lg border text-sm font-black transition-all duration-200 ${
                          form.type === type
                            ? "border-brand-primary bg-brand-warmBg text-brand-primary shadow-[inset_0_0_0_1px_rgba(255,90,45,0.12)]"
                            : "border-lava-borderStrong bg-white text-lava-text hover:border-brand-primary hover:text-brand-primary"
                        }`}
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
                    onChange={(event) => updateField("startDate", event.target.value)}
                    onClick={(event) => {
                      try {
                        event.currentTarget.showPicker();
                      } catch (err) {
                        console.warn("showPicker is not supported", err);
                      }
                    }}
                    className="cursor-pointer"
                  />
                </FieldWrapper>
                <FieldWrapper label="종료일" hint="최대 365일까지 가능합니다.">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateField("endDate", event.target.value)}
                    onClick={(event) => {
                      try {
                        event.currentTarget.showPicker();
                      } catch (err) {
                        console.warn("showPicker is not supported", err);
                      }
                    }}
                    className="cursor-pointer"
                  />
                </FieldWrapper>
              </div>
              <div className="mt-5">
                <FieldWrapper
                  label="프로젝트 아이디어"
                  hint={`${form.ideaEnhancementUsed ? form.enhancedIdea.length : ideaLength}/${PROJECT_IDEA_MIN_LENGTH}자 이상`}
                >
                  <Textarea
                    value={form.ideaEnhancementUsed ? form.enhancedIdea : form.originalIdea}
                    onChange={(event) => {
                      if (form.ideaEnhancementUsed) {
                        updateField("enhancedIdea", event.target.value);
                      } else {
                        updateField("originalIdea", event.target.value);
                      }
                    }}
                    placeholder="어떤 문제를 해결하고 싶은지, 누가 사용할지, 꼭 들어가야 할 기능을 적어주세요."
                    className="min-h-[220px]"
                  />
                </FieldWrapper>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={enhanceIdea}
                  disabled={form.ideaEnhancementUsed || isEnhancing}
                  icon={isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                >
                  {form.ideaEnhancementUsed ? "AI 아이디어 증강 완료" : "AI 아이디어 증강"}
                </Button>
                <span className="text-xs font-semibold text-lava-secondary">증강은 프로젝트 생성 중 1회만 사용할 수 있습니다.</span>
              </div>
              {form.ideaEnhancementUsed ? (
                <div className="mt-5 rounded-lg border border-brand-primary/30 bg-brand-warmBg p-4 text-sm font-semibold text-lava-secondary">
                  <p className="mb-2">AI가 아이디어를 현재 입력값에 반영했습니다. 아래 아이디어 칸의 내용이 바로 생성에 사용됩니다.</p>
                  <details className="mt-2 text-xs text-lava-muted">
                    <summary className="cursor-pointer font-bold hover:text-brand-primary">내가 작성한 원본 아이디어 보기</summary>
                    <p className="mt-2 whitespace-pre-wrap rounded bg-white p-2 border border-lava-border font-normal text-lava-text">
                      {form.originalIdea}
                    </p>
                  </details>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 1 ? (
            <section>
              <SectionHeader
                icon={<Mail className="h-5 w-5 text-brand-primary" aria-hidden />}
                eyebrow="Step 2"
                title="팀원 이메일 초대"
                description="초대할 팀원이 없다면 비워 둔 채 다음 단계로 이동할 수 있습니다."
              />
              <FieldWrapper label="초대 이메일" hint="쉼표 또는 줄바꿈으로 여러 명을 입력할 수 있습니다.">
                <Textarea
                  value={form.inviteEmailsText}
                  onChange={(event) => updateField("inviteEmailsText", event.target.value)}
                  placeholder="teammate@example.com"
                  className="min-h-[220px]"
                />
              </FieldWrapper>
              <div className="mt-5 flex flex-wrap gap-2">
                {inviteEmails.length ? (
                  inviteEmails.map((email) => <Badge key={email}>{email}</Badge>)
                ) : (
                  <span className="text-sm text-lava-muted">초대할 팀원이 없으면 비워 둬도 됩니다.</span>
                )}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <SectionHeader
                icon={<FileText className="h-5 w-5 text-brand-primary" aria-hidden />}
                eyebrow="Step 3"
                title="AI 명세 생성 준비"
                description="프로젝트 생성 직후 사용할 개발 문서 초안을 준비합니다."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <DeliverableCard title="기능 명세서" label="Feature Spec">
                  프로젝트 목적, 핵심 기능, 제약사항, 예외 처리를 포함한 실행 가능한 초안이 생성됩니다.
                </DeliverableCard>
                <DeliverableCard title="API 명세서" label="REST API">
                  REST API 이름, 메서드, 경로, 요청/응답, 오류 케이스를 구조화합니다.
                </DeliverableCard>
              </div>
              <p className="mt-5 rounded-lg border border-lava-border bg-lava-raised px-4 py-3 text-sm font-semibold text-lava-secondary">
                AI 호출이 실패해도 프로젝트는 생성되고 기본 안내 문구가 문서에 저장됩니다.
              </p>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <SectionHeader
                icon={<Check className="h-5 w-5 text-brand-primary" aria-hidden />}
                eyebrow="Step 4"
                title="프로젝트 생성 최종 확인"
                description="생성 전 입력값을 한 번 더 확인합니다."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-lg border border-lava-borderStrong bg-white p-5">
                  <h2 className="text-sm font-black text-brand-red">프로젝트 기본 정보</h2>
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-[130px_1fr]">
                    <dt className="text-lava-secondary">프로젝트 이름</dt>
                    <dd className="font-bold text-lava-text">{form.name || "미입력"}</dd>
                    <dt className="text-lava-secondary">프로젝트 유형</dt>
                    <dd className="font-bold text-lava-text">{form.type === "team" ? "팀 프로젝트" : "개인 프로젝트"}</dd>
                    <dt className="text-lava-secondary">프로젝트 일정</dt>
                    <dd className="font-bold text-lava-text">
                      {form.startDate || "시작일 미입력"} ~ {form.endDate || "종료일 미입력"}
                    </dd>
                    <dt className="text-lava-secondary">초대 인원</dt>
                    <dd className="font-bold text-lava-text">{isPersonal ? "개인 프로젝트" : `${inviteEmails.length}명`}</dd>
                  </dl>
                </div>
                <div className="rounded-lg border border-lava-borderStrong bg-white p-5">
                  <h2 className="text-sm font-black text-brand-red">아이디어 요약</h2>
                  <p className="mt-4 max-h-[260px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-lava-secondary">
                    {form.originalIdea || "아이디어가 아직 입력되지 않았습니다."}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </Card>

        <SummaryPanel form={form} inviteEmails={inviteEmails} step={step} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={previousStep} disabled={step === 0 || isCreating}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          이전 단계
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={nextStep} icon={<ChevronRight className="h-4 w-4" />}>
            다음 단계
          </Button>
        ) : (
          <Button
            type="button"
            onClick={createProject}
            disabled={isCreating}
            icon={isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          >
            {isCreating ? "AI 문서 생성 중" : "프로젝트 생성하기"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step, projectType }: { step: WizardStep; projectType: ProjectType }) {
  return (
    <ol className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((label, index) => {
        const isSkipped = projectType === "personal" && index === 1;
        const isComplete = index < step && !isSkipped;
        const isCurrent = index === step;

        return (
          <li
            key={label}
            className={`relative rounded-lg border px-4 py-3 transition-all ${
              isCurrent
                ? "border-brand-primary bg-brand-warmBg"
                : isComplete
                  ? "border-green-100 bg-green-50"
                  : isSkipped
                    ? "border-lava-border bg-lava-raised opacity-70"
                    : "border-lava-border bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                  isComplete || isCurrent
                    ? "bg-brand-primary text-white"
                    : isSkipped
                      ? "bg-gray-100 text-lava-muted"
                      : "bg-lava-raised text-lava-muted"
                }`}
              >
                {isComplete ? <Check className="h-5 w-5" aria-hidden /> : index + 1}
              </span>
              <span className={`text-sm font-black ${isCurrent ? "text-brand-primary" : "text-lava-text"}`}>
                {label}
                {isSkipped ? <span className="block text-xs font-semibold text-lava-muted">개인 프로젝트 제외</span> : null}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SectionHeader({
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
      <span className="sr-only">{eyebrow}. {title}</span>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-warmBg">{icon}</div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-primary">{eyebrow}</p>
        <h2 className="mt-1 text-[22px] font-black leading-[30px] text-lava-text">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-lava-secondary">{description}</p>
      </div>
    </div>
  );
}

function DeliverableCard({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-lava-border bg-white p-5 shadow-sm">
      <Badge tone="purple">{label}</Badge>
      <h3 className="mt-4 text-lg font-black text-lava-text">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-lava-secondary">{children}</p>
    </div>
  );
}

function SummaryPanel({ form, inviteEmails, step }: { form: FormState; inviteEmails: string[]; step: WizardStep }) {
  return (
    <aside className="xl:sticky xl:top-[94px]">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#FF5A2D,#20A99A,#5865F2)]" />
        <p className="text-xs font-black uppercase tracking-[0.16em] text-lava-muted">Live summary</p>
        <h2 className="mt-2 text-xl font-black text-lava-text">{form.name || "프로젝트 이름"}</h2>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-lava-secondary">
          {form.originalIdea || "아이디어를 입력하면 이곳에 요약이 표시됩니다."}
        </p>
        <div className="mt-6 space-y-3">
          <SummaryRow label="유형" value={form.type === "team" ? "팀 프로젝트" : "개인 프로젝트"} />
          <SummaryRow label="기간" value={`${form.startDate || "시작일"} ~ ${form.endDate || "종료일"}`} />
          <SummaryRow label="초대" value={form.type === "personal" ? "해당 없음" : `${inviteEmails.length}명`} />
          <SummaryRow label="현재 단계" value={steps[step] ?? "진행 중"} />
        </div>
        <div className="mt-6 rounded-lg border border-lava-border bg-lava-raised p-4">
          <p className="text-sm font-black text-lava-text">생성 예정 산출물</p>
          <div className="mt-3 flex flex-wrap gap-2">
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
    <div className="flex items-center justify-between gap-3 border-b border-lava-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs font-bold text-lava-muted">{label}</span>
      <span className="min-w-0 truncate text-sm font-black text-lava-text">{value}</span>
    </div>
  );
}
