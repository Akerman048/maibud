"use client";

import { useRef, useState } from "react";
import { FiUploadCloud, FiX } from "react-icons/fi";

type FileUploadBoxProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export function FileUploadBox({
  file,
  onFileChange,
  disabled = false,
}: FileUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile) return;
    onFileChange(selectedFile);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);

        if (!disabled) {
          selectFile(event.dataTransfer.files[0]);
        }
      }}
      className={`min-w-0 rounded-[var(--radius-lg)] border-2 border-dashed p-4 text-center transition sm:p-6 ${
        isDragging
          ? "border-[var(--color-accent)] bg-blue-50"
          : "border-[var(--color-border)]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled}
        accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg,.dwg"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 text-left">
            <div className="break-all font-semibold">{file.name}</div>

            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>

          <button
            type="button"
            aria-label={`Видалити файл ${file.name}`}
            disabled={disabled}
            onClick={() => onFileChange(null)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <FiX className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <FiUploadCloud className="mx-auto size-8 text-[var(--color-accent)]" />

          <p className="mt-3 font-semibold">
            Перетягніть файл сюди або оберіть вручну
          </p>

          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-3 min-h-11 rounded-md px-3 text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            Обрати файл
          </button>
        </>
      )}
    </div>
  );
}
