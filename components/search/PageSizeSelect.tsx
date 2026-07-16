"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";

export function PageSizeSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <label className="flex items-center gap-2 text-sm">На сторінці<Select aria-label="Кількість на сторінці" value={String(value)} options={[10, 20, 50].map((size) => ({ value: String(size), label: String(size) }))} onChange={(event) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", event.target.value); params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }} /></label>;
}
