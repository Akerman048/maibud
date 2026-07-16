import Link from "next/link";
import { SearchInput } from "@/components/search/SearchInput";
import { FilterBar } from "@/components/search/FilterBar";
import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export function CommentListControls({ query, basePath, projects }: { query: Record<string, string | undefined>; basePath: string; projects: Array<{ id: string; name: string }> }) {
  return <div className="grid gap-3"><SearchInput key={query.search ?? ""} defaultValue={query.search} label="Пошук обговорення" /><form action={basePath}><FilterBar>
    {query.search && <input type="hidden" name="search" value={query.search} />}
    {query.pageSize && <input type="hidden" name="pageSize" value={query.pageSize} />}
    {query.documentId && <input type="hidden" name="documentId" value={query.documentId} />}
    {query.createdById && <input type="hidden" name="createdById" value={query.createdById} />}
    <label className="sr-only" htmlFor="thread-status">Статус</label><Select id="thread-status" name="status" defaultValue={query.status ?? ""} options={[{ value: "", label: "Усі статуси" }, { value: "OPEN", label: "Відкриті" }, { value: "RESOLVED", label: "Виконані" }, { value: "RETURNED", label: "Повернуті" }]} />
    <label className="sr-only" htmlFor="thread-project">Проєкт</label><Select id="thread-project" name="projectId" defaultValue={query.projectId ?? ""} options={[{ value: "", label: "Усі проєкти" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} />
    <DateRangeFilter fromName="updatedFrom" toName="updatedTo" from={query.updatedFrom} to={query.updatedTo} label="Оновлено" />
    <label className="sr-only" htmlFor="thread-sort">Напрям сортування</label><Select id="thread-sort" name="sortDirection" defaultValue={query.sortDirection ?? "desc"} options={[{ value: "desc", label: "Спочатку оновлені" }, { value: "asc", label: "Спочатку давні" }]} />
    <Button type="submit">Застосувати</Button><Button asChild type="button" variant="secondary"><Link href={basePath}>Очистити фільтри</Link></Button>
  </FilterBar></form></div>;
}
