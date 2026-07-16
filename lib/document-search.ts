import "server-only";

import {
  DocumentStatus,
  Prisma,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { mapDocumentStatus } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { firstQueryValue, getPaginationMeta, normalizeBooleanFilter, normalizeSearchQuery, parseDateEndParam, parseDateParam, parsePage, parsePageSize, parseSortDirection } from "@/lib/query-params";
import { getDocumentSortField } from "@/lib/search-sort-policy";
import type { DocumentItem } from "@/types/document";
import type { PaginatedResult, SortDirection } from "@/types/query";

export type DocumentSearchParams = {
  userId: string;
  role: UserRole;
  page: number;
  pageSize: number;
  search: string;
  projectId?: string;
  status?: DocumentStatus;
  authorId?: string;
  reviewerId?: string;
  published?: boolean;
  archived?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  reviewedFrom?: Date;
  reviewedTo?: Date;
  sortBy: string;
  sortDirection: SortDirection;
};

export function normalizeDocumentSearchParams(raw: Record<string, string | string[] | undefined>, userId: string, role: UserRole): DocumentSearchParams {
  const value = (key: string) => firstQueryValue(raw[key]);
  const status = value("status");
  const published = normalizeBooleanFilter(value("published"));
  return {
    userId, role,
    page: parsePage(value("page")),
    pageSize: parsePageSize(value("pageSize")),
    search: normalizeSearchQuery(value("search")),
    projectId: value("projectId"),
    status: status && Object.values(DocumentStatus).includes(status as DocumentStatus) ? status as DocumentStatus : undefined,
    authorId: value("authorId"), reviewerId: value("reviewerId"),
    published: published === "all" ? undefined : published === "true",
    archived: value("archived") === "true",
    createdFrom: parseDateParam(value("createdFrom")) ?? undefined,
    createdTo: parseDateEndParam(value("createdTo")) ?? undefined,
    reviewedFrom: parseDateParam(value("reviewedFrom")) ?? undefined,
    reviewedTo: parseDateEndParam(value("reviewedTo")) ?? undefined,
    sortBy: getDocumentSortField(value("sortBy")),
    sortDirection: parseSortDirection(value("sortDirection")),
  };
}

function documentAccessWhere(userId: string, role: UserRole): Prisma.DocumentWhereInput {
  if (role === UserRole.CLIENT) {
    return {
      status: DocumentStatus.APPROVED,
      isPublishedToClient: true,
      archivedAt: null,
      project: {
        status: { not: ProjectStatus.ARCHIVED },
        archivedAt: null,
        members: { some: { userId, role: UserRole.CLIENT } },
      },
    };
  }
  if (role === UserRole.EXPERT || role === UserRole.DESIGNER) {
    return { project: { members: { some: { userId, role } } } };
  }
  return {
    project: {
      organization: {
        members: {
          some: { userId, role, removedAt: null, user: { isActive: true } },
        },
      },
    },
  };
}

export function buildDocumentWhere(params: DocumentSearchParams): Prisma.DocumentWhereInput {
  const createdAt = params.createdFrom || params.createdTo
    ? { ...(params.createdFrom ? { gte: params.createdFrom } : {}), ...(params.createdTo ? { lte: params.createdTo } : {}) }
    : undefined;
  const reviewedAt = params.reviewedFrom || params.reviewedTo
    ? { ...(params.reviewedFrom ? { gte: params.reviewedFrom } : {}), ...(params.reviewedTo ? { lte: params.reviewedTo } : {}) }
    : undefined;
  const archiveWhere = params.role === UserRole.CLIENT ? {} : params.archived
    ? { OR: [{ status: DocumentStatus.ARCHIVED }, { archivedAt: { not: null } }] }
    : { status: { not: DocumentStatus.ARCHIVED }, archivedAt: null, project: { status: { not: ProjectStatus.ARCHIVED } } };

  return { AND: [
    documentAccessWhere(params.userId, params.role),
    archiveWhere,
    ...(params.search ? [{ OR: [
      { title: { contains: params.search, mode: "insensitive" as const } },
      { versions: { some: { fileName: { contains: params.search, mode: "insensitive" as const } } } },
      { project: { name: { contains: params.search, mode: "insensitive" as const } } },
      { author: { name: { contains: params.search, mode: "insensitive" as const } } },
    ] }] : []),
    ...(params.projectId ? [{ projectId: params.projectId }] : []),
    ...(params.status ? [{ status: params.status }] : []),
    ...(params.authorId ? [{ authorId: params.authorId }] : []),
    ...(params.reviewerId ? [{ reviewedById: params.reviewerId }] : []),
    ...(params.published === undefined ? [] : [{ isPublishedToClient: params.published }]),
    ...(createdAt ? [{ createdAt }] : []),
    ...(reviewedAt ? [{ reviewedAt }] : []),
  ] };
}

export function buildDocumentOrderBy(sortBy: string, direction: SortDirection): Prisma.DocumentOrderByWithRelationInput[] {
  const field = getDocumentSortField(sortBy);
  const primary: Prisma.DocumentOrderByWithRelationInput =
    field === "title" ? { title: direction }
    : field === "status" ? { status: direction }
    : field === "updatedAt" ? { updatedAt: direction }
    : field === "reviewedAt" ? { reviewedAt: { sort: direction, nulls: "last" } }
    : field === "archivedAt" ? { archivedAt: { sort: direction, nulls: "last" } }
    : { createdAt: direction };
  return [primary, { id: direction }];
}

const select = {
  id: true, title: true, status: true, previousStatus: true,
  rejectionReason: true, reviewedAt: true, isPublishedToClient: true,
  archivedAt: true, archiveReason: true, restoredAt: true,
  archivedBy: { select: { name: true } },
  restoredBy: { select: { name: true } },
  project: { select: { name: true } },
  reviewedBy: { select: { name: true } },
  versions: { orderBy: { version: "desc" as const }, take: 1, select: { id: true, version: true, fileName: true } },
} satisfies Prisma.DocumentSelect;

const clientSelect = {
  id: true,
  title: true,
  status: true,
  isPublishedToClient: true,
  project: { select: { name: true } },
  versions: {
    orderBy: { version: "desc" as const },
    take: 1,
    select: { id: true, version: true },
  },
} satisfies Prisma.DocumentSelect;

export async function searchDocuments(params: DocumentSearchParams): Promise<PaginatedResult<DocumentItem>> {
  const where = buildDocumentWhere(params);

  if (params.role === UserRole.CLIENT) {
    const [total, records] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        select: clientSelect,
        orderBy: buildDocumentOrderBy(params.sortBy, params.sortDirection),
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return {
      items: records.map((document) => ({
        id: document.id,
        name: document.title,
        project: document.project.name,
        type: document.title.split(".").pop()?.toUpperCase() ?? "FILE",
        status: mapDocumentStatus(document.status),
        previousStatus: null,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByName: null,
        latestVersion: document.versions[0]?.version ?? null,
        versions: document.versions,
        isPublishedToClient: document.isPublishedToClient,
        archivedAt: null,
        archivedByName: null,
        archiveReason: null,
        restoredAt: null,
        restoredByName: null,
      })),
      pagination: getPaginationMeta({
        page: params.page,
        pageSize: params.pageSize,
        total,
      }),
    };
  }

  const [total, records] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where, select,
      orderBy: buildDocumentOrderBy(params.sortBy, params.sortDirection),
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);
  return {
    items: records.map((document) => ({
      id: document.id,
      name: document.title,
      project: document.project.name,
      type: document.title.split(".").pop()?.toUpperCase() ?? "FILE",
      status: mapDocumentStatus(document.status),
      previousStatus: document.previousStatus === DocumentStatus.APPROVED ? "approved" : document.previousStatus === DocumentStatus.REJECTED ? "rejected" : null,
      rejectionReason: document.rejectionReason,
      reviewedAt: document.reviewedAt?.toLocaleString("uk-UA") ?? null,
      reviewedByName: document.reviewedBy?.name ?? null,
      latestVersion: document.versions[0]?.version ?? null,
      versions: document.versions.map(({ id, version }) => ({ id, version })),
      isPublishedToClient: document.isPublishedToClient,
      archivedAt: document.archivedAt?.toISOString() ?? null,
      archivedByName: document.archivedBy?.name ?? null,
      archiveReason: document.archiveReason,
      restoredAt: document.restoredAt?.toISOString() ?? null,
      restoredByName: document.restoredBy?.name ?? null,
    })),
    pagination: getPaginationMeta({ page: params.page, pageSize: params.pageSize, total }),
  };
}
