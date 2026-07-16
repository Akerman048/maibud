import Link from "next/link";

import { ArchiveTable } from "@/components/archive/ArchiveTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ArchivePage, ArchiveQuery } from "@/types/archive";

function pageHref(baseHref: string, query: ArchiveQuery, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `${baseHref}?${params.toString()}`;
}

export function ArchiveView({
  result,
  query,
  baseHref,
}: {
  result: ArchivePage;
  query: ArchiveQuery;
  baseHref: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <form className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 lg:grid-cols-6">
        <Input name="search" defaultValue={query.search} placeholder="Назва, адреса, документ…" className="lg:col-span-2" />
        <Input name="archivedBy" defaultValue={query.archivedBy} placeholder="Хто архівував" />
        <Input name="archivedFrom" defaultValue={query.archivedFrom} type="date" aria-label="Архівовано від" />
        <Input name="archivedTo" defaultValue={query.archivedTo} type="date" aria-label="Архівовано до" />
        <select
          name="previousStatus"
          defaultValue={query.previousStatus ?? ""}
          className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-3 text-sm"
        >
          <option value="">Попередній статус</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RETURNED">RETURNED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <select
          name="pageSize"
          defaultValue={String(result.pageSize)}
          className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-3 text-sm"
        >
          <option value="10">10 на сторінці</option>
          <option value="20">20 на сторінці</option>
          <option value="50">50 на сторінці</option>
        </select>
        <div className="flex gap-2 lg:col-span-5 lg:justify-end">
          <Button type="submit">Застосувати</Button>
          <Button asChild type="button" variant="secondary">
            <Link href={baseHref}>Очистити</Link>
          </Button>
        </div>
      </form>

      <ArchiveTable projects={result.projects} baseHref={baseHref} />

      <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <span>Знайдено: {result.total}</span>
        <div className="flex items-center gap-3">
          {result.page > 1 ? (
            <Link className="font-semibold hover:text-[var(--color-accent)]" href={pageHref(baseHref, query, result.page - 1)}>
              Назад
            </Link>
          ) : null}
          <span>{result.page} / {result.totalPages}</span>
          {result.page < result.totalPages ? (
            <Link className="font-semibold hover:text-[var(--color-accent)]" href={pageHref(baseHref, query, result.page + 1)}>
              Далі
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
