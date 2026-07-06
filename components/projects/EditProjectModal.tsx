"use client";

import { useTransition } from "react";

import type { ExpertOption } from "@/types/project";

import type { Project } from "@/types/project";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";



type EditProjectModalProps = {
  project: Project;
  experts: ExpertOption[];
  updateProjectAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  onUpdated: () => void;
};

const stageOptions = [
  { label: "Первинна перевірка", value: "Первинна перевірка" },
  { label: "Експертиза", value: "Експертиза" },
  { label: "Доопрацювання", value: "Доопрацювання" },
  { label: "Фінальна перевірка", value: "Фінальна перевірка" },
];

export function EditProjectModal({
  project,
  experts,
  updateProjectAction,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateProjectAction(formData);
      onUpdated();
      onClose();
    });
  }

  const expertOptions = experts.map((expert) => ({
    label: expert.name,
    value: expert.id,
  }));

  return (
    <Modal
      title="Редагувати проєкт"
      description="Оновіть основну інформацію про проєкт."
      onClose={onClose}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={project.id} />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Назва проєкту</label>
          <Input name="name" defaultValue={project.name} required />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Адреса</label>
          <Input name="address" defaultValue={project.address} required />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Замовник</label>
          <Input name="customer" defaultValue={project.customer} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Етап</label>
            <Select
              name="stage"
              options={stageOptions}
              defaultValue={project.stage}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Експерт</label>
            <Select
              name="expert"
              options={expertOptions}
              defaultValue={experts[0]?.id ?? ""}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Дедлайн</label>
          <Input name="deadline" type="date" required />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Скасувати
          </Button>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}