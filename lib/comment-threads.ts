import "server-only";

import {
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import { AuthorizationError } from "@/lib/auth-guard";
import {
  canDeleteCommentMessage,
  mapCommentThreadStatus,
} from "@/lib/comment-thread-policy";
import { prisma } from "@/lib/prisma";
import type { CommentThreadItem } from "@/types/comment-thread";

const commentThreadSelect = {
  id: true,
  title: true,
  section: true,
  status: true,
  documentId: true,
  documentVersionId: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  document: {
    select: {
      title: true,
      projectId: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  },
  documentVersion: {
    select: {
      version: true,
    },
  },
  createdBy: {
    select: {
      name: true,
    },
  },
  resolvedBy: {
    select: {
      name: true,
    },
  },
  messages: {
    orderBy: {
      createdAt: "asc" as const,
    },
    select: {
      id: true,
      content: true,
      authorId: true,
      editedAt: true,
      deletedAt: true,
      createdAt: true,
      author: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.CommentThreadSelect;

type CommentThreadRecord = Prisma.CommentThreadGetPayload<{
  select: typeof commentThreadSelect;
}>;

function getAccessWhere(
  currentUserId: string,
  role: UserRole,
): Prisma.CommentThreadWhereInput {
  if (role === UserRole.CLIENT) {
    throw new AuthorizationError("Internal comments are not available", 403);
  }

  if (role === UserRole.EXPERT || role === UserRole.DESIGNER) {
    return {
      document: {
        project: {
          members: {
            some: {
              userId: currentUserId,
              role,
            },
          },
        },
      },
    };
  }

  return {
    document: {
      project: {
        organization: {
          members: {
            some: {
              userId: currentUserId,
              role,
              removedAt: null,
            },
          },
        },
      },
    },
  };
}

function mapCommentThread(
  thread: CommentThreadRecord,
  currentUserId: string,
  role: UserRole,
): CommentThreadItem {
  const firstMessageId = thread.messages[0]?.id;

  return {
    id: thread.id,
    title: thread.title,
    section: thread.section,
    status: mapCommentThreadStatus(thread.status),
    projectId: thread.document.projectId,
    projectName: thread.document.project.name,
    documentId: thread.documentId,
    documentTitle: thread.document.title,
    documentVersionId: thread.documentVersionId,
    version: thread.documentVersion?.version ?? null,
    createdByName: thread.createdBy.name,
    resolvedByName: thread.resolvedBy?.name ?? null,
    resolvedAt: thread.resolvedAt?.toISOString() ?? null,
    messages: thread.messages.map((message) => ({
      id: message.id,
      content: message.deletedAt ? null : message.content,
      isDeleted: Boolean(message.deletedAt),
      isFirstMessage: message.id === firstMessageId,
      canDelete:
        message.id !== firstMessageId &&
        canDeleteCommentMessage({
          role,
          actorUserId: currentUserId,
          authorId: message.authorId,
          createdAt: message.createdAt,
          deletedAt: message.deletedAt,
        }),
      authorId: message.authorId,
      authorName: message.author.name,
      authorRole: message.author.role,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
    })),
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

async function findCommentThreads(
  where: Prisma.CommentThreadWhereInput,
  currentUserId: string,
  role: UserRole,
) {
  const threads = await prisma.commentThread.findMany({
    where,
    select: commentThreadSelect,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return threads.map((thread) =>
    mapCommentThread(thread, currentUserId, role),
  );
}

export function getCommentThreadsForUser(
  currentUserId: string,
  role: UserRole,
) {
  return findCommentThreads(
    getAccessWhere(currentUserId, role),
    currentUserId,
    role,
  );
}

export function getCommentThreadsByProjectId(
  projectId: string,
  currentUserId: string,
  role: UserRole,
) {
  return findCommentThreads(
    {
      AND: [
        getAccessWhere(currentUserId, role),
        {
          document: {
            projectId,
          },
        },
      ],
    },
    currentUserId,
    role,
  );
}

export function getCommentThreadsByDocumentId(
  documentId: string,
  currentUserId: string,
  role: UserRole,
) {
  return findCommentThreads(
    {
      AND: [
        getAccessWhere(currentUserId, role),
        { documentId },
      ],
    },
    currentUserId,
    role,
  );
}

export async function getCommentThreadById(
  threadId: string,
  currentUserId: string,
  role: UserRole,
) {
  const thread = await prisma.commentThread.findFirst({
    where: {
      AND: [
        getAccessWhere(currentUserId, role),
        { id: threadId },
      ],
    },
    select: commentThreadSelect,
  });

  return thread
    ? mapCommentThread(thread, currentUserId, role)
    : null;
}
