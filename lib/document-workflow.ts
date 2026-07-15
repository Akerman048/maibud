import type { DocumentStatus } from "@/app/generated/prisma/client";

export type DocumentWorkflowErrorCode = "ARCHIVED_DOCUMENT";

export class DocumentWorkflowError extends Error {
  readonly code: DocumentWorkflowErrorCode;

  constructor(code: DocumentWorkflowErrorCode, message: string) {
    super(message);
    this.name = "DocumentWorkflowError";
    this.code = code;
  }
}

export function canReviewDocument(status: DocumentStatus) {
  return status === "SUBMITTED";
}

export function canPublishDocument(status: DocumentStatus) {
  return status === "APPROVED";
}

export function canUploadDocumentVersion(status: DocumentStatus) {
  return status !== "ARCHIVED";
}

export type NewVersionTransition = {
  nextStatus: DocumentStatus;
  clearReview: boolean;
  clearPublication: boolean;
  auditAction: string;
};

export function getNewVersionTransition({
  status,
  nextVersion,
}: {
  status: DocumentStatus;
  isPublishedToClient: boolean;
  nextVersion: number;
}): NewVersionTransition {
  switch (status) {
    case "DRAFT":
      return {
        nextStatus: "SUBMITTED",
        clearReview: true,
        clearPublication: false,
        auditAction: "Документ подано на перевірку",
      };
    case "SUBMITTED":
      return {
        nextStatus: "SUBMITTED",
        clearReview: false,
        clearPublication: false,
        auditAction: `Завантажено версію v${nextVersion} документа`,
      };
    case "REJECTED":
      return {
        nextStatus: "SUBMITTED",
        clearReview: true,
        clearPublication: false,
        auditAction:
          "Завантажено нову версію та повторно подано документ на перевірку",
      };
    case "APPROVED":
      return {
        nextStatus: "SUBMITTED",
        clearReview: true,
        clearPublication: true,
        auditAction:
          "Завантажено нову версію погодженого документа та повторно подано на перевірку",
      };
    case "ARCHIVED":
      throw new DocumentWorkflowError(
        "ARCHIVED_DOCUMENT",
        "Archived documents cannot be changed",
      );
  }
}

export function isDocumentVisibleToClient({
  status,
  isPublishedToClient,
}: {
  status: DocumentStatus;
  isPublishedToClient: boolean;
}) {
  return status === "APPROVED" && isPublishedToClient;
}
