import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarCheck, Clock3, FileText, ListChecks, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  let project;

  try {
    project = await apiClient.getProject(id);
  } catch {
    notFound();
  }

  const featureSpec = project.documents.find((document) => document.type === "feature_spec");
  const apiSpec = project.documents.find((document) => document.type === "api_spec");

  return (
    <AppShell
      title={
        <span className="text-base font-semibold text-lava-secondary">
          내 프로젝트 <span className="px-2 text-lava-muted">›</span>
          <span className="text-lava-text">{project.name}</span>
        </span>
      }
    >
      <div className="mx-auto max-w-[1580px]">
        <Card className="border-l-4 border-l-brand-primary">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-bold leading-[38px] text-lava-text">{project.name}</h1>
                <Badge tone="warning">진행중</Badge>
                <Badge tone="purple">스프린트 1주차</Badge>
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
                  {project.type === "team" ? `초대 ${project.inviteCount}명 대기` : "개인 프로젝트"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" aria-hidden />
                  AI 문서 {project.documents.length}/2 생성 완료
                </span>
              </div>
            </div>
          </div>
        </Card>

        <section className="mt-8">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-primary" aria-hidden />
            <h2 className="text-[22px] font-bold leading-[30px] text-lava-text">프로젝트 산출물 문서</h2>
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <DocumentCard
              icon={<ListChecks className="h-7 w-7 text-lava-purple" aria-hidden />}
              title="기능 명세서"
              description="앱의 핵심 비즈니스 로직과 화면별 상세 기능 요구사항이 정리된 문서입니다."
              meta={featureSpec ? `최근 수정: ${formatDate(featureSpec.updatedAt)}` : "생성 대기"}
              label="Markdown"
            />
            <DocumentCard
              icon={<FileText className="h-7 w-7 text-brand-primary" aria-hidden />}
              title="API 명세서"
              description="프론트엔드와 백엔드 통신을 위한 엔드포인트, Request/Response 규격이 정리된 문서입니다."
              meta={apiSpec ? `최근 수정: ${formatDate(apiSpec.updatedAt)}` : "생성 대기"}
              label="REST"
            />
            <DocumentCard
              icon={<CalendarCheck className="h-7 w-7 text-lava-success" aria-hidden />}
              title="개발 일정표"
              description="2차 스프린트에서 팀원 참여 정보 수집 후 역할 분담과 일정이 생성됩니다."
              meta="2차 스프린트 범위"
              label="Calendar"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function DocumentCard({
  icon,
  title,
  description,
  meta,
  label
}: {
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
  label: string;
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
    </Card>
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
