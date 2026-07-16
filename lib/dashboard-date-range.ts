import type { DashboardDateRange } from "@/types/dashboard";

const RANGE_DAYS: Record<Exclude<DashboardDateRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseDashboardDateRange(
  value: string | string[] | null | undefined,
): DashboardDateRange {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "7d" ||
    normalized === "30d" ||
    normalized === "90d" ||
    normalized === "all"
    ? normalized
    : "30d";
}

export function getDashboardDateRangeStart(
  range: DashboardDateRange,
  now: Date,
): Date | null {
  if (range === "all") return null;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - RANGE_DAYS[range] * millisecondsPerDay);
}

export function getDashboardPeriodDescription(range: DashboardDateRange) {
  if (range === "all") return "За весь час";
  return `За останні ${RANGE_DAYS[range]} днів`;
}
