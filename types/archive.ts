import type { DocumentStatus, ProjectStatus } from "@/app/generated/prisma/client";

export type ArchiveDocument = {
  id: string;
  name: string;
  status: DocumentStatus;
  previousStatus: DocumentStatus | null;
  archivedAt: string | null;
  archivedByName: string | null;
  archiveReason: string | null;
  restoredAt: string | null;
  restoredByName: string | null;
  isPublishedToClient: boolean;
};

export type ArchiveProject = {
  id: string;
  name: string;
  address: string;
  customer: string;
  status: ProjectStatus;
  previousStatus: ProjectStatus | null;
  archivedAt: string | null;
  archivedByName: string | null;
  archiveReason: string | null;
  restoredAt: string | null;
  restoredByName: string | null;
  documentsTotal: number;
  documentsArchived: number;
};

export type ArchiveProjectDetail = ArchiveProject & {
  documents: ArchiveDocument[];
};

export type ArchivePage = {
  projects: ArchiveProject[];
  total: number;
  page: number;
  pageSize: 10 | 20 | 50;
  totalPages: number;
};

export type ArchiveQuery = {
  range?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
  search?: string | string[];
  archivedBy?: string | string[];
  archivedFrom?: string | string[];
  archivedTo?: string | string[];
  previousStatus?: string | string[];
};
