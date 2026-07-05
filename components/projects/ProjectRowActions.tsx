"use client";

import { useRouter } from "next/navigation";

import { DropdownMenu } from "@/components/ui/DropdownMenu";

type ProjectRowActionsProps = {
  projectId: string;
  baseHref: string;
};

export function ProjectRowActions({
  projectId,
  baseHref,
}: ProjectRowActionsProps) {
  const router = useRouter();

  return (
    <DropdownMenu
      items={[
        {
          label: "Відкрити",
          onClick: () => router.push(`${baseHref}/${projectId}`),
        },
        {
          label: "Поділитись",
          onClick: () => console.log("share project", projectId),
        },
        {
          label: "Архівувати",
          danger: true,
          onClick: () => console.log("archive project", projectId),
        },
      ]}
    />
  );
}