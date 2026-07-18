import { createProject, updateProject } from "./actions";
import { archiveProject } from "@/app/dashboard/archive-actions";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { AddProjectButton } from "@/components/projects/AddProjectButton";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getDesigners, getOrganizationExperts } from "@/lib/projects";
import { requireCurrentHeadOrganization } from "@/lib/organization-access";
import { normalizeProjectSearchParams, searchProjects } from "@/lib/project-search";
import { ProjectListControls } from "@/components/projects/ProjectListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardDateRangeFilter } from "@/components/dashboard/DashboardDateRangeFilter";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getHeadDashboardData } from "@/lib/dashboard/head-dashboard";
import { parseDashboardDateRange } from "@/lib/dashboard-date-range";

export default async function HeadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ user: currentUser, organization }, raw] = await Promise.all([
    requireCurrentHeadOrganization(),
    searchParams,
  ]);
  const query = normalizeProjectSearchParams(raw, currentUser.id, currentUser.role);
  const range = parseDashboardDateRange(raw.range);
  const [result, experts, designers, dashboard] = await Promise.all([
    searchProjects(query),
    getOrganizationExperts(organization.id),
    getDesigners(currentUser.id),
    getHeadDashboardData(currentUser.id, range),
  ]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          action={
            <AddProjectButton
              experts={experts}
              createProjectAction={createProject}
            />
          }
        />

        <section aria-labelledby="dashboard-overview-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="dashboard-overview-title" className="text-lg font-semibold text-[var(--color-text-primary)]">Огляд</h2>
            <DashboardDateRangeFilter value={range} />
          </div>
          <DashboardStats stats={dashboard.stats} />
        </section>
        <ActivityFeed activity={dashboard.activity} />

        <ProjectListControls query={Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))} basePath="/dashboard/head" experts={experts} designers={designers} />
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <ProjectsView
          projects={result.items}
          baseHref="/dashboard/head/projects"
          experts={experts}
          updateProjectAction={updateProject}
          archiveProjectAction={archiveProject}
        />
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
