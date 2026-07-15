import type {
  CommentThreadStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import type { CommentThreadStatusValue } from "@/types/comment-thread";

const REPLY_ROLES: UserRole[] = ["EXPERT", "DESIGNER"];
const DELETE_WINDOW_MS = 15 * 60 * 1000;

export function mapCommentThreadStatus(
  status: CommentThreadStatus,
): CommentThreadStatusValue {
  if (status === "RESOLVED") return "resolved";
  if (status === "RETURNED") return "returned";

  return "open";
}

export function canCreateCommentThread(role: UserRole) {
  return role === "EXPERT";
}

export function canReplyToCommentThread({
  role,
  status,
}: {
  role: UserRole;
  status: CommentThreadStatus;
}) {
  return REPLY_ROLES.includes(role) && status !== "RESOLVED";
}

export function canMarkCommentThreadResolved({
  role,
  status,
}: {
  role: UserRole;
  status: CommentThreadStatus;
}) {
  return (
    role === "DESIGNER" &&
    (status === "OPEN" || status === "RETURNED")
  );
}

export function canReturnCommentThread({
  role,
  status,
}: {
  role: UserRole;
  status: CommentThreadStatus;
}) {
  return role === "EXPERT" && status === "RESOLVED";
}

export function canDeleteCommentMessage({
  role,
  actorUserId,
  authorId,
  createdAt,
  deletedAt,
  now = new Date(),
}: {
  role: UserRole;
  actorUserId: string;
  authorId: string;
  createdAt: Date;
  deletedAt: Date | null;
  now?: Date;
}) {
  if (!REPLY_ROLES.includes(role)) return false;
  if (actorUserId !== authorId || deletedAt) return false;

  const age = now.getTime() - createdAt.getTime();

  return age >= 0 && age <= DELETE_WINDOW_MS;
}
