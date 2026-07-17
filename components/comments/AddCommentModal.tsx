"use client";

import { useActionState, useEffect } from "react";

import type { DocumentItem } from "@/types/document";
import type { CommentThreadActionState } from "@/types/comment-thread";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type AddCommentModalProps = {
  projectId: string;
  documents: DocumentItem[];
  createCommentAction: (
    previousState: CommentThreadActionState,
    formData: FormData,
  ) => Promise<CommentThreadActionState>;
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
  const [state, formAction, isPending] = useActionState(
    createCommentAction,
    { error: "", success: false },
  );

  useEffect(() => {
    if (state.success) {
      onCreated();
      onClose();
    }
  }, [onClose, onCreated, state.success]);

  const documentOptions = [
    { label: "Оберіть документ", value: "" },
    ...documents.map((document) => ({
      label: document.name,
      value: document.id,
    })),
  ];
  const versionOptions = [
    { label: "Без привʼязки до версії", value: "" },
    ...documents.flatMap((document) =>
      document.versions.map((version) => ({
        label: `${document.name} · v${version.version}`,
        value: version.id,
      })),
    ),
  ];

  return (
    <Modal
      title="Додати зауваження"
      description="Створіть зауваження до документа проєкту."
      onClose={onClose}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="projectId" value={projectId} />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Документ</label>
          <Select name="documentId" options={documentOptions} defaultValue="" required />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Версія документа</label>
          <Select
            name="documentVersionId"
            options={versionOptions}
            defaultValue=""
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Якщо обираєте версію, переконайтеся, що вона належить документу вище.
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Заголовок</label>
            <Input name="title" maxLength={200} placeholder="Необовʼязково" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Розділ</label>
            <Input name="section" maxLength={200} placeholder="Необовʼязково" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Зауваження</label>
          <Textarea
            name="content"
            required
            placeholder="Опишіть, що потрібно виправити…"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {state.error}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Скасувати
          </Button>

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Створення..." : "Створити зауваження"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
