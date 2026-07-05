"use client";

import { useState } from "react";
import { FiFileText, FiUploadCloud, FiX } from "react-icons/fi";

type FileUploadBoxProps = {
  name?: string;
  accept?: string;
};

export function FileUploadBox({
  name = "file",
  accept = ".pdf,.doc,.docx,.dwg",
}: FileUploadBoxProps) {
  const [fileName, setFileName] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-slate-50 p-8 text-center hover:bg-slate-100">
        <FiUploadCloud className="mb-3 size-8 text-[var(--color-text-muted)]" />

        <span className="text-sm text-[var(--color-text-secondary)]">
          Перетягніть файл або{" "}
          <span className="font-semibold text-[var(--color-accent)]">
            оберіть на компʼютері
          </span>
        </span>

        <span className="mt-1 text-xs text-[var(--color-text-muted)]">
          PDF, DOC, DWG — до 25 МБ
        </span>

        <input
          name={name}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? "");
          }}
        />
      </label>

      {fileName && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3">
          <div className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-red-50 text-red-600">
            <FiFileText className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {fileName}
            </div>

            <div className="text-xs text-[var(--color-text-muted)]">
              Файл вибрано
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFileName("")}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}