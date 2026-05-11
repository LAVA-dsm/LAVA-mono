"use client";

import { useMemo, useState } from "react";
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

const initialState: FormState = {
  name: "",
  type: "team",
  originalIdea: "",
  enhancedIdea: "",
  ideaEnhancementUsed: false,
  startDate: "",
  endDate: "",
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
  const activeIdea = form.enhancedIdea || form.originalIdea;

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const nextStep = () => {
    setError(null);
    try {
      if (step === 0 || step === 2) {
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
      enhancedIdea: form.enhancedIdea || undefined,
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
      setError(enhanceError instanceof Error ? enhanceError.message : "AI 아이디어 증강에 실패했어요.");
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
      setError(createError instanceof Error ? formatValidationError(createError) : "프로젝트 생성에 실패했어요.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1580px]">
      <Stepper step={step} projectType={form.type} />
      <Card className="mt-8">
        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}

        {step === 0 ? (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-primary" aria-hidden />
              <h1 className="text-[22px] font-bold leading-[30px] text-lava-text">Step 1. 프로젝트 기본 정보</h1>
            </div>
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
                      className={`h-11 rounded-md border text-sm font-semibold ${
                        form.type === type
                          ? "border-brand-primary bg-brand-warmBg text-brand-primary"
                          : "border-lava-borderStrong bg-white text-lava-text"
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
                />
              </FieldWrapper>
              <FieldWrapper label="종료일" hint="최대 365일까지 가능합니다.">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => updateField("endDate", event.target.value)}
                />
              </FieldWrapper>
            </div>
            <div className="mt-5">
              <FieldWrapper
                label="프로젝트 아이디어"
                hint={`${ideaLength}/${PROJECT_IDEA_MIN_LENGTH}자 이상`}
              >
                <Textarea
                  value={form.originalIdea}
                  onChange={(event) => updateField("originalIdea", event.target.value)}
                  placeholder="어떤 문제를 해결하고 싶은지, 누가 사용할지, 꼭 들어가야 할 기능을 적어주세요."
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
              <span className="text-xs text-lava-secondary">증강은 프로젝트 생성 중 1회만 사용할 수 있습니다.</span>
            </div>
            {form.enhancedIdea ? (
              <div className="mt-5">
                <FieldWrapper label="AI 증강 결과" hint="생성 결과는 직접 수정할 수 있습니다.">
                  <Textarea
                    value={form.enhancedIdea}
                    onChange={(event) => updateField("enhancedIdea", event.target.value)}
                    className="min-h-48 border-brand-primary bg-brand-warmBg"
                  />
                </FieldWrapper>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 1 ? (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <Mail className="h-5 w-5 text-brand-primary" aria-hidden />
              <h1 className="text-[22px] font-bold leading-[30px] text-lava-text">Step 2. 팀원 이메일 초대</h1>
            </div>
            <FieldWrapper label="초대 이메일" hint="쉼표 또는 줄바꿈으로 여러 명을 입력할 수 있습니다.">
              <Textarea
                value={form.inviteEmailsText}
                onChange={(event) => updateField("inviteEmailsText", event.target.value)}
                placeholder="teammate@example.com"
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
            <div className="mb-6 flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-primary" aria-hidden />
              <h1 className="text-[22px] font-bold leading-[30px] text-lava-text">Step 3. AI 명세 생성 준비</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-lava-border bg-white p-5">
                <Badge tone="purple">기능 명세서</Badge>
                <p className="mt-4 text-sm leading-6 text-lava-secondary">
                  프로젝트 생성 후 기능명, 설명, 제약사항, 예외 처리를 포함한 초안이 동기 생성됩니다.
                </p>
              </div>
              <div className="rounded-lg border border-lava-border bg-white p-5">
                <Badge tone="purple">API 명세서</Badge>
                <p className="mt-4 text-sm leading-6 text-lava-secondary">
                  기능 명세서를 바탕으로 REST API 이름, 메서드, 경로, 요청/응답, 오류 케이스를 정리합니다.
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-lava-secondary">
              AI 호출이 실패해도 프로젝트는 생성되고 기본 안내 문구가 문서에 저장됩니다.
            </p>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <Check className="h-5 w-5 text-brand-primary" aria-hidden />
              <h1 className="text-[22px] font-bold leading-[30px] text-lava-text">Step 4. 프로젝트 생성 최종 확인</h1>
            </div>
            <div className="rounded-lg border border-lava-borderStrong p-5">
              <h2 className="text-sm font-bold text-brand-red">프로젝트 기본 정보</h2>
              <dl className="mt-5 grid gap-3 text-sm md:grid-cols-[140px_1fr]">
                <dt className="text-lava-secondary">프로젝트 이름</dt>
                <dd className="font-semibold text-lava-text">{form.name || "미입력"}</dd>
                <dt className="text-lava-secondary">프로젝트 유형</dt>
                <dd className="font-semibold text-lava-text">
                  {form.type === "team" ? "팀 프로젝트" : "개인 프로젝트"}
                </dd>
                <dt className="text-lava-secondary">프로젝트 일정</dt>
                <dd className="font-semibold text-lava-text">
                  {form.startDate || "시작일 미입력"} ~ {form.endDate || "종료일 미입력"}
                </dd>
                <dt className="text-lava-secondary">초대 인원</dt>
                <dd className="font-semibold text-lava-text">{isPersonal ? "개인 프로젝트" : `${inviteEmails.length}명`}</dd>
              </dl>
            </div>
            <div className="mt-5 rounded-lg border border-lava-borderStrong p-5">
              <h2 className="text-sm font-bold text-brand-red">아이디어 요약</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-lava-secondary">
                {activeIdea || "아이디어가 아직 입력되지 않았습니다."}
              </p>
            </div>
          </section>
        ) : null}
      </Card>

      <div className="mt-8 flex items-center justify-between">
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
    <ol className="grid grid-cols-4 gap-6">
      {steps.map((label, index) => {
        const isSkipped = projectType === "personal" && index === 1;
        const isComplete = index < step && !isSkipped;
        const isCurrent = index === step;

        return (
          <li key={label} className="relative flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isComplete || isCurrent
                  ? "bg-brand-primary text-white"
                  : isSkipped
                    ? "bg-gray-100 text-lava-muted"
                    : "bg-white text-lava-muted"
              }`}
            >
              {isComplete ? <Check className="h-5 w-5" aria-hidden /> : index + 1}
            </span>
            <span className={`text-sm font-semibold ${isCurrent ? "text-brand-primary" : "text-lava-secondary"}`}>
              {label}
              {isSkipped ? <span className="block text-xs font-normal text-lava-muted">개인 프로젝트 제외</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
