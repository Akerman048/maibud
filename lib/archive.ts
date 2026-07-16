import "server-only";

import {
  DocumentStatus,
  Prisma,
  ProjectStatus,
  type UserRole,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { firstQueryValue, getPaginationMeta, normalizeSearchQuery, parseDateParam, parsePage, parsePageSize } from "@/lib/query-params";
import type {
  ArchivePage,
  ArchiveProject,
  ArchiveProjectDetail,
  ArchiveQuery,
} from "@/types/archive";

type NormalizedArchiveQuery = {
  [Key in keyof ArchiveQuery]?: string;
};

function getArchiveAccessWhere(
  currentUserId: string,
  role: UserRole,
): Prisma.ProjectWhereInput {
  if (role === "HEAD") {
    return {
      members: { some: { userId: currentUserId, role: "HEAD" } },
      organization: {
        members: {
          some: {
            userId: currentUserId,
            role: "HEAD",
            removedAt: null,
            user: { isActive: true },
          },
        },
      },
    };
  }

  if (role === "ARCHIVIST") {
    return {
      organization: {
        members: {
          some: {
            userId: currentUserId,
            role: "ARCHIVIST",
            removedAt: null,
            user: { isActive: true },
          },
        },
      },
    };
  }

  if (role === "DESIGNER" || role === "EXPERT") {
    return {
      members: { some: { userId: currentUserId, role } },
    };
  }

  return { id: "__client_archive_access_denied__" };
}

function getDate(value: string | undefined, endOfDay = false) {
  const date = parseDateParam(value ? `${value}T00:00:00.000Z` : undefined);
  if (date && endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
}

function getArchiveWhere(
  currentUserId: string,
  role: UserRole,
  query: NormalizedArchiveQuery,
): Prisma.ProjectWhereInput {
  const search = normalizeSearchQuery(query.search);
  const archivedFrom = getDate(query.archivedFrom);
  const archivedTo = getDate(query.archivedTo, true);
  const projectPreviousStatus = Object.values(ProjectStatus).includes(
    query.previousStatus as ProjectStatus,
  )
    ? (query.previousStatus as ProjectStatus)
    : null;
  const documentPreviousStatus = Object.values(DocumentStatus).includes(
    query.previousStatus as DocumentStatus,
  )
    ? (query.previousStatus as DocumentStatus)
    : null;
  const archivedDateFilter = archivedFrom || archivedTo
    ? {
        ...(archivedFrom ? { gte: archivedFrom } : {}),
        ...(archivedTo ? { lte: archivedTo } : {}),
      }
    : null;

  return {
    AND: [
      getArchiveAccessWhere(currentUserId, role),
      {
        OR: [
          { status: ProjectStatus.ARCHIVED },
          { documents: { some: { status: DocumentStatus.ARCHIVED } } },
        ],
      },
      ...(search
        ? [{
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { address: { contains: search, mode: "insensitive" as const } },
              { customer: { contains: search, mode: "insensitive" as const } },
              {
                documents: {
                  some: {
                    status: DocumentStatus.ARCHIVED,
                    OR: [
                      { title: { contains: search, mode: "insensitive" as const } },
                      {
                        versions: {
                          some: {
                            fileName: {
                              contains: search,
                              mode: "insensitive" as const,
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }]
        : []),
      ...(query.archivedBy
        ? [{
            OR: [
              { archivedById: query.archivedBy },
              {
                archivedBy: {
                  name: { contains: query.archivedBy, mode: "insensitive" as const },
                },
              },
              {
                documents: {
                  some: {
                    status: DocumentStatus.ARCHIVED,
                    OR: [
                      { archivedById: query.archivedBy },
                      {
                        archivedBy: {
                          name: {
                            contains: query.archivedBy,
                            mode: "insensitive" as const,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }]
        : []),
      ...(archivedDateFilter
        ? [{
            OR: [
              { archivedAt: archivedDateFilter },
              {
                documents: {
                  some: {
                    status: DocumentStatus.ARCHIVED,
                    archivedAt: archivedDateFilter,
                  },
                },
              },
            ],
          }]
        : []),
      ...(projectPreviousStatus || documentPreviousStatus
        ? [{
            OR: [
              ...(projectPreviousStatus
                ? [{ previousStatus: projectPreviousStatus }]
                : []),
              ...(documentPreviousStatus
                ? [{
                    documents: {
                      some: {
                        status: DocumentStatus.ARCHIVED,
                        previousStatus: documentPreviousStatus,
                      },
                    },
                  }]
                : []),
            ],
          }]
        : []),
    ],
  };
}

const archiveProjectSelect = {
  id: true,
  name: true,
  address: true,
  customer: true,
  status: true,
  previousStatus: true,
  archivedAt: true,
  archiveReason: true,
  restoredAt: true,
  archivedBy: { select: { name: true } },
  restoredBy: { select: { name: true } },
  _count: { select: { documents: true } },
  documents: {
    where: { status: DocumentStatus.ARCHIVED },
    orderBy: { archivedAt: "desc" as const },
    take: 1,
    select: {
      archivedAt: true,
      archivedBy: { select: { name: true } },
    },
  },
} satisfies Prisma.ProjectSelect;

type ArchiveProjectRecord = Prisma.ProjectGetPayload<{
  select: typeof archiveProjectSelect;
}>;

function mapArchiveProject(
  project: ArchiveProjectRecord,
  documentsArchived = project.documents.length,
): ArchiveProject {
  const latestArchivedDocument = project.documents[0];
  return {
    id: project.id,
    name: project.name,
    address: project.address,
    customer: project.customer,
    status: project.status,
    previousStatus: project.previousStatus,
    archivedAt:
      project.archivedAt?.toISOString() ??
      latestArchivedDocument?.archivedAt?.toISOString() ??
      null,
    archivedByName:
      project.archivedBy?.name ?? latestArchivedDocument?.archivedBy?.name ?? null,
    archiveReason: project.archiveReason,
    restoredAt: project.restoredAt?.toISOString() ?? null,
    restoredByName: project.restoredBy?.name ?? null,
    documentsTotal: project._count.documents,
    documentsArchived,
  };
}

export async function getArchiveProjects(
  currentUserId: string,
  role: UserRole,
  query: ArchiveQuery = {},
): Promise<ArchivePage> {
  const normalizedQuery: NormalizedArchiveQuery = {
    page: firstQueryValue(query.page),
    pageSize: firstQueryValue(query.pageSize),
    search: normalizeSearchQuery(firstQueryValue(query.search)),
    archivedBy: normalizeSearchQuery(firstQueryValue(query.archivedBy)),
    archivedFrom: firstQueryValue(query.archivedFrom),
    archivedTo: firstQueryValue(query.archivedTo),
    previousStatus: firstQueryValue(query.previousStatus),
  };
  const pageSize = parsePageSize(normalizedQuery.pageSize);
  const page = parsePage(normalizedQuery.page);
  const where = getArchiveWhere(currentUserId, role, normalizedQuery);
  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      select: archiveProjectSelect,
      orderBy: [{ archivedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const archivedDocumentCounts = projects.length === 0
    ? []
    : await prisma.document.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projects.map((project) => project.id) },
          status: DocumentStatus.ARCHIVED,
        },
        _count: { _all: true },
      });
  const archivedCountByProject = new Map(
    archivedDocumentCounts.map((item) => [item.projectId, item._count._all]),
  );

  const pagination = getPaginationMeta({ page, pageSize, total });
  return {
    projects: projects.map((project) =>
      mapArchiveProject(project, archivedCountByProject.get(project.id) ?? 0),
    ),
    total,
    page,
    pageSize,
    totalPages: pagination.totalPages,
  };
}

export async function getArchiveProjectById(
  id: string,
  currentUserId: string,
  role: UserRole,
): Promise<ArchiveProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: {
      id,
      AND: [
        getArchiveAccessWhere(currentUserId, role),
        {
          OR: [
            { status: ProjectStatus.ARCHIVED },
            { documents: { some: { status: DocumentStatus.ARCHIVED } } },
          ],
        },
      ],
    },
    select: {
      ...archiveProjectSelect,
      documents: {
        orderBy: [{ archivedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          previousStatus: true,
          archivedAt: true,
          archiveReason: true,
          restoredAt: true,
          isPublishedToClient: true,
          archivedBy: { select: { name: true } },
          restoredBy: { select: { name: true } },
        },
      },
    },
  });

  if (!project) return null;
  const summary = mapArchiveProject({
    ...project,
    documents: project.documents.filter((document) => document.status === "ARCHIVED"),
  });

  return {
    ...summary,
    documents: project.documents
      .filter((document) =>
        project.status === "ARCHIVED" ? true : document.status === "ARCHIVED",
      )
      .map((document) => ({
      id: document.id,
      name: document.title,
      status: document.status,
      previousStatus: document.previousStatus,
      archivedAt: document.archivedAt?.toISOString() ?? null,
      archivedByName: document.archivedBy?.name ?? null,
      archiveReason: document.archiveReason,
      restoredAt: document.restoredAt?.toISOString() ?? null,
      restoredByName: document.restoredBy?.name ?? null,
      isPublishedToClient: document.isPublishedToClient,
      })),
  };
}
