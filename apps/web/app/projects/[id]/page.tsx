import { ProjectDetail } from "@/components/project/project-detail";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
