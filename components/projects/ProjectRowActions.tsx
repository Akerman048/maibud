"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Project } from "@/types/project";
import { EditProjectModal } from "@/components/projects/EditProjectModal";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Toast } from "@/components/ui/Toast";

type ExpertOption = {
  id: string;
  name: string;
};

type ProjectRowActionsProps = {
  project: Project;
  baseHref: string;
  experts?: ExpertOption[];
  updateProjectAction?: (formData: FormData) => Promise<void>;
  archiveProjectAction?: (projectId: string) => Promise<void>;
};

export function ProjectRowActions({
  project,
  baseHref,
  experts = [],
  updateProjectAction,
  archiveProjectAction,
}: ProjectRowActionsProps) {
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  return (
    <>
      <DropdownMenu
        items={[
          {
            label: "Відкрити",
            onClick: () => router.push(`${baseHref}/${project.id}`),
          },
          {
            label: "Редагувати",
            onClick: () => setIsEditOpen(true),
          },
          {
            label: "Поділитись",
            onClick: () => setToastMessage("Посилання на проєкт скопійовано."),
          },
          {
            label: "Архівувати",
            danger: true,
            onClick: async () => {
              if (!archiveProjectAction) return;

              await archiveProjectAction(project.id);
              setToastMessage("Проєкт переміщено в архів.");
            },
          },
        ]}
      />

      {isEditOpen && updateProjectAction && (
        <EditProjectModal
          project={project}
          experts={experts}
          updateProjectAction={updateProjectAction}
          onClose={() => setIsEditOpen(false)}
          onUpdated={() => setToastMessage("Проєкт оновлено.")}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </>
  );
}