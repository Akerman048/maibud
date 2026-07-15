import type { UserRole } from "@/app/generated/prisma/client";

const roleLabels: Record<UserRole, string> = {
  HEAD: "Керівник",
  EXPERT: "Експерт",
  DESIGNER: "Проєктувальник",
  ARCHIVIST: "Архіваріус",
  CLIENT: "Клієнт",
};

export function getUserRoleLabel(role: UserRole) {
  return roleLabels[role];
}
