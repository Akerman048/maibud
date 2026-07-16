"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/Input";

export function SearchInput({ defaultValue = "", label = "Пошук" }: { defaultValue?: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(queryString);
      const normalized = value.trim().replace(/\s+/g, " ").slice(0, 200);
      if (normalized === (params.get("search") ?? "")) return;
      if (normalized) params.set("search", normalized);
      else params.delete("search");
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [pathname, queryString, router, value]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor="list-search" className="sr-only">{label}</label>
      <Input id="list-search" type="search" maxLength={200} value={value} onChange={(event) => setValue(event.target.value)} placeholder={`${label}…`} className="min-w-0 flex-1" />
      {value && <button type="button" onClick={() => setValue("")} className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">Очистити</button>}
    </div>
  );
}
