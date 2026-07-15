"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { DocumentReviewActionState } from "@/types/document-review-action";

type DocumentReviewAction = (
  previousState: DocumentReviewActionState,
  formData: FormData,
) => Promise<DocumentReviewActionState>;

type DocumentReviewActionsProps = {
  documentId: string;
  documentName: string;
  approveAction: DocumentReviewAction;
  rejectAction: DocumentReviewAction;
};

const initialState: DocumentReviewActionState = {
  error: "",
  success: false,
};

function RejectDocumentModal({
  documentId,
  documentName,
  action,
  onClose,
}: {
  documentId: string;
  documentName: string;
  action: DocumentReviewAction;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.success]);

  return (
    <Modal
      title="Відхилити документ"
      description={`Документ: ${documentName}`}
      onClose={onClose}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="documentId" value={documentId} />

        <div className="flex flex-col gap-2">
          <label
            htmlFor={`rejectionReason-${documentId}`}
            className="text-sm font-semibold"
          >
            Причина відхилення
          </label>
          <textarea
            id={`rejectionReason-${documentId}`}
            name="rejectionReason"
            minLength={5}
            maxLength={2000}
            required
            disabled={isPending}
            className="min-h-32 resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] disabled:bg-slate-50"
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Скасувати
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Відхилення..." : "Відхилити документ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DocumentReviewActions({
  documentId,
  documentName,
  approveAction,
  rejectAction,
}: DocumentReviewActionsProps) {
  const router = useRouter();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approveState, approveFormAction, isApproving] =
    useActionState(approveAction, initialState);

  useEffect(() => {
    if (approveState.success) {
      router.refresh();
    }
  }, [approveState.success, router]);

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <form action={approveFormAction}>
            <input
              type="hidden"
              name="documentId"
              value={documentId}
            />
            <Button type="submit" disabled={isApproving}>
              {isApproving ? "Погодження..." : "Погодити"}
            </Button>
          </form>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsRejectOpen(true)}
            disabled={isApproving}
          >
            Відхилити
          </Button>
        </div>

        {approveState.error && (
          <p className="max-w-72 text-right text-xs font-medium text-red-600">
            {approveState.error}
          </p>
        )}
      </div>

      {isRejectOpen && (
        <RejectDocumentModal
          documentId={documentId}
          documentName={documentName}
          action={rejectAction}
          onClose={() => setIsRejectOpen(false)}
        />
      )}
    </>
  );
}
