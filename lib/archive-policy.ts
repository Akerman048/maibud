import type {
  DocumentStatus,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";

export class ArchivePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchivePolicyError";
  }
}

function canManageArchive(role: UserRole) {
  return role === "HEAD" || role === "ARCHIVIST";
}

export function canArchiveProject({
  role,
  projectStatus,
}: {
  role: UserRole;
  projectStatus: ProjectStatus;
}) {
  return canManageArchive(role) && projectStatus !== "ARCHIVED";
}

export function canRestoreProject({
  role,
  projectStatus,
}: {
  role: UserRole;
  projectStatus: ProjectStatus;
}) {
  return canManageArchive(role) && projectStatus === "ARCHIVED";
}

export function canArchiveDocument({
  role,
  status,
}: {
  role: UserRole;
  status: DocumentStatus;
}) {
  return (
    canManageArchive(role) &&
    (status === "APPROVED" || status === "REJECTED")
  );
}

export function canRestoreDocument({
  role,
  status,
  previousStatus,
}: {
  role: UserRole;
  status: DocumentStatus;
  previousStatus: DocumentStatus | null;
}) {
  return (
    canManageArchive(role) &&
    status === "ARCHIVED" &&
    (previousStatus === "APPROVED" || previousStatus === "REJECTED")
  );
}

export function getDocumentRestoreStatus(
  previousStatus: DocumentStatus | null,
) {
  if (previousStatus === "APPROVED" || previousStatus === "REJECTED") {
    return previousStatus;
  }

  throw new ArchivePolicyError(
    "Archived document has no restorable previous status",
  );
}

export function getProjectRestoreStatus(previousStatus: ProjectStatus | null) {
  if (previousStatus && previousStatus !== "ARCHIVED") {
    return previousStatus;
  }

  return "OPEN" as const;
}
