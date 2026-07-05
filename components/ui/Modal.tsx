import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";

type ModalProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, description, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6">
      <div className="w-full max-w-[440px] rounded-[14px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.3)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>

            {description && (
              <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="size-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}