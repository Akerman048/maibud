import { Select } from "@/components/ui/Select";

export function SortSelect({ value, options, direction = "desc" }: { value: string; options: Array<{ value: string; label: string }>; direction?: string }) {
  return <><label className="sr-only" htmlFor="sort-by">Сортування</label><Select id="sort-by" name="sortBy" defaultValue={value} options={options} /><label className="sr-only" htmlFor="sort-direction">Напрям сортування</label><Select id="sort-direction" name="sortDirection" defaultValue={direction} options={[{ value: "desc", label: "Спочатку нові" }, { value: "asc", label: "Спочатку старі" }]} /></>;
}
