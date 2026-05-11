import { AppShell } from "@/components/layout/app-shell";
import { ProjectWizard } from "@/components/project/project-wizard";

export default function NewProjectPage() {
  return (
    <AppShell title="새 프로젝트 생성">
      <ProjectWizard />
    </AppShell>
  );
}
