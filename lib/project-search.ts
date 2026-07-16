import "server-only";

import {
  Prisma,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { firstQueryValue, getPaginationMeta, normalizeSearchQuery, parseDateEndParam, parseDateParam, parsePage, parsePageSize, parseSortDirection } from "@/lib/query-params";
import { getProjectSortField } from "@/lib/search-sort-policy";
import type { Project } from "@/types/project";
import type { PaginatedResult, SortDirection } from "@/types/query";

export type ProjectSearchParams = {
  currentUserId: string;
  role: UserRole;
  page: number;
  pageSize: number;
  search: string;
  status?: ProjectStatus;
  customer?: string;
  expertId?: string;
  designerId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  sortBy: string;
  sortDirection: SortDirection;
  archived: boolean;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function normalizeProjectSearchParams(raw: RawSearchParams, currentUserId: string, role: UserRole): ProjectSearchParams {
  const value = (key: string) => firstQueryValue(raw[key]);
  const rawStatus = value("status");
  return {
    currentUserId,
    role,
    page: parsePage(value("page")),
    pageSize: parsePageSize(value("pageSize")),
    search: normalizeSearchQuery(value("search")),
    status: rawStatus && Object.values(ProjectStatus).includes(rawStatus as ProjectStatus) ? rawStatus as ProjectStatus : undefined,
    customer: normalizeSearchQuery(value("customer")) || undefined,
    expertId: value("expertId"),
    designerId: value("designerId"),
    createdFrom: parseDateParam(value("createdFrom")) ?? undefined,
    createdTo: parseDateEndParam(value("createdTo")) ?? undefined,
    deadlineFrom: parseDateParam(value("deadlineFrom")) ?? undefined,
    deadlineTo: parseDateEndParam(value("deadlineTo")) ?? undefined,
    sortBy: getProjectSortField(value("sortBy")),
    sortDirection: parseSortDirection(value("sortDirection")),
    archived: value("archived") === "true",
  };
}

function accessWhere(currentUserId: string, role: UserRole): Prisma.ProjectWhereInput {
  if (role === UserRole.EXPERT || role === UserRole.DESIGNER || role === UserRole.CLIENT) {
    return {
      members: {
        some: {
          userId: currentUserId,
          role,
          user: { isActive: true, role },
        },
      },
    };
  }
  if (role === UserRole.HEAD) {
    return {
      members: { some: { userId: currentUserId, role } },
      organization: {
        members: {
          some: {
            userId: currentUserId,
            role,
            removedAt: null,
            user: { isActive: true, role },
          },
        },
      },
    };
  }
  if (role === UserRole.ARCHIVIST) {
    return {
      organization: {
        members: {
          some: {
            userId: currentUserId,
            role,
            removedAt: null,
            user: { isActive: true, role },
          },
        },
      },
    };
  }
  return { id: "__project_access_denied__" };
}

export function buildProjectWhere(params: ProjectSearchParams): Prisma.ProjectWhereInput {
  const createdAt = params.createdFrom || params.createdTo
    ? { ...(params.createdFrom ? { gte: params.createdFrom } : {}), ...(params.createdTo ? { lte: params.createdTo } : {}) }
    : undefined;
  const deadline = params.deadlineFrom || params.deadlineTo
    ? { ...(params.deadlineFrom ? { gte: params.deadlineFrom } : {}), ...(params.deadlineTo ? { lte: params.deadlineTo } : {}) }
    : undefined;

  return {
    AND: [
      accessWhere(params.currentUserId, params.role),
      params.archived
        ? { OR: [{ status: ProjectStatus.ARCHIVED }, { archivedAt: { not: null } }] }
        : { status: { not: ProjectStatus.ARCHIVED }, archivedAt: null },
      ...(params.search ? [{ OR: [
        { name: { contains: params.search, mode: "insensitive" as const } },
        { address: { contains: params.search, mode: "insensitive" as const } },
        { customer: { contains: params.search, mode: "insensitive" as const } },
        { stage: { contains: params.search, mode: "insensitive" as const } },
      ] }] : []),
      ...(params.status ? [{ status: params.status }] : []),
      ...(params.customer ? [{ customer: { contains: params.customer, mode: "insensitive" as const } }] : []),
      ...(params.expertId ? [{ members: { some: { userId: params.expertId, role: UserRole.EXPERT } } }] : []),
      ...(params.designerId ? [{ members: { some: { userId: params.designerId, role: UserRole.DESIGNER } } }] : []),
      ...(createdAt ? [{ createdAt }] : []),
      ...(deadline ? [{ deadline }] : []),
    ],
  };
}

export function buildProjectOrderBy(sortBy: string, direction: SortDirection): Prisma.ProjectOrderByWithRelationInput[] {
  const field = getProjectSortField(sortBy);
  const primary: Prisma.ProjectOrderByWithRelationInput =
    field === "deadline"
      ? { deadline: { sort: direction, nulls: "last" } }
      : field === "name" ? { name: direction }
      : field === "status" ? { status: direction }
      : field === "updatedAt" ? { updatedAt: direction }
      : { createdAt: direction };
  return [primary, { id: direction }];
}

const select = {
  id: true, name: true, address: true, customer: true, stage: true,
  deadline: true, status: true, archivedAt: true, archiveReason: true,
  restoredAt: true,
  archivedBy: { select: { name: true } },
  restoredBy: { select: { name: true } },
  members: {
    where: { role: UserRole.EXPERT },
    take: 1,
    select: { user: { select: { name: true } } },
  },
} satisfies Prisma.ProjectSelect;

const clientSelect = {
  id: true,
  name: true,
  address: true,
  customer: true,
  deadline: true,
  status: true,
} satisfies Prisma.ProjectSelect;

function mapStatus(status: ProjectStatus): Project["status"] {
  if (status === ProjectStatus.IN_PROGRESS) return "processed";
  if (status === ProjectStatus.RETURNED) return "returned";
  if (status === ProjectStatus.COMPLETED) return "resolved";
  if (status === ProjectStatus.ARCHIVED) return "archived";
  return "open";
}

export async function searchProjects(params: ProjectSearchParams): Promise<PaginatedResult<Project>> {
  const where = buildProjectWhere(params);

  if (params.role === UserRole.CLIENT) {
    const [total, records] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        select: clientSelect,
        orderBy: buildProjectOrderBy(params.sortBy, params.sortDirection),
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return {
      items: records.map((project) => ({
        id: project.id,
        name: project.name,
        address: project.address,
        customer: project.customer,
        stage: "",
        expert: "—",
        deadline: project.deadline?.toLocaleDateString("uk-UA") ?? "—",
        status: mapStatus(project.status),
      })),
      pagination: getPaginationMeta({
        page: params.page,
        pageSize: params.pageSize,
        total,
      }),
    };
  }

  const [total, records] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      select,
      orderBy: buildProjectOrderBy(params.sortBy, params.sortDirection),
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return {
    items: records.map((project) => ({
      id: project.id,
      name: project.name,
      address: project.address,
      customer: project.customer,
      stage: project.stage,
      expert: project.members[0]?.user.name ?? "Не призначено",
      deadline: project.deadline?.toLocaleDateString("uk-UA") ?? "—",
      status: mapStatus(project.status),
      archivedAt: project.archivedAt?.toISOString() ?? null,
      archivedByName: project.archivedBy?.name ?? null,
      archiveReason: project.archiveReason,
      restoredAt: project.restoredAt?.toISOString() ?? null,
      restoredByName: project.restoredBy?.name ?? null,
    })),
    pagination: getPaginationMeta({ page: params.page, pageSize: params.pageSize, total }),
  };
}
