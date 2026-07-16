import type { UserRole } from "@/app/generated/prisma/client";

type ActivityHrefInput = {
  role: UserRole;
  entityType: string;
  entityId: string;
  projectId: string | null;
};

function segment(value: string) {
  return encodeURIComponent(value);
}

export function getActivityHref({
  role,
  entityType,
  entityId,
  projectId,
}: ActivityHrefInput): string | null {
  if (role === "CLIENT") return null;

  const rolePath = role.toLowerCase();
  const resolvedProjectId = entityType === "PROJECT" ? projectId ?? entityId : projectId;

  if (entityType === "PROJECT" && resolvedProjectId) {
    return `/dashboard/${rolePath}/projects/${segment(resolvedProjectId)}`;
  }

  if (entityType === "DOCUMENT" && projectId) {
    return `/dashboard/${rolePath}/projects/${segment(projectId)}`;
  }

  if (entityType === "COMMENT_THREAD") {
    if (role === "EXPERT" || role === "DESIGNER") {
      return `/dashboard/${rolePath}/comments/${segment(entityId)}`;
    }
    return projectId
      ? `/dashboard/${rolePath}/projects/${segment(projectId)}`
      : null;
  }

  if (entityType === "COMMENT_MESSAGE" && projectId) {
    return `/dashboard/${rolePath}/projects/${segment(projectId)}`;
  }

  if (
    role === "HEAD" &&
    (entityType === "ORGANIZATION_MEMBER" || entityType === "INVITATION")
  ) {
    return "/dashboard/head/members";
  }

  return null;
}
