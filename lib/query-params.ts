import type { PaginationMeta, SortDirection } from "@/types/query";

export type BooleanFilter = "true" | "false" | "all";

export function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePositiveInteger(
  value: string | number | null | undefined,
  fallback: number,
) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePage(value: string | number | null | undefined) {
  return parsePositiveInteger(value, 1);
}

export function parsePageSize(value: string | number | null | undefined): 10 | 20 | 50 {
  const parsed = parsePositiveInteger(value, 20);
  return parsed === 10 || parsed === 20 || parsed === 50 ? parsed : 20;
}

export function parseSortDirection(
  value: string | null | undefined,
): SortDirection {
  return value === "asc" || value === "desc" ? value : "desc";
}

export function parseDateParam(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
  }

  return date;
}

export function parseDateEndParam(value: string | null | undefined) {
  const date = parseDateParam(value);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

export function normalizeSearchQuery(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
}

export function normalizeBooleanFilter(
  value: string | null | undefined,
): BooleanFilter {
  return value === "true" || value === "false" ? value : "all";
}

/**
 * Out-of-range pages are intentionally preserved. Their queries return an empty
 * list while metadata still reports the requested page and real totalPages.
 */
export function getPaginationMeta({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
