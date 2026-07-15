"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDownload, FiExternalLink } from "react-icons/fi";

import type { DocumentVersionItem } from "@/types/document";

import { UploadDocumentVersionModal } from "@/components/documents/UploadDocumentVersionModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type DocumentVersionsProps = {
  documentId: string;
  documentName: string;
  canUpload?: boolean;
};

type VersionsResponse = {
  documentId: string;
  versions: DocumentVersionItem[];
  error?: string;
};

type DownloadResponse = {
  downloadUrl?: string;
  error?: string;
};

type PreviewResponse = {
  previewUrl?: string;
  error?: string;
};

const PREVIEWABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentVersions({
  documentId,
  documentName,
  canUpload = false,
}: DocumentVersionsProps) {
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadingVersionId, setDownloadingVersionId] = useState<
    string | null
  >(null);
  const [openingVersionId, setOpeningVersionId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = (await response.json()) as VersionsResponse;

      if (!response.ok) {
        throw new Error(
          data.error ?? "Не вдалося завантажити версії документа.",
        );
      }

      setVersions(data.versions);
      setErrorMessage("");
    } catch (error) {
      setVersions([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Сталася невідома помилка.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchVersions() {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/documents/${documentId}/versions`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await response.json()) as VersionsResponse;

        if (!response.ok) {
          throw new Error(
            data.error ?? "Не вдалося завантажити версії документа.",
          );
        }

        if (!isCancelled) {
          setVersions(data.versions);
          setErrorMessage("");
        }
      } catch (error) {
        if (!isCancelled) {
          setVersions([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Сталася невідома помилка.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchVersions();

    return () => {
      isCancelled = true;
    };
  }, [documentId]);

  async function handlePreview(version: DocumentVersionItem) {
    setOpeningVersionId(version.id);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${version.id}/preview`,
      );

      const data = (await response.json()) as PreviewResponse;

      if (!response.ok || !data.previewUrl) {
        throw new Error(
          data.error ?? "Не вдалося підготувати перегляд.",
        );
      }

      window.open(data.previewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося відкрити файл.",
      );
    } finally {
      setOpeningVersionId(null);
    }
  }

  async function handleDownload(versionId: string) {
    setDownloadingVersionId(versionId);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${versionId}/download`,
      );

      const data = (await response.json()) as DownloadResponse;

      if (!response.ok || !data.downloadUrl) {
        throw new Error(
          data.error ?? "Не вдалося підготувати завантаження.",
        );
      }

      window.location.assign(data.downloadUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити файл.",
      );
    } finally {
      setDownloadingVersionId(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Історія версій</h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {documentName}
            </p>
          </div>

          {canUpload && (
            <Button
              type="button"
              onClick={() => setIsUploadOpen(true)}
            >
              Завантажити нову версію
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">
            Завантаження версій...
          </div>
        ) : errorMessage ? (
          <div className="px-5 py-6">
            <p className="text-sm font-medium text-red-600">
              {errorMessage}
            </p>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsLoading(true);
                void loadVersions();
              }}
              className="mt-4"
            >
              Спробувати ще раз
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">
            Версій поки немає.
          </div>
        ) : (
          <div>
            {versions.map((version, index) => {
              const canPreview = PREVIEWABLE_MIME_TYPES.has(
                version.mimeType,
              );

              return (
                <div
                  key={version.id}
                  className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold">
                      v{version.version}
                      {index === 0 ? " · Поточна версія" : ""}
                    </div>

                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {version.fileName}
                    </div>

                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {formatFileSize(version.fileSize)} ·{" "}
                      {version.uploadedBy} · {version.createdAt}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canPreview && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handlePreview(version)}
                        disabled={openingVersionId === version.id}
                      >
                        <FiExternalLink className="mr-2 size-4" />

                        {openingVersionId === version.id
                          ? "Відкриття..."
                          : "Відкрити"}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleDownload(version.id)}
                      disabled={downloadingVersionId === version.id}
                    >
                      <FiDownload className="mr-2 size-4" />

                      {downloadingVersionId === version.id
                        ? "Підготовка..."
                        : "Скачати"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {isUploadOpen && (
        <UploadDocumentVersionModal
          documentId={documentId}
          documentName={documentName}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={() => {
            setIsLoading(true);
            void loadVersions();
          }}
        />
      )}
    </>
  );
}