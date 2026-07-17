import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";

import { Card } from "@/components/ui/Card";
import type { DashboardStatItem } from "@/types/dashboard";

export function DashboardStatCard({ stat }: { stat: DashboardStatItem }) {
  const isInteractive = Boolean(stat.href);
  const content = (
    <Card
      className={`relative h-full min-w-0 overflow-hidden p-4 transition ${
        isInteractive
          ? "border-blue-200 bg-blue-50/40 pr-12 shadow-sm group-hover:-translate-y-0.5 group-hover:border-[var(--color-accent)] group-hover:bg-blue-50 group-hover:shadow-[var(--shadow-md)]"
          : "border-slate-200 bg-white shadow-none"
      }`}
    >
      {isInteractive ? (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-blue-200 bg-white text-[var(--color-accent)] transition group-hover:border-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white"
        >
          <FiArrowUpRight className="size-4" />
        </span>
      ) : null}
      <p className="break-words text-2xl font-bold leading-none tracking-tight text-[var(--color-text-primary)]">
        {stat.value.toLocaleString("uk-UA")}
      </p>
      <h3 className="mt-1.5 break-words text-sm font-semibold leading-tight text-[var(--color-text-primary)]">
        {stat.label}
      </h3>
      {stat.description ? (
        <p className="mt-0.5 break-words text-xs leading-tight text-[var(--color-text-muted)]">
          {stat.description}
        </p>
      ) : null}
    </Card>
  );

  return stat.href ? (
    <Link
      href={stat.href}
      aria-label={`${stat.label}: ${stat.value}. Перейти до деталей`}
      className="group block h-full rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
    >
      {content}
    </Link>
  ) : content;
}
