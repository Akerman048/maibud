"use client";

import { useTransition } from "react";

import type { DocumentItem } from "@/types/document";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type AddCommentModalProps = {
  projectId: string;
  documents: DocumentItem[];
  createCommentAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  onCreated: () => void;
};

export function AddCommentModal({
  projectId,
  documents,
  createCommentAction,
  onClose,
  onCreated,
}: AddCommentModalProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createCommentAction(formData);
      onCreated();
      onClose();
    });
  }

  const documentOptions = [
    { label: "Оберіть документ", value: "" },
    ...documents.map((document) => ({
      label: document.name,
      value: document.id,
    })),
  ];

  return (
    <Modal
      title="Додати зауваження"
      description="Створіть зауваження до документа проєкту."
      onClose={onClose}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="projectId" value={projectId} />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Документ</label>
          <Select name="documentId" options={documentOptions} defaultValue="" required />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Зауваження</label>
          <Textarea
            name="content"
            required
            placeholder="Опишіть, що потрібно виправити…"
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Скасувати
          </Button>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Створення..." : "Створити зауваження"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}