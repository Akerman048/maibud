"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PaginationMeta } from "@/types/query";

function pages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const result: Array<number | "ellipsis"> = [1];
  if (current > 4) result.push("ellipsis");
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) result.push(page);
  if (current < total - 3) result.push("ellipsis");
  result.push(total);
  return result;
}

export function Pagination({ pagination, pageParam = "page" }: { pagination: PaginationMeta; pageParam?: string }) {
  const pathname = usePathname();
  const currentParams = useSearchParams();
  const href = (page: number) => {
    const params = new URLSearchParams(currentParams.toString());
    params.set(pageParam, String(page));
    return `${pathname}?${params.toString()}`;
  };
  const candidateStart = (pagination.page - 1) * pagination.pageSize + 1;
  const start = pagination.total === 0 || candidateStart > pagination.total ? 0 : candidateStart;
  const end = start === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <nav aria-label="Пагінація" className="flex flex-col items-stretch justify-between gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-[var(--color-text-secondary)]">Показано {start}–{end} із {pagination.total}</span>
      <div className="flex min-w-0 items-center justify-between gap-1 sm:justify-start">
        {pagination.hasPreviousPage ? <Link className="inline-flex min-h-11 items-center rounded-md border px-3 py-2 hover:bg-slate-50" href={href(pagination.page - 1)}>Назад</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-md border px-3 py-2 opacity-40">Назад</span>}
        <span className="px-2 text-center text-[var(--color-text-secondary)] sm:hidden">Сторінка {pagination.page} із {pagination.totalPages}</span>
        <div className="hidden items-center gap-1 sm:flex">{pages(pagination.page, pagination.totalPages).map((page, index) => page === "ellipsis"
          ? <span key={`ellipsis-${index}`} className="px-2">…</span>
          : <Link key={page} href={href(page)} aria-current={page === pagination.page ? "page" : undefined} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-2 ${page === pagination.page ? "bg-[var(--color-accent)] text-white" : "hover:bg-slate-100"}`}>{page}</Link>)}</div>
        {pagination.hasNextPage ? <Link className="inline-flex min-h-11 items-center rounded-md border px-3 py-2 hover:bg-slate-50" href={href(pagination.page + 1)}>Далі</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-md border px-3 py-2 opacity-40">Далі</span>}
      </div>
    </nav>
  );
}
