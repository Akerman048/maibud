import Link from "next/link";
import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import { FilterBar } from "@/components/search/FilterBar";
import { SearchInput } from "@/components/search/SearchInput";
import { SortSelect } from "@/components/search/SortSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Option = { id: string; name: string };

export function ProjectListControls({ query, basePath, showInternalFilters = true, experts = [], designers = [] }: { query: Record<string, string | undefined>; basePath: string; showInternalFilters?: boolean; experts?: Option[]; designers?: Option[] }) {
  return <div className="grid gap-3">
    <SearchInput key={query.search ?? ""} defaultValue={query.search} label="Пошук проєкту" />
    <form action={basePath}><FilterBar>
      {query.search && <input type="hidden" name="search" value={query.search} />}
      {query.pageSize && <input type="hidden" name="pageSize" value={query.pageSize} />}
      {query.archived && <input type="hidden" name="archived" value={query.archived} />}
      {showInternalFilters && <>
        <label className="sr-only" htmlFor="project-status">Статус</label>
        <Select id="project-status" name="status" defaultValue={query.status ?? ""} options={[{ value: "", label: "Усі статуси" }, { value: "OPEN", label: "Відкриті" }, { value: "IN_PROGRESS", label: "У роботі" }, { value: "RETURNED", label: "Повернуті" }, { value: "COMPLETED", label: "Завершені" }]} />
        <label className="sr-only" htmlFor="project-customer">Замовник</label>
        <Input id="project-customer" name="customer" defaultValue={query.customer} placeholder="Замовник" />
        {experts.length > 0 && <><label className="sr-only" htmlFor="project-expert">Експерт</label><Select id="project-expert" name="expertId" defaultValue={query.expertId ?? ""} options={[{ value: "", label: "Усі експерти" }, ...experts.map((user) => ({ value: user.id, label: user.name }))]} /></>}
        {designers.length > 0 && <><label className="sr-only" htmlFor="project-designer">Проєктувальник</label><Select id="project-designer" name="designerId" defaultValue={query.designerId ?? ""} options={[{ value: "", label: "Усі проєктувальники" }, ...designers.map((user) => ({ value: user.id, label: user.name }))]} /></>}
        <DateRangeFilter from={query.createdFrom} to={query.createdTo} label="Дата створення" />
        <DateRangeFilter fromName="deadlineFrom" toName="deadlineTo" from={query.deadlineFrom} to={query.deadlineTo} label="Дедлайн" />
      </>}
      <SortSelect value={query.sortBy ?? "createdAt"} direction={query.sortDirection} options={[{ value: "createdAt", label: "За датою створення" }, { value: "updatedAt", label: "За оновленням" }, { value: "deadline", label: "За дедлайном" }, { value: "name", label: "За назвою" }, { value: "status", label: "За статусом" }]} />
      <Button type="submit">Застосувати</Button><Button asChild type="button" variant="secondary"><Link href={basePath}>Очистити фільтри</Link></Button>
    </FilterBar></form>
  </div>;
}
