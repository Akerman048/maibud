import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { normalizeProjectSearchParams, searchProjects } from "@/lib/project-search";
import { ProjectListControls } from "@/components/projects/ProjectListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardDateRangeFilter } from "@/components/dashboard/DashboardDateRangeFilter";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getExpertDashboardData } from "@/lib/dashboard/expert-dashboard";
import { parseDashboardDateRange } from "@/lib/dashboard-date-range";

export default async function ExpertPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.EXPERT]), searchParams]);
  const query = normalizeProjectSearchParams(raw, currentUser.id, currentUser.role);
  const range = parseDashboardDateRange(raw.range);
  const [result, dashboard] = await Promise.all([searchProjects(query), getExpertDashboardData(currentUser.id, range)]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="Напрям: Газопостачання"
        />

        <section aria-labelledby="dashboard-overview-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="dashboard-overview-title" className="text-lg font-semibold text-[var(--color-text-primary)]">Огляд</h2>
            <DashboardDateRangeFilter value={range} />
          </div>
          <DashboardStats stats={dashboard.stats} />
        </section>
        <ActivityFeed activity={dashboard.activity} />

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
