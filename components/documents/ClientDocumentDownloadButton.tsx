"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";

type ClientDocumentDownloadButtonProps = {
  documentId: string;
};

type DownloadResponse = {
  downloadUrl?: string;
  error?: string;
};

export function ClientDocumentDownloadButton({
  documentId,
}: ClientDocumentDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/client/documents/${documentId}/download`,
      );
      const data = (await response.json()) as DownloadResponse;

      if (!response.ok || !data.downloadUrl) {
        throw new Error(data.error ?? "Не вдалося завантажити документ");
      }

      window.location.assign(data.downloadUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Не вдалося завантажити документ",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiDownload className="size-4" />
        {isDownloading ? "Завантаження..." : "Завантажити"}
      </button>

      {error && (
        <span className="max-w-56 text-right text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
