import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import { FilterBar } from "@/components/search/FilterBar";
import { SearchInput } from "@/components/search/SearchInput";
import { SortSelect } from "@/components/search/SortSelect";

export function DocumentListControls({ query, basePath, projects, authors = [], reviewers = [] }: { query: Record<string, string | undefined>; basePath: string; projects: Array<{ id: string; name: string }>; authors?: Array<{ id: string; name: string }>; reviewers?: Array<{ id: string; name: string }> }) {
  return <div className="grid gap-3"><SearchInput key={query.search ?? ""} defaultValue={query.search} label="Пошук документа" /><form action={basePath}><FilterBar>
    {query.search && <input type="hidden" name="search" value={query.search} />}
    {query.pageSize && <input type="hidden" name="pageSize" value={query.pageSize} />}
    {query.reviewedFrom && <input type="hidden" name="reviewedFrom" value={query.reviewedFrom} />}
    {query.reviewedTo && <input type="hidden" name="reviewedTo" value={query.reviewedTo} />}
    {query.archived && <input type="hidden" name="archived" value={query.archived} />}
    <label className="sr-only" htmlFor="document-status">Статус</label><Select id="document-status" name="status" defaultValue={query.status ?? ""} options={[{ value: "", label: "Усі статуси" }, { value: "DRAFT", label: "Чернетки" }, { value: "SUBMITTED", label: "На перевірці" }, { value: "APPROVED", label: "Схвалені" }, { value: "REJECTED", label: "Відхилені" }]} />
    <label className="sr-only" htmlFor="document-project">Проєкт</label><Select id="document-project" name="projectId" defaultValue={query.projectId ?? ""} options={[{ value: "", label: "Усі проєкти" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} />
    {authors.length > 0 && <><label className="sr-only" htmlFor="document-author">Автор</label><Select id="document-author" name="authorId" defaultValue={query.authorId ?? ""} options={[{ value: "", label: "Усі автори" }, ...authors.map((user) => ({ value: user.id, label: user.name }))]} /></>}
    {reviewers.length > 0 && <><label className="sr-only" htmlFor="document-reviewer">Рецензент</label><Select id="document-reviewer" name="reviewerId" defaultValue={query.reviewerId ?? ""} options={[{ value: "", label: "Усі рецензенти" }, ...reviewers.map((user) => ({ value: user.id, label: user.name }))]} /></>}
    <label className="sr-only" htmlFor="document-published">Публікація</label><Select id="document-published" name="published" defaultValue={query.published ?? "all"} options={[{ value: "all", label: "Будь-яка публікація" }, { value: "true", label: "Опубліковано клієнту" }, { value: "false", label: "Не опубліковано" }]} />
    <DateRangeFilter from={query.createdFrom} to={query.createdTo} label="Дата створення" />
    <SortSelect value={query.sortBy ?? "createdAt"} direction={query.sortDirection} options={[{ value: "createdAt", label: "За створенням" }, { value: "updatedAt", label: "За оновленням" }, { value: "title", label: "За назвою" }, { value: "status", label: "За статусом" }, { value: "reviewedAt", label: "За перевіркою" }]} />
    <Button type="submit">Застосувати</Button><Button asChild type="button" variant="secondary"><Link href={basePath}>Очистити фільтри</Link></Button>
  </FilterBar></form></div>;
}
