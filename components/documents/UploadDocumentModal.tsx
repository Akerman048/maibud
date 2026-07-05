"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { FileUploadBox } from "@/components/ui/FileUploadBox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type UploadDocumentModalProps = {
  onClose: () => void;
};

export function UploadDocumentModal({
  onClose,
}: UploadDocumentModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.log("Завантажуємо документ");

    onClose();
  }

  return (
    <Modal
      title="Завантажити документ"
      description="Додайте файл до проєктної документації."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Назва документа
          </label>

          <Input
            name="name"
            placeholder="Наприклад: Пояснювальна записка"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">
            Проєкт
          </label>

          <Input
            name="project"
            placeholder="ЖК «Подільські вежі»"
            required
          />
        </div>

        <FileUploadBox name="document" />

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Скасувати
          </Button>

          <Button type="submit">
            Завантажити
          </Button>
        </div>
      </form>
    </Modal>
  );
}