"use client";

import { useState } from "react";
import { FiUpload } from "react-icons/fi";

import type { ProjectOption } from "@/types/project";
import { UploadDocumentModal } from "@/components/documents/UploadDocumentModal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

type UploadDocumentButtonProps = {
  projects: ProjectOption[];
  createDocumentAction: (formData: FormData) => Promise<void>;
};

export function UploadDocumentButton({
  projects,
  createDocumentAction,
}: UploadDocumentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  function handleUploaded() {
    setToastMessage("Документ додано.");
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <FiUpload className="mr-2 size-4" />
        Завантажити документ
      </Button>

      {isOpen && (
        <UploadDocumentModal
          projects={projects}
          createDocumentAction={createDocumentAction}
          onClose={() => setIsOpen(false)}
          onUploaded={handleUploaded}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </>
  );
}