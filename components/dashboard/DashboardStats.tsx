import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { Card } from "@/components/ui/Card";
import type { DashboardStatItem } from "@/types/dashboard";
import { FiChevronDown } from "react-icons/fi";

function DashboardStatGroup({
  title,
  stats,
}: {
  title: string;
  stats: DashboardStatItem[];
}) {
  return (
    <>
      <details className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white sm:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] [&::-webkit-details-marker]:hidden">
          <span>{title}</span>
          <FiChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] p-3">
          {stats.map((stat) => (
            <DashboardStatCard key={stat.key} stat={stat} />
          ))}
        </div>
      </details>

      <section aria-label={title} className="hidden sm:block">
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">
          {title}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat) => (
            <DashboardStatCard key={stat.key} stat={stat} />
          ))}
        </div>
      </section>
    </>
  );
}

export function DashboardStats({ stats }: { stats: DashboardStatItem[] }) {
  if (stats.length === 0) {
    return (
      <Card className="p-5 text-sm text-[var(--color-text-secondary)]">
        Немає доступних даних для цього облікового запису.
      </Card>
    );
  }

  const navigationStats = stats.filter((stat) => Boolean(stat.href));
  const informationalStats = stats.filter((stat) => !stat.href);

  return (
    <div className="flex flex-col gap-5">
      {navigationStats.length > 0 ? (
        <DashboardStatGroup
          title="Швидкі переходи"
          stats={navigationStats}
        />
      ) : null}

      {informationalStats.length > 0 ? (
        <DashboardStatGroup title="Показники" stats={informationalStats} />
      ) : null}
    </div>
  );
}
