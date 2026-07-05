"use client";

import { useState } from "react";
import { FiUpload } from "react-icons/fi";

import { Button } from "@/components/ui/Button";
import { UploadDocumentModal } from "@/components/documents/UploadDocumentModal";

export function UploadDocumentButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <FiUpload className="mr-2 size-4" />
        Завантажити документ
      </Button>

      {isOpen && (
        <UploadDocumentModal onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}