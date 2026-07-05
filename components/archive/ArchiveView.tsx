"use client";

import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";

import type { ArchiveProject } from "@/data/mockArchiveProjects";
import { Input } from "@/components/ui/Input";
import { ArchiveTable } from "@/components/archive/ArchiveTable";

type ArchiveViewProps = {
  projects: ArchiveProject[];
  baseHref: string;
};

export function ArchiveView({
  projects,
  baseHref,
}: ArchiveViewProps) {
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedSearch),
    );
  }, [projects, search]);

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="relative w-[320px]">
        <FiSearch className="absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[var(--color-text-muted)]" />

        <Input
          className="w-full pl-10"
          placeholder="Пошук в архіві..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

     <ArchiveTable
  projects={filteredProjects}
  baseHref={baseHref}
/>
    </div>
  );
}