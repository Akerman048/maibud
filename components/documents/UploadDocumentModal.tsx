"use client";

import { useTransition } from "react";

import type { ProjectOption } from "@/types/project";
import { Button } from "@/components/ui/Button";
import { FileUploadBox } from "@/components/ui/FileUploadBox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

type UploadDocumentModalProps = {
  projects: ProjectOption[];
  createDocumentAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  onUploaded: () => void;
};

export function UploadDocumentModal({
  projects,
  createDocumentAction,
  onClose,
  onUploaded,
}: UploadDocumentModalProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createDocumentAction(formData);
      onUploaded();
      onClose();
    });
  }

  const projectOptions = [
    { label: "Оберіть проєкт", value: "" },
    ...projects.map((project) => ({
      label: project.name,
      value: project.id,
    })),
  ];

  return (
    <Modal
      title="Завантажити документ"
      description="Додайте файл до проєктної документації."
      onClose={onClose}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Назва документа</label>

          <Input
            name="name"
            placeholder="Наприклад: Пояснювальна записка"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Проєкт</label>

          <Select
            name="projectId"
            options={projectOptions}
            defaultValue=""
            required
          />
        </div>

        <FileUploadBox name="document" />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Скасувати
          </Button>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Завантаження..." : "Завантажити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}