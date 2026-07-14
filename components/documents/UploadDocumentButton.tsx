"use client";

import { useState } from "react";
import { FiUpload } from "react-icons/fi";

import type { ProjectOption } from "@/types/project";
import { UploadDocumentModal } from "@/components/documents/UploadDocumentModal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

type UploadDocumentButtonProps = {
  projects: ProjectOption[];
};

export function UploadDocumentButton({ projects }: UploadDocumentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");


  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <FiUpload className="mr-2 size-4" />
        Завантажити документ
      </Button>

      {isOpen && (
        <UploadDocumentModal
          projects={projects}
          onClose={() => setIsOpen(false)}
          onUploaded={() => setToastMessage("Документ успішно завантажено.")}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </>
  );
}
