import { mockProjects } from "@/data/mockProjects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { ShareProjectButton } from "@/components/share/ShareProjectButton";

export default function DesignerPage() {
  return (
    <DashboardLayout role="expert">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="ТОВ «Проєктбуд» · 3 активні проєкти"
          action={<ShareProjectButton />}
        />
        <ProjectsView
          projects={mockProjects}
          baseHref="/dashboard/designer/projects"
        />
      </div>
    </DashboardLayout>
  );
}
