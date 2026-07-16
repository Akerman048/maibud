"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/Select";
import type { DashboardDateRange } from "@/types/dashboard";

const options = [
  { value: "7d", label: "7 днів" },
  { value: "30d", label: "30 днів" },
  { value: "90d", label: "90 днів" },
  { value: "all", label: "Увесь час" },
];

export function DashboardDateRangeFilter({ value }: { value: DashboardDateRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
      Період
      <Select
        aria-label="Період статистики та активності"
        value={value}
        options={options}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("range", event.target.value);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
      />
    </label>
  );
}
