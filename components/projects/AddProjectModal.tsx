"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

type ExpertOption = {
  id: string;
  name: string;
};

type AddProjectModalProps = {
  experts: ExpertOption[];
  createProjectAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  onCreated: () => void;
};

const stageOptions = [
  { label: "Оберіть етап", value: "" },
  { label: "Первинна перевірка", value: "Первинна перевірка" },
  { label: "Експертиза", value: "Експертиза" },
  { label: "Доопрацювання", value: "Доопрацювання" },
  { label: "Фінальна перевірка", value: "Фінальна перевірка" },
];

export function AddProjectModal({
  experts = [],
  createProjectAction,
  onClose,
  onCreated,
}: AddProjectModalProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createProjectAction(formData);
      onCreated();
      onClose();
    });
  }

  const expertOptions = [
    { label: "Оберіть експерта", value: "" },
    ...(experts ?? []).map((expert) => ({
      label: expert.name,
      value: expert.id,
    })),
  ];

  return (
    <Modal
      title="Додати проєкт"
      description="Створіть новий проєкт для проходження експертизи."
      onClose={onClose}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Назва проєкту</label>
          <Input
            name="name"
            placeholder="Наприклад: ЖК «Подільські вежі»"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Адреса</label>
          <Input
            name="address"
            placeholder="вул. Кирилівська, 41, м. Київ"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Замовник</label>
          <Input
            name="customer"
            placeholder="ТОВ «Поділ Девелопмент»"
            required
          />{" "}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Етап</label>
            <Select
              name="stage"
              options={stageOptions}
              defaultValue=""
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Експерт</label>
            <Select
              name="expert"
              options={expertOptions}
              defaultValue=""
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
            {isPending ? "Створення..." : "Створити проєкт"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
