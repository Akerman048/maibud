import type { DocumentItem, DocumentStatus } from "@/types/document";
import { prisma } from "@/lib/prisma";

function mapDocumentStatus(status: string): DocumentStatus {
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
    include: {
      project: true,
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
    include: {
      project: true,
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
    isPublishedToClient: document.isPublishedToClient,
  }));
}
