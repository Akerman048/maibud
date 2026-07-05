"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";

type ReturnRemarkModalProps = {
  projectName: string;
  onClose: () => void;
  onReturn: () => void;
};

export function ReturnRemarkModal({
  projectName,
  onClose,
  onReturn,
}: ReturnRemarkModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onReturn();
    onClose();
  }

  return (
    <Modal
      title="Повернути на доробку?"
      description={`Зауваження до проєкту ${projectName} отримає статус «Повернуто».`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Коментар <span className="text-red-600">*</span>
          </label>

          <Textarea
            required
            placeholder="Поясніть, що саме потрібно доопрацювати…"
            defaultValue="Потужність не підтверджена розрахунком — додайте розрахунок навантажень."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Скасувати
          </Button>

          <Button type="submit" className="bg-red-600 hover:bg-red-700">
            Повернути
          </Button>
        </div>
      </form>
    </Modal>
  );
}