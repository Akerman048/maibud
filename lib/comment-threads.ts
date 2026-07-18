import "server-only";

import {
  CommentThreadStatus,
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import { AuthorizationError } from "@/lib/auth-guard";
import {
  canDeleteCommentMessage,
  mapCommentThreadStatus,
} from "@/lib/comment-thread-policy";
import { prisma } from "@/lib/prisma";
import { firstQueryValue, getPaginationMeta, normalizeSearchQuery, parseDateEndParam, parseDateParam, parsePage, parsePageSize, parseSortDirection } from "@/lib/query-params";
import type { CommentThreadItem } from "@/types/comment-thread";
import type { PaginatedResult, SortDirection } from "@/types/query";

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
              user: { isActive: true },
            },
          },
        },
      },
    },
  };
}

export function getOpenCommentThreadCount(
  currentUserId: string,
  role: UserRole,
) {
  if (role !== UserRole.EXPERT && role !== UserRole.DESIGNER) {
    return Promise.resolve(0);
  }

  return prisma.commentThread.count({
    where: {
      AND: [
        getAccessWhere(currentUserId, role),
        {
          status: {
            in: [CommentThreadStatus.OPEN, CommentThreadStatus.RETURNED],
          },
        },
      ],
    },
  });
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
    // Project/document detail lists remain bounded until their dedicated tab
    // pagination is split from the detail route.
    take: 100,
  });

  return threads.map((thread) =>
    mapCommentThread(thread, currentUserId, role),
  );
}

export type CommentThreadSearchParams = {
  currentUserId: string;
  role: UserRole;
  page: number;
  pageSize: number;
  search: string;
  status?: CommentThreadStatus;
  projectId?: string;
  documentId?: string;
  createdById?: string;
  updatedFrom?: Date;
  updatedTo?: Date;
  sortDirection: SortDirection;
};

export function normalizeCommentThreadSearchParams(raw: Record<string, string | string[] | undefined>, currentUserId: string, role: UserRole): CommentThreadSearchParams {
  const value = (key: string) => firstQueryValue(raw[key]);
  const status = value("status");
  return {
    currentUserId, role,
    page: parsePage(value("page")), pageSize: parsePageSize(value("pageSize")),
    search: normalizeSearchQuery(value("search")),
    status: status && Object.values(CommentThreadStatus).includes(status as CommentThreadStatus) ? status as CommentThreadStatus : undefined,
    projectId: value("projectId"), documentId: value("documentId"), createdById: value("createdById"),
    updatedFrom: parseDateParam(value("updatedFrom")) ?? undefined,
    updatedTo: parseDateEndParam(value("updatedTo")) ?? undefined,
    sortDirection: parseSortDirection(value("sortDirection")),
  };
}

const commentThreadListSelect = {
  id: true, title: true, section: true, status: true, documentId: true,
  documentVersionId: true, resolvedAt: true, createdAt: true, updatedAt: true,
  document: { select: { title: true, projectId: true, project: { select: { name: true } } } },
  documentVersion: { select: { version: true } },
  createdBy: { select: { name: true } },
  resolvedBy: { select: { name: true } },
  _count: { select: { messages: true } },
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true, content: true, authorId: true, editedAt: true,
      deletedAt: true, createdAt: true,
      author: { select: { name: true, role: true } },
    },
  },
} satisfies Prisma.CommentThreadSelect;

export async function getCommentThreads(
  params: CommentThreadSearchParams,
): Promise<PaginatedResult<CommentThreadItem>> {
  if (params.role === UserRole.CLIENT) {
    throw new AuthorizationError("Internal comments are not available", 403);
  }
  const updatedAt = params.updatedFrom || params.updatedTo
    ? { ...(params.updatedFrom ? { gte: params.updatedFrom } : {}), ...(params.updatedTo ? { lte: params.updatedTo } : {}) }
    : undefined;
  const where: Prisma.CommentThreadWhereInput = { AND: [
    getAccessWhere(params.currentUserId, params.role),
    ...(params.search ? [{ OR: [
      { title: { contains: params.search, mode: "insensitive" as const } },
      { section: { contains: params.search, mode: "insensitive" as const } },
      { document: { title: { contains: params.search, mode: "insensitive" as const } } },
    ] }] : []),
    ...(params.status ? [{ status: params.status }] : []),
    ...(params.projectId ? [{ document: { projectId: params.projectId } }] : []),
    ...(params.documentId ? [{ documentId: params.documentId }] : []),
    ...(params.createdById ? [{ createdById: params.createdById }] : []),
    ...(updatedAt ? [{ updatedAt }] : []),
  ] };
  const [total, records] = await Promise.all([
    prisma.commentThread.count({ where }),
    prisma.commentThread.findMany({
      where,
      select: commentThreadListSelect,
      orderBy: [{ updatedAt: params.sortDirection }, { id: params.sortDirection }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return {
    items: records.map((thread) => ({
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
      messageCount: thread._count.messages,
      messages: thread.messages.map((message) => ({
        id: message.id,
        content: message.content,
        isDeleted: false,
        isFirstMessage: false,
        canDelete: false,
        authorId: message.authorId,
        authorName: message.author.name,
        authorRole: message.author.role,
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt?.toISOString() ?? null,
      })).reverse(),
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    })),
    pagination: getPaginationMeta({ page: params.page, pageSize: params.pageSize, total }),
  };
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
