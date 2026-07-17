"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ArchiveActionState } from "@/types/archive-action";

type ArchiveAction = (
  previousState: ArchiveActionState,
  formData: FormData,
) => Promise<ArchiveActionState>;

const initialState: ArchiveActionState = { error: "", success: false };

export function ArchiveActionDialog({
  action,
  entity,
  entityId,
  entityName,
  mode,
  onClose,
}: {
  action: ArchiveAction;
  entity: "project" | "document";
  entityId: string;
  entityName: string;
  mode: "archive" | "restore";
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isArchive = mode === "archive";
  const entityLabel = entity === "project" ? "проєкт" : "документ";

  useEffect(() => {
    if (state.success) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.success]);

  return (
    <Modal
      title={isArchive ? `Архівувати ${entityLabel}` : `Відновити ${entityLabel}`}
      description={`«${entityName}»`}
      onClose={onClose}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input
          type="hidden"
          name={entity === "project" ? "projectId" : "documentId"}
          value={entityId}
        />

        {isArchive ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`archive-reason-${entityId}`} className="text-sm font-semibold">
              Причина (необов’язково)
            </label>
            <textarea
              id={`archive-reason-${entityId}`}
              name="reason"
              maxLength={1000}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-3.5 py-3 text-base outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-blue-500/15 sm:text-sm"
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              Публікація для клієнта буде знята автоматично.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Відновлення не публікує документи для клієнта автоматично.
          </p>
        )}

        {state.error ? <p className="text-sm font-medium text-red-600">{state.error}</p> : null}

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="w-full sm:w-auto">
            Скасувати
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className={`w-full sm:w-auto ${isArchive ? "bg-red-600 hover:bg-red-700" : ""}`}
          >
            {isPending
              ? "Збереження…"
              : isArchive
                ? "Перемістити в архів"
                : "Відновити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
