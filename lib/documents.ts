import type {
  DocumentStatus as PrismaDocumentStatus,
} from "@/app/generated/prisma/client";
import type { DocumentItem, DocumentStatus } from "@/types/document";
import { prisma } from "@/lib/prisma";

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

function getDocumentType(title: string) {
  return title.split(".").pop()?.toUpperCase() ?? "FILE";
}

export async function getDocuments(): Promise<DocumentItem[]> {
  const documents = await prisma.document.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      isPublishedToClient: true,
      project: {
        select: {
          name: true,
        },
      },
      reviewedBy: {
        select: {
          name: true,
        },
      },
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
        select: {
          version: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return documents.map((document) => ({
    id: document.id,
    name: document.title,
    project: document.project.name,
    type: getDocumentType(document.title),
    status: mapDocumentStatus(document.status),
    rejectionReason: document.rejectionReason,
    reviewedAt:
      document.reviewedAt?.toLocaleString("uk-UA") ?? null,
    reviewedByName: document.reviewedBy?.name ?? null,
    latestVersion: document.versions[0]?.version ?? null,
    isPublishedToClient: document.isPublishedToClient,
  }));
}

export async function getDocumentsByProjectId(
  projectId: string,
): Promise<DocumentItem[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      isPublishedToClient: true,
      project: {
        select: {
          name: true,
        },
      },
      reviewedBy: {
        select: {
          name: true,
        },
      },
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
        select: {
          version: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return documents.map((document) => ({
    id: document.id,
    name: document.title,
    project: document.project.name,
    type: getDocumentType(document.title),
    status: mapDocumentStatus(document.status),
    rejectionReason: document.rejectionReason,
    reviewedAt:
      document.reviewedAt?.toLocaleString("uk-UA") ?? null,
    reviewedByName: document.reviewedBy?.name ?? null,
    latestVersion: document.versions[0]?.version ?? null,
    isPublishedToClient: document.isPublishedToClient,
  }));
}
