"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import type { DocumentItem } from "@/types/document";
import type { DocumentPublicationActionState } from "@/types/document-publication-action";

type DocumentPublicationAction = (
  previousState: DocumentPublicationActionState,
  formData: FormData,
) => Promise<DocumentPublicationActionState>;

type DocumentPublicationActionsProps = {
  document: DocumentItem;
  publishAction: DocumentPublicationAction;
  unpublishAction: DocumentPublicationAction;
};

const initialState: DocumentPublicationActionState = {
  error: "",
  success: false,
};

export function DocumentPublicationActions({
  document,
  publishAction,
  unpublishAction,
}: DocumentPublicationActionsProps) {
  const action = document.isPublishedToClient
    ? unpublishAction
    : publishAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const canPublish = document.status === "approved";

  if (!document.isPublishedToClient && !canPublish) {
    return (
      <span className="max-w-56 text-right text-xs text-[var(--color-text-muted)]">
        Публікація доступна після погодження документа.
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input
          type="hidden"
          name="documentId"
          value={document.id}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={isPending}
        >
          {isPending
            ? "Збереження..."
            : document.isPublishedToClient
              ? "Приховати від клієнта"
              : "Опублікувати для клієнта"}
        </Button>
      </form>

      {state.error && (
        <span className="max-w-64 text-right text-xs font-medium text-red-600">
          {state.error}
        </span>
      )}
    </div>
  );
}
