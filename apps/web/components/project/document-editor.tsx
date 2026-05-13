"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (!type) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setStatusMessage(null);
      try {
        const [project, loadedDocument] = await Promise.all([
          apiClient.getProject(projectId),
          apiClient.getProjectDocument(projectId, type)
        ]);
        setProjectName(project.name);
        setDocument(loadedDocument);
        setContent(loadedDocument.content);
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
  }, [projectId, type]);

  const currentMeta = type ? documentMeta[type] : documentMeta.feature_spec;
  const isFeatureSpec = type === "feature_spec";
  const isOverLimit = isFeatureSpec && content.length > FEATURE_SPEC_MAX_LENGTH;
  const isBusy = isLoading || isSaving || isAiEditing;

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
        <span className="text-base font-semibold text-lava-secondary">
          내 프로젝트 <span className="px-2 text-lava-muted">›</span>
          <Link href={`/projects/${projectId}`} className="text-lava-secondary hover:text-brand-primary">
            {projectName}
          </Link>
          <span className="px-2 text-lava-muted">›</span>
          <span className="text-lava-text">{currentMeta.title}</span>
        </span>
      }
    >
      <div className="mx-auto max-w-[1580px]">
        {isLoading ? <p className="text-sm text-lava-secondary">문서를 불러오는 중입니다.</p> : null}
        {error ? (
          <div role="alert" className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">
            {error}
          </div>
        ) : null}
        {statusMessage ? (
          <div role="status" className="mb-5 rounded-md bg-green-50 px-4 py-3 text-sm font-semibold text-lava-success">
            {statusMessage}
          </div>
        ) : null}

        {type ? (
          <div className="grid gap-6 xl:grid-cols-[180px_minmax(0,1fr)_340px]">
            <aside className="space-y-3">
              {documentTabs.map((tab) => {
                const meta = documentMeta[tab];
                const active = tab === type;
                return (
                  <Link
                    key={tab}
                    href={`/projects/${projectId}/documents/${tab}`}
                    className={`flex min-h-11 items-center justify-between rounded-lg px-4 text-sm font-semibold ${
                      active ? "bg-brand-warmBg text-brand-primary" : "bg-white text-lava-text hover:text-brand-primary"
                    }`}
                  >
                    {meta.title}
                    <Badge tone={tab === "feature_spec" ? "purple" : "gray"}>{meta.label}</Badge>
                  </Link>
                );
              })}
            </aside>

            <section className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className={`h-5 w-5 ${currentMeta.accent}`} aria-hidden />
                  <h1 className="text-[28px] font-bold leading-[38px] text-lava-text">{currentMeta.title}</h1>
                  {document ? <Badge>{document.generatedBy === "ai" ? "AI 초안" : "직접 수정"}</Badge> : null}
                </div>
                <Button
                  type="button"
                  onClick={save}
                  disabled={isBusy || isOverLimit}
                  icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                >
                  {isSaving ? "저장 중" : "저장"}
                </Button>
              </div>

              <div className="grid gap-5 2xl:grid-cols-2">
                <div>
                  <FieldWrapper
                    label="문서 본문"
                    error={isOverLimit ? "기능 명세서는 2000자 이하로 저장해야 합니다." : undefined}
                    hint={isFeatureSpec ? `${content.length}/${FEATURE_SPEC_MAX_LENGTH}자` : "API 명세서는 길이 제한이 없습니다."}
                  >
                    <Textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      className="min-h-[620px] font-mono"
                    />
                  </FieldWrapper>
                </div>

                <div className="min-h-[620px] rounded-lg border border-lava-border bg-white px-8 py-7 shadow-card">
                  <div className="mb-5 flex items-center justify-between border-b border-lava-border pb-4">
                    <h2 className="text-[18px] font-bold leading-[26px] text-lava-text">미리보기</h2>
                    <span className="text-xs text-lava-secondary">
                      {document?.updatedAt ? `최근 수정: ${formatDate(document.updatedAt)}` : "저장 대기"}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-lava-text">
                    {content || "문서 본문을 입력해 주세요."}
                  </pre>
                </div>
              </div>
            </section>

            <Card className="sticky top-[102px] h-[calc(100vh-126px)] overflow-hidden shadow-float">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-lava-border pb-4">
                  <Bot className="h-5 w-5 text-brand-primary" aria-hidden />
                  <h2 className="text-[18px] font-bold leading-[26px] text-lava-text">LAVA AI 어시스턴트</h2>
                </div>
                <div className="min-h-0 flex-1 py-5">
                  <div className="rounded-lg border border-lava-border bg-white p-4 text-sm leading-6 text-lava-secondary">
                    요청을 보내면 현재 문서를 기준으로 수정된 초안을 다시 작성합니다.
                  </div>
                </div>
                <div className="border-t border-lava-border pt-4">
                  <FieldWrapper label="AI 문서 수정 요청">
                    <Textarea
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder={
                        type === "feature_spec"
                          ? "예: 로그인 기능 상세화해줘."
                          : "예: API 명세 REST 형식으로 다시 정리해줘."
                      }
                      className="min-h-28"
                    />
                  </FieldWrapper>
                  <Button
                    type="button"
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
