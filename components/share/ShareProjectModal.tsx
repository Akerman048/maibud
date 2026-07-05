"use client";

import { FiCopy, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ShareProjectModalProps = {
  onClose: () => void;
  onCopied: () => void;
};

export function ShareProjectModal({
  onClose,
  onCopied,
}: ShareProjectModalProps) {
  const shareLink = "https://expertdesk.ua/share/pd-vezhi-8f3k2m";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6">
      <div className="w-full max-w-[480px] rounded-[14px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.3)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Поділитись із замовником</h2>

            <p className="mt-1 text-[14.5px] text-[var(--color-text-secondary)]">
              Замовник бачитиме стан експертизи та зауважень без права
              редагування.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="size-4" />
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Посилання для перегляду
          </label>

          <div className="flex gap-2.5">
            <Input
              readOnly
              value={shareLink}
              className="flex-1 font-mono text-[13.5px]"
            />

            <Button
  type="button"
  onClick={async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      onCopied();
    } catch {
      console.error("Не вдалося скопіювати посилання");
    }
  }}
>
  <FiCopy className="mr-2 size-4" />
  Копіювати
</Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрити
          </Button>
        </div>
      </div>
    </div>
  );
}
