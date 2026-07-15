"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CompleteDocumentVersionUploadResponse,
  PresignDocumentVersionUploadResponse,
} from "@/types/upload";

import { Button } from "@/components/ui/Button";
import { FileUploadBox } from "@/components/ui/FileUploadBox";
import { Modal } from "@/components/ui/Modal";

type UploadDocumentVersionModalProps = {
  documentId: string;
  documentName: string;
  onClose: () => void;
  onUploaded: () => void;
};

export function UploadDocumentVersionModal({
  documentId,
  documentName,
  onClose,
  onUploaded,
}: UploadDocumentVersionModalProps) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    if (!file) {
      setErrorMessage("Оберіть файл.");
      return;
    }

    setIsPending(true);
    setErrorMessage("");

    try {
      const presignResponse = await fetch(
        `/api/documents/${documentId}/versions/presign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        },
      );

      const presignData =
        (await presignResponse.json()) as
          PresignDocumentVersionUploadResponse & {
            error?: string;
          };

      if (!presignResponse.ok) {
        throw new Error(
          presignData.error ?? "Не вдалося підготувати завантаження.",
        );
      }

      const uploadResponse = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Не вдалося завантажити файл у S3.");
      }

      const completeResponse = await fetch(
        `/api/documents/${documentId}/versions/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            objectKey: presignData.objectKey,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        },
      );

      const completeData =
        (await completeResponse.json()) as
          CompleteDocumentVersionUploadResponse & {
            error?: string;
          };

      if (!completeResponse.ok) {
        throw new Error(
          completeData.error ?? "Не вдалося зберегти нову версію.",
        );
      }

      onUploaded();
      onClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Сталася невідома помилка.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      title="Завантажити нову версію"
      description={`Документ: ${documentName}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <FileUploadBox
          file={file}
          onFileChange={setFile}
          disabled={isPending}
        />

        {errorMessage && (
          <p className="text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Скасувати
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !file}
          >
            {isPending ? "Завантаження..." : "Завантажити версію"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}