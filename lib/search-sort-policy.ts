export const projectSortFields = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deadline: "deadline",
  name: "name",
  status: "status",
} as const;

export const documentSortFields = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  title: "title",
  status: "status",
  reviewedAt: "reviewedAt",
  archivedAt: "archivedAt",
} as const;

export const notificationSortFields = {
  createdAt: "createdAt",
} as const;

export function getAllowedSortField<T extends Record<string, string>>(
  fields: T,
  value: string | undefined,
  fallback: keyof T,
): T[keyof T] {
  return value && Object.hasOwn(fields, value)
    ? fields[value as keyof T]
    : fields[fallback];
}

export function getProjectSortField(value?: string) {
  return getAllowedSortField(projectSortFields, value, "createdAt");
}

export function getDocumentSortField(value?: string) {
  return getAllowedSortField(documentSortFields, value, "createdAt");
}

export function getNotificationSortField(value?: string) {
  return getAllowedSortField(notificationSortFields, value, "createdAt");
}
