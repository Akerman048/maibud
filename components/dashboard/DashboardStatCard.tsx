import Link from "next/link";

import { Card } from "@/components/ui/Card";
import type { DashboardStatItem } from "@/types/dashboard";

export function DashboardStatCard({ stat }: { stat: DashboardStatItem }) {
  const content = (
    <Card className="h-full p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]">
      <p className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {stat.value.toLocaleString("uk-UA")}
      </p>
      <h3 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
        {stat.label}
      </h3>
      {stat.description ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {stat.description}
        </p>
      ) : null}
    </Card>
  );

  return stat.href ? (
    <Link href={stat.href} aria-label={`${stat.label}: ${stat.value}`}>
      {content}
    </Link>
  ) : content;
}
