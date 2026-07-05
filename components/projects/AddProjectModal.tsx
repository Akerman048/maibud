"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

type AddProjectModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

const stageOptions = [
  {
    label: "Оберіть етап",
    value: "",
  },
  {
    label: "Первинна перевірка",
    value: "initial-review",
  },
  {
    label: "Експертиза",
    value: "expertise",
  },
  {
    label: "Доопрацювання",
    value: "revision",
  },
  {
    label: "Фінальна перевірка",
    value: "final-review",
  },
];

const expertOptions = [
  {
    label: "Оберіть експерта",
    value: "",
  },
  {
    label: "Коваль Олег · Газопостачання",
    value: "oleh-koval",
  },
  {
    label: "Мельник Ірина · Вентиляція",
    value: "iryna-melnyk",
  },
  {
    label: "Шевченко Андрій · Пожежна безпека",
    value: "andrii-shevchenko",
  },
];

export function AddProjectModal({
  onClose,
  onCreated,
}: AddProjectModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onCreated();
    onClose();
  }

  return (
    <Modal
      title="Додати проєкт"
      description="Створіть новий проєкт для проходження експертизи."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Назва проєкту
          </label>

          <Input
            name="name"
            placeholder="Наприклад: ЖК «Подільські вежі»"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Адреса
          </label>

          <Input
            name="address"
            placeholder="вул. Кирилівська, 41, м. Київ"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Замовник
          </label>

          <Input
            name="customer"
            placeholder="ТОВ «Поділ Девелопмент»"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">
              Етап
            </label>

            <Select
              name="stage"
              options={stageOptions}
              defaultValue=""
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">
              Експерт
            </label>

            <Select
              name="expert"
              options={expertOptions}
              defaultValue=""
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Дедлайн
          </label>

          <Input
            name="deadline"
            type="date"
            required
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Скасувати
          </Button>

          <Button type="submit">
            Створити проєкт
          </Button>
        </div>
      </form>
    </Modal>
  );
}