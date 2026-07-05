import { FiCheckCircle, FiX } from "react-icons/fi";

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[360px] items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-[var(--color-success)]">
        <FiCheckCircle className="size-5" />
      </div>

      <div className="flex-1">
        <div className="font-semibold">Готово</div>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {message}
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
  );
}