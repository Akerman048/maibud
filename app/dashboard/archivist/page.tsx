import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getArchiveProjects } from "@/lib/archive";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import type { ArchiveQuery } from "@/types/archive";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardDateRangeFilter } from "@/components/dashboard/DashboardDateRangeFilter";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getArchivistDashboardData } from "@/lib/dashboard/archivist-dashboard";
import { parseDashboardDateRange } from "@/lib/dashboard-date-range";

export default async function ArchivistPage({
  searchParams,
}: {
  searchParams: Promise<ArchiveQuery>;
}) {
  const [currentUser, query] = await Promise.all([
    requireRole([UserRole.ARCHIVIST]),
    searchParams,
  ]);
  const range = parseDashboardDateRange(query.range);
  const [result, dashboard] = await Promise.all([
    getArchiveProjects(currentUser.id, currentUser.role, query),
    getArchivistDashboardData(currentUser.id, range),
  ]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle="Документи, справи та комплектність архіву"
        />

        <section aria-labelledby="dashboard-overview-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="dashboard-overview-title" className="text-lg font-semibold text-[var(--color-text-primary)]">Огляд</h2>
            <DashboardDateRangeFilter value={range} />
          </div>
          <DashboardStats stats={dashboard.stats} />
        </section>
        <ActivityFeed activity={dashboard.activity} />

        <ArchiveView
          result={result}
          query={query}
          baseHref="/dashboard/archivist/archive"
        />
      </div>
    </DashboardLayout>
  );
}
