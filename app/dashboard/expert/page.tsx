import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { normalizeProjectSearchParams, searchProjects } from "@/lib/project-search";
import { ProjectListControls } from "@/components/projects/ProjectListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";

export default async function ExpertPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.EXPERT]), searchParams]);
  const query = normalizeProjectSearchParams(raw, currentUser.id, currentUser.role);
  const result = await searchProjects(query);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="Напрям: Газопостачання"
        />

        <ProjectListControls query={Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))} basePath="/dashboard/expert" />
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <ProjectsView
          projects={result.items}
          baseHref="/dashboard/expert/projects"
        />
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
