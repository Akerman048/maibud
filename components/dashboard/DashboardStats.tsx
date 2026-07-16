import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { Card } from "@/components/ui/Card";
import type { DashboardStatItem } from "@/types/dashboard";

export function DashboardStats({ stats }: { stats: DashboardStatItem[] }) {
  if (stats.length === 0) {
    return (
      <Card className="p-5 text-sm text-[var(--color-text-secondary)]">
        Немає доступних даних для цього облікового запису.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <DashboardStatCard key={stat.key} stat={stat} />
      ))}
    </div>
  );
}
