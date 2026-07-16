import Link from "next/link";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { normalizeProjectSearchParams, searchProjects } from "@/lib/project-search";
import { SearchInput } from "@/components/search/SearchInput";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";
import { DashboardDateRangeFilter } from "@/components/dashboard/DashboardDateRangeFilter";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getClientDashboardData } from "@/lib/dashboard/client-dashboard";
import { parseDashboardDateRange } from "@/lib/dashboard-date-range";

function getProjectStatusLabel(status: string) {
  if (status === "OPEN" || status === "open") return "Відкрито";
  if (status === "IN_PROGRESS" || status === "processed") return "У роботі";
  if (status === "RETURNED" || status === "returned") return "Повернуто";
  if (status === "COMPLETED" || status === "resolved") return "Завершено";
  if (status === "ARCHIVED" || status === "archived") return "Архів";

  return status;
}

export default async function ClientDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.CLIENT]), searchParams]);
  const query = normalizeProjectSearchParams(raw, currentUser.id, currentUser.role);
  const range = parseDashboardDateRange(raw.range);
  const [result, dashboard] = await Promise.all([searchProjects(query), getClientDashboardData(currentUser.id, range)]);
  const projects = result.items;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="Проєкти, доступні вашому обліковому запису"
        />
        <section aria-labelledby="dashboard-overview-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="dashboard-overview-title" className="text-lg font-semibold text-[var(--color-text-primary)]">Огляд</h2>
            <DashboardDateRangeFilter value={range} />
          </div>
          <DashboardStats stats={dashboard.stats} />
        </section>
        <div className="flex flex-wrap items-center gap-3"><div className="min-w-[260px] flex-1"><SearchInput key={query.search} defaultValue={query.search} label="Пошук проєкту" /></div><PageSizeSelect value={query.pageSize} /></div>

        {projects.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--color-text-secondary)]">
            Вам ще не надано доступ до проєктів.
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/client/projects/${project.id}`}
              >
                <Card className="p-5 transition hover:border-slate-300 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-[var(--color-text-primary)]">
                        {project.name}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {project.address}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Замовник: {project.customer}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="info">
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Дедлайн: {project.deadline === "—" ? "не визначено" : project.deadline}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
