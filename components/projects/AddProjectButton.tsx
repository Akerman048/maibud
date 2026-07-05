"use client";

import { useState } from "react";

import { AddProjectModal } from "@/components/projects/AddProjectModal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

export function AddProjectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  function handleCreated() {
    setToastMessage("Проєкт успішно створено.");
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        Додати проєкт
      </Button>

      {isOpen && (
        <AddProjectModal
          onClose={() => setIsOpen(false)}
          onCreated={handleCreated}
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