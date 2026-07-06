"use client";

import { useState } from "react";

import { AddProjectModal } from "@/components/projects/AddProjectModal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

type ExpertOption = {
  id: string;
  name: string;
};

type AddProjectButtonProps = {
  experts: ExpertOption[];
  createProjectAction: (formData: FormData) => Promise<void>;
};

export function AddProjectButton({
  experts,
  createProjectAction,
}: AddProjectButtonProps) {
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
          experts={experts}
          createProjectAction={createProjectAction}
          onClose={() => setIsOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </>
  );
}