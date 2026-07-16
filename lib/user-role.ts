import type { UserRole } from "@/app/generated/prisma/client";

const roleLabels: Record<UserRole, string> = {
  HEAD: "Керівник",
  EXPERT: "Експерт",
  DESIGNER: "Проєктувальник",
  ARCHIVIST: "Архівіст",
  CLIENT: "Замовник",
};

export function getUserRoleLabel(role: UserRole) {
  return roleLabels[role];
}
