"use client";

import { useMemo, useState } from "react";

import type { Project } from "@/types/project";import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { ProjectTable } from "@/components/projects/ProjectTable";
import type { ArchiveActionState } from "@/types/archive-action";

type ExpertOption = {
  id: string;
  name: string;
};

type ProjectsViewProps = {
  projects: Project[];
  baseHref?: string;
  experts?: ExpertOption[];
  archiveProjectAction?: (
    previousState: ArchiveActionState,
    formData: FormData,
  ) => Promise<ArchiveActionState>;
  updateProjectAction?: (formData: FormData) => Promise<void>;
};

export function ProjectsView({
  projects,
  baseHref = "/project",
  experts = [],
  updateProjectAction,
  archiveProjectAction,
}: ProjectsViewProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.address.toLowerCase().includes(search.toLowerCase()) ||
        project.customer.toLowerCase().includes(search.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active" &&
          project.status !== "resolved" &&
          project.status !== "overdue") ||
        (activeTab === "overdue" && project.status === "overdue") ||
        (activeTab === "completed" && project.status === "resolved");

      return matchesSearch && matchesTab;
    });
  }, [projects, activeTab, search]);

  const tabs = [
    { label: "Усі", value: "all", count: projects.length },
    {
      label: "Активні",
      value: "active",
      count: projects.filter(
        (project) =>
          project.status !== "resolved" && project.status !== "overdue",
      ).length,
    },
    {
      label: "Прострочені",
      value: "overdue",
      count: projects.filter((project) => project.status === "overdue").length,
    },
    {
      label: "Завершені",
      value: "completed",
      count: projects.filter((project) => project.status === "resolved").length,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-5">
        <div className="flex-1">
          <Tabs items={tabs} activeValue={activeTab} onChange={setActiveTab} />
        </div>

        <Input
          className="w-[280px]"
          placeholder="Пошук проєкту..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <ProjectTable
        projects={filteredProjects}
        baseHref={baseHref}
        experts={experts}
        updateProjectAction={updateProjectAction}
        archiveProjectAction={archiveProjectAction}
      />
    </>
  );
}
