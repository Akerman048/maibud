import { Input } from "@/components/ui/Input";

type DateRangeFilterProps = {
  fromName?: string;
  toName?: string;
  from?: string;
  to?: string;
  label?: string;
};

export function DateRangeFilter({
  fromName = "createdFrom",
  toName = "createdTo",
  from,
  to,
  label = "Дата",
}: DateRangeFilterProps) {
  return (
    <fieldset className="min-w-0 sm:col-span-2 lg:w-auto">
      <legend className="mb-1.5 text-sm font-semibold text-[var(--color-text-secondary)]">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs text-[var(--color-text-muted)]" htmlFor={fromName}>
          <span className="mb-1 block">Від</span>
          <Input
            id={fromName}
            name={fromName}
            type="date"
            defaultValue={from}
            aria-label={`${label} від`}
            className="lg:w-44"
          />
        </label>
        <label className="min-w-0 text-xs text-[var(--color-text-muted)]" htmlFor={toName}>
          <span className="mb-1 block">До</span>
          <Input
            id={toName}
            name={toName}
            type="date"
            defaultValue={to}
            aria-label={`${label} до`}
            className="lg:w-44"
          />
        </label>
      </div>
    </fieldset>
  );
}
