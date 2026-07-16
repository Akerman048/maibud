import { Input } from "@/components/ui/Input";

export function DateRangeFilter({ fromName = "createdFrom", toName = "createdTo", from, to, label = "Дата" }: { fromName?: string; toName?: string; from?: string; to?: string; label?: string }) {
  return <><label className="sr-only" htmlFor={fromName}>{label} від</label><Input id={fromName} name={fromName} type="date" defaultValue={from} aria-label={`${label} від`} /><label className="sr-only" htmlFor={toName}>{label} до</label><Input id={toName} name={toName} type="date" defaultValue={to} aria-label={`${label} до`} /></>;
}
