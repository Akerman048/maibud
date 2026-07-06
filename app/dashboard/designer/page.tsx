import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { ShareProjectButton } from "@/components/share/ShareProjectButton";
import { getProjects } from "@/lib/projects";

export default async function DesignerPage() {
  const projects = await getProjects();

  return (
    <DashboardLayout role="designer">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="ТОВ «Проєктбуд»"
          action={<ShareProjectButton />}
        />

        <ProjectsView
          projects={projects}
          baseHref="/dashboard/designer/projects"
        />
      </div>
    </DashboardLayout>
  );
}