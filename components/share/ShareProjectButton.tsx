"use client";

import { useState } from "react";
import { FiShare2 } from "react-icons/fi";

import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ShareProjectModal } from "@/components/share/ShareProjectModal";

export function ShareProjectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  function handleCopied() {
    setToastMessage("Посилання скопійовано в буфер обміну.");
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <FiShare2 className="mr-2 size-4" />
        Поділитись із замовником
      </Button>

      {isOpen && (
        <ShareProjectModal
          onClose={() => setIsOpen(false)}
          onCopied={handleCopied}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}
    </>
  );
}