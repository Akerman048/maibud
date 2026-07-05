import { FiLink } from "react-icons/fi";

export default function InactiveProjectLinkPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-8">
      <div className="flex min-h-[520px] w-full max-w-[880px] flex-col items-center justify-center rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <div className="mb-5 flex size-[72px] items-center justify-center rounded-full bg-slate-100 text-[var(--color-text-muted)]">
          <FiLink className="size-8" />
        </div>

        <h1 className="text-[22px] font-semibold">
          Посилання неактивне
        </h1>

        <p className="mt-2 max-w-[400px] text-base leading-relaxed text-[var(--color-text-secondary)]">
          Доступ до цієї сторінки було вимкнено. Зверніться до вашого
          проєктувальника, щоб отримати нове посилання.
        </p>

        <div className="mt-7 text-[13px] text-[var(--color-text-muted)]">
          Powered by{" "}
          <strong className="text-[var(--color-text-secondary)]">
            ExpertDesk
          </strong>
        </div>
      </div>
    </main>
  );
}