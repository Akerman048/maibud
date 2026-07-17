"use client";

import { FiCopy } from "react-icons/fi";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type ShareProjectModalProps = {
  onClose: () => void;
  onCopied: () => void;
};

export function ShareProjectModal({
  onClose,
  onCopied,
}: ShareProjectModalProps) {
  const shareLink = "https://maibud.ua/share/pd-vezhi-8f3k2m";

  return (
    <Modal
      title="Поділитись із замовником"
      description="Замовник бачитиме стан експертизи та зауважень без права редагування."
      onClose={onClose}
    >
        <div className="mb-5 flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Посилання для перегляду
          </label>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Input
              readOnly
              value={shareLink}
              className="flex-1 font-mono text-[13.5px]"
            />

            <Button type="button" className="w-full sm:w-auto" onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareLink);
                onCopied();
              } catch {
                console.error("Не вдалося скопіювати посилання");
              }
            }}>
              <FiCopy className="mr-2 size-4" />
              Копіювати
            </Button>
          </div>
        </div>

        <div className="flex justify-stretch sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Закрити
          </Button>
        </div>
    </Modal>
  );
}
