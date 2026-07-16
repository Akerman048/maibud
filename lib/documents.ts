import {
  DocumentStatus as PrismaDocumentStatus,
  Prisma,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DocumentItem, DocumentStatus } from "@/types/document";

export function mapDocumentStatus(
  status: PrismaDocumentStatus,
): DocumentStatus {
  if (status === "DRAFT") return "draft";
  if (status === "SUBMITTED") return "submitted";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

function mapPreviousStatus(status: PrismaDocumentStatus | null) {
  if (status === "APPROVED") return "approved" as const;
  if (status === "REJECTED") return "rejected" as const;
  return null;
}

function getDocumentType(title: string) {
  return title.split(".").pop()?.toUpperCase() ?? "FILE";
}

const documentSelect = {
  id: true,
  title: true,
  status: true,
  previousStatus: true,
  rejectionReason: true,
  reviewedAt: true,
  isPublishedToClient: true,
  archivedAt: true,
  archiveReason: true,
  restoredAt: true,
  archivedBy: { select: { name: true } },
  restoredBy: { select: { name: true } },
  project: { select: { name: true } },
  reviewedBy: { select: { name: true } },
  versions: {
    orderBy: { version: "desc" as const },
    select: { id: true, version: true },
  },
} satisfies Prisma.DocumentSelect;

type DocumentRecord = Prisma.DocumentGetPayload<{ select: typeof documentSelect }>;

function mapDocument(document: DocumentRecord): DocumentItem {
  return {
    id: document.id,
    name: document.title,
    project: document.project.name,
    type: getDocumentType(document.title),
    status: mapDocumentStatus(document.status),
    previousStatus: mapPreviousStatus(document.previousStatus),
    rejectionReason: document.rejectionReason,
    reviewedAt: document.reviewedAt?.toLocaleString("uk-UA") ?? null,
    reviewedByName: document.reviewedBy?.name ?? null,
    latestVersion: document.versions[0]?.version ?? null,
    versions: document.versions,
    isPublishedToClient: document.isPublishedToClient,
    archivedAt: document.archivedAt?.toISOString() ?? null,
    archivedByName: document.archivedBy?.name ?? null,
    archiveReason: document.archiveReason,
    restoredAt: document.restoredAt?.toISOString() ?? null,
    restoredByName: document.restoredBy?.name ?? null,
  };
}

export async function getDocumentsByProjectId(
  projectId: string,
  options: { includeArchived?: boolean } = {},
): Promise<DocumentItem[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId,
      ...(options.includeArchived
        ? {}
        : { status: { not: PrismaDocumentStatus.ARCHIVED } }),
    },
    select: documentSelect,
    orderBy: { createdAt: "desc" },
  });
  return documents.map(mapDocument);
}
