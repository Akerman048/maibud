"use client";

import { FiUploadCloud } from "react-icons/fi";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type UploadDocumentModalProps = {
  onClose: () => void;
};

export function UploadDocumentModal({ onClose }: UploadDocumentModalProps) {
  return (
    <Modal
      title="Завантажити документ"
      description="Додайте файл до проєктної документації."
      onClose={onClose}
    >
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Назва документа</label>
          <Input placeholder="Наприклад: Пояснювальна записка" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Проєкт</label>
          <Input placeholder="ЖК «Подільські вежі»" />
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-slate-50 p-8 text-center hover:bg-slate-100">
          <FiUploadCloud className="mb-3 size-8 text-[var(--color-text-muted)]" />

          <span className="text-sm text-[var(--color-text-secondary)]">
            Перетягніть файл або{" "}
            <span className="font-semibold text-[var(--color-accent)]">
              оберіть на компʼютері
            </span>
          </span>

          <span className="mt-1 text-xs text-[var(--color-text-muted)]">
            PDF, DOC, DWG — до 25 МБ
          </span>

          <input type="file" className="hidden" />
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Скасувати
          </Button>

          <Button type="submit">Завантажити</Button>
        </div>
      </form>
    </Modal>
  );
}