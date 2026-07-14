"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ProjectOption } from "@/types/project";
import type {
  CompleteDocumentUploadResponse,
  PresignDocumentUploadResponse,
} from "@/types/upload";

import { Button } from "@/components/ui/Button";
import { FileUploadBox } from "@/components/ui/FileUploadBox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

type UploadDocumentModalProps = {
  projects: ProjectOption[];
  onClose: () => void;
  onUploaded: () => void;
};

export function UploadDocumentModal({
  projects,
  onClose,
  onUploaded,
}: UploadDocumentModalProps) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    const title = String(formData.get("name") ?? "").trim();
    const projectId = String(formData.get("projectId") ?? "").trim();

    if (!title || !projectId || !file) {
      setErrorMessage("Заповніть усі поля та оберіть файл.");
      return;
    }

    setIsPending(true);
    setErrorMessage("");

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });

      const presignData =
        (await presignResponse.json()) as PresignDocumentUploadResponse & {
          error?: string;
        };

      if (!presignResponse.ok) {
        throw new Error(presignData.error ?? "Не вдалося підготувати upload.");
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
        "/api/documents/complete-upload",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            title,
            objectKey: presignData.objectKey,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        },
      );

      const completeData =
        (await completeResponse.json()) as CompleteDocumentUploadResponse & {
          error?: string;
        };

      if (!completeResponse.ok) {
        throw new Error(
          completeData.error ?? "Не вдалося зберегти документ.",
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

  const projectOptions = [
    { label: "Оберіть проєкт", value: "" },
    ...projects.map((project) => ({
      label: project.name,
      value: project.id,
    })),
  ];

  return (
    <Modal
      title="Завантажити документ"
      description="Файл буде безпечно завантажений у приватне сховище."
      onClose={onClose}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Назва документа</label>

          <Input
            name="name"
            placeholder="Наприклад: Пояснювальна записка"
            required
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Проєкт</label>

          <Select
            name="projectId"
            options={projectOptions}
            defaultValue=""
            required
            disabled={isPending}
          />
        </div>

        <FileUploadBox
          file={file}
          onFileChange={setFile}
          disabled={isPending}
        />

        {errorMessage && (
          <p className="text-sm font-medium text-red-600">{errorMessage}</p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Скасувати
          </Button>

          <Button type="submit" disabled={isPending || !file}>
            {isPending ? "Завантаження..." : "Завантажити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}