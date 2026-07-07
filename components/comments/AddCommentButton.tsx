"use client";

import { useState } from "react";
import { FiMessageSquare } from "react-icons/fi";

import type { DocumentItem } from "@/types/document";
import { AddCommentModal } from "@/components/comments/AddCommentModal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

type AddCommentButtonProps = {
  projectId: string;
  documents: DocumentItem[];
  createCommentAction: (formData: FormData) => Promise<void>;
};

export function AddCommentButton({
  projectId,
  documents,
  createCommentAction,
}: AddCommentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <FiMessageSquare className="mr-2 size-4" />
        Додати зауваження
      </Button>

      {isOpen && (
        <AddCommentModal
          projectId={projectId}
          documents={documents}
          createCommentAction={createCommentAction}
          onClose={() => setIsOpen(false)}
          onCreated={() => setToastMessage("Зауваження створено.")}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </>
  );
}