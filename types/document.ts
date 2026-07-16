export type DocumentStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "archived";

export type DocumentItem = {
  id: string;
  name: string;
  project: string;
  type: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  latestVersion: number | null;
  versions: {
    id: string;
    version: number;
  }[];
  isPublishedToClient: boolean;
  previousStatus: "approved" | "rejected" | null;
  archivedAt: string | null;
  archivedByName: string | null;
  archiveReason: string | null;
  restoredAt: string | null;
  restoredByName: string | null;
};

export type DocumentVersionItem = {
  id: string;
  version: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
};
