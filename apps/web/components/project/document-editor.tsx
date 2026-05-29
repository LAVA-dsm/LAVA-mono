"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, FileText, Loader2, Save, Sparkles } from "lucide-react";
import {
  FEATURE_SPEC_MAX_LENGTH,
  projectDocumentTypeSchema,
  type ProjectDocumentSummary,
  type ProjectDocumentType
} from "@lava/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldWrapper, Textarea } from "@/components/ui/field";
import { apiClient } from "@/lib/api-client";

const documentMeta: Record<ProjectDocumentType, { title: string; label: string; accent: string }> = {
  feature_spec: {
    title: "기능 명세서",
    label: "Markdown",
    accent: "text-lava-purple"
  },
  api_spec: {
    title: "API 명세서",
    label: "REST",
    accent: "text-brand-primary"
  }
};

const documentTabs: ProjectDocumentType[] = ["feature_spec", "api_spec"];

export function DocumentEditor({ projectId, documentType }: { projectId: string; documentType: string }) {
  const router = useRouter();
  const parsedType = useMemo(() => projectDocumentTypeSchema.safeParse(documentType), [documentType]);
  const type = parsedType.success ? parsedType.data : null;
  const [projectName, setProjectName] = useState("프로젝트");
  const [document, setDocument] = useState<ProjectDocumentSummary | null>(null);
  const [content, setContent] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState<string | null>(parsedType.success ? null : "지원하지 않는 문서 유형입니다.");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(parsedType.success);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const contentDirtyRef = useRef(false);
  const loadIdRef = useRef(0);

  useEffect(() => {
    if (!type) {
      setIsLoading(false);
      return;
    }

    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    contentDirtyRef.current = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setStatusMessage(null);
      try {
        const [project, loadedDocument] = await Promise.all([
          apiClient.getProject(projectId),
          apiClient.getProjectDocument(projectId, type)
        ]);
        if (loadId !== loadIdRef.current) return;
        setProjectName(project.name);
        setDocument(loadedDocument);
        setContent((currentContent) => (contentDirtyRef.current ? currentContent : loadedDocument.content));
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "문서를 불러오지 못했어요.";
        if (message.includes("로그인이 필요")) {
          router.push(`/login?next=${encodeURIComponent(`/projects/${projectId}/documents/${type}`)}`);
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [projectId, type, retryTrigger]);

  const currentMeta = type ? documentMeta[type] : documentMeta.feature_spec;
  const isFeatureSpec = type === "feature_spec";
  const isOverLimit = isFeatureSpec && content.length > FEATURE_SPEC_MAX_LENGTH;
  const isBusy = isLoading || isSaving || isAiEditing;

  const updateContent = (value: string) => {
    contentDirtyRef.current = true;
    setContent(value);
  };

  const save = async () => {
    if (!type) return;
    if (isOverLimit) {
      setError("기능 명세서는 2000자 이하로 저장해야 합니다.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await apiClient.updateProjectDocument(projectId, type, { content });
      setDocument(updated);
      contentDirtyRef.current = false;
      setContent(updated.content);
      setStatusMessage("저장 완료");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "문서 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const editWithAi = async () => {
    if (!type) return;

    setIsAiEditing(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await apiClient.editProjectDocumentWithAi(projectId, type, { prompt: aiPrompt });
      setDocument(updated);
      contentDirtyRef.current = false;
      setContent(updated.content);
      setAiPrompt("");
      setStatusMessage("AI 수정 완료");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "AI 문서 수정에 실패했어요.");
    } finally {
      setIsAiEditing(false);
    }
  };

  return (
    <AppShell
      title={
        <span className="text-base font-bold text-lava-secondary">
          내 프로젝트 <span className="px-2 text-lava-muted">›</span>
          <Link href={`/projects/${projectId}`} className="text-lava-secondary hover:text-brand-primary">
            {projectName}
          </Link>
          <span className="px-2 text-lava-muted">›</span>
          <span className="font-black text-lava-text">{currentMeta.title}</span>
        </span>
      }
    >
      <div className="space-y-6">
        {isLoading ? <p className="text-sm font-semibold text-lava-secondary">문서를 불러오는 중입니다.</p> : null}
        {error ? <ErrorAlert message={error} onRetry={type ? () => setRetryTrigger((prev) => prev + 1) : undefined} /> : null}
        {statusMessage ? (
          <div role="status" className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-lava-success">
            {statusMessage}
          </div>
        ) : null}

        {type && !isLoading ? (
          <>
            <Card className="relative overflow-hidden p-7">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#FF5A2D,#20A99A,#5865F2)]" />
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <Badge tone={document?.generatedBy === "ai" ? "purple" : "gray"}>
                    {document?.generatedBy === "ai" ? "AI 초안" : "직접 수정"}
                  </Badge>
                  <div className="mt-4 flex items-center gap-3">
                    <FileText className={`h-7 w-7 ${currentMeta.accent}`} aria-hidden />
                    <h1 className="text-[30px] font-black leading-[1.18] text-lava-text sm:text-[36px]">{currentMeta.title}</h1>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-lava-secondary">
                    {document?.updatedAt ? `최근 수정: ${formatDate(document.updatedAt)}` : "저장 대기"} · {currentMeta.label}
                  </p>
                </div>
                <Button
                  type="button"
                  aria-label="저장"
                  onClick={save}
                  disabled={isBusy || isOverLimit}
                  icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                >
                  {isSaving ? "저장 중" : "저장"}
                </Button>
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[190px_minmax(0,1fr)_360px]">
              <aside className="space-y-3 xl:sticky xl:top-[94px] xl:self-start">
                {documentTabs.map((tab) => {
                  const meta = documentMeta[tab];
                  const active = tab === type;
                  return (
                    <Link
                      key={tab}
                      href={`/projects/${projectId}/documents/${tab}`}
                      className={`flex min-h-12 items-center justify-between rounded-lg border px-4 text-sm font-black transition-all ${
                        active
                          ? "border-brand-primary bg-brand-warmBg text-brand-primary"
                          : "border-lava-border bg-white text-lava-text hover:border-brand-primary hover:text-brand-primary"
                      }`}
                    >
                      {meta.title}
                      <Badge tone={tab === "feature_spec" ? "purple" : "gray"}>{meta.label}</Badge>
                    </Link>
                  );
                })}
              </aside>

              <section className="min-w-0">
                <div className="grid gap-5 2xl:grid-cols-2">
                  <Card className="shadow-none">
                    <div className="mb-5 flex items-center justify-between gap-3 border-b border-lava-border pb-4">
                      <div>
                        <h2 className="text-[18px] font-black leading-[26px] text-lava-text">편집</h2>
                        <p className="mt-1 text-xs font-semibold text-lava-secondary">Markdown 원문</p>
                      </div>
                      <Badge tone={isOverLimit ? "red" : "gray"}>
                        {isFeatureSpec ? `${content.length}/${FEATURE_SPEC_MAX_LENGTH}` : `${content.length}자`}
                      </Badge>
                    </div>
                    <FieldWrapper
                      label="문서 본문"
                      error={isOverLimit ? "기능 명세서는 2000자 이하로 저장해야 합니다." : undefined}
                      hint={isFeatureSpec ? "기능 명세서는 저장 길이 제한이 있습니다." : "API 명세서는 길이 제한이 없습니다."}
                    >
                      <Textarea
                        aria-label="문서 본문"
                        value={content}
                        onChange={(event) => updateContent(event.currentTarget.value)}
                        onInput={(event) => updateContent(event.currentTarget.value)}
                        className="min-h-[620px] font-mono text-[13px] leading-6"
                      />
                    </FieldWrapper>
                  </Card>

                  <div className="min-h-[620px] rounded-lg border border-lava-border bg-white px-8 py-7 shadow-card">
                    <div className="mb-6 flex items-center justify-between border-b border-lava-border pb-4">
                      <div>
                        <h2 className="text-[18px] font-black leading-[26px] text-lava-text">미리보기</h2>
                        <p className="mt-1 text-xs font-semibold text-lava-secondary">문서 캔버스</p>
                      </div>
                      <span className="text-xs font-semibold text-lava-secondary">
                        {document?.updatedAt ? formatDate(document.updatedAt) : "저장 대기"}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-lava-text">
                      {content || "문서 본문을 입력해 주세요."}
                    </pre>
                  </div>
                </div>
              </section>

              <Card className="sticky top-[94px] h-[calc(100vh-118px)] overflow-hidden shadow-float">
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-3 border-b border-lava-border pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-warmBg text-brand-primary">
                      <Bot className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-black leading-[26px] text-lava-text">LAVA AI 어시스턴트</h2>
                      <p className="text-xs font-semibold text-lava-secondary">현재 문서 기준으로 수정</p>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 py-5">
                    <div className="rounded-lg border border-lava-border bg-lava-raised p-4 text-sm leading-6 text-lava-secondary">
                      요청을 보내면 현재 문서를 기준으로 수정된 초안을 다시 작성합니다.
                    </div>
                  </div>
                  <div className="border-t border-lava-border pt-4">
                    <FieldWrapper label="AI 문서 수정 요청">
                      <Textarea
                        aria-label="AI 문서 수정 요청"
                        value={aiPrompt}
                        onChange={(event) => setAiPrompt(event.currentTarget.value)}
                        onInput={(event) => setAiPrompt(event.currentTarget.value)}
                        placeholder={type === "feature_spec" ? "예: 로그인 기능 상세화해줘." : "예: API 명세 REST 형식으로 다시 정리해줘."}
                        className="min-h-28"
                      />
                    </FieldWrapper>
                    <Button
                      type="button"
                      aria-label="AI로 문서 수정"
                      className="mt-3 w-full"
                      onClick={editWithAi}
                      disabled={isBusy || !aiPrompt.trim()}
                      icon={isAiEditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    >
                      {isAiEditing ? "AI 수정 중" : "AI로 문서 수정"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
