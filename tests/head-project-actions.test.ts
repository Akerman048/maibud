import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentHeadOrganization: vi.fn(),
  organizationMemberFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  projectCreate: vi.fn(),
  projectFindFirst: vi.fn(),
  projectUpdateMany: vi.fn(),
  projectMemberDeleteMany: vi.fn(),
  projectMemberCreate: vi.fn(),
  auditCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/organization-access", () => ({
  requireCurrentHeadOrganization: mocks.requireCurrentHeadOrganization,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: mocks.projectFindFirst },
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        organizationMember: { findFirst: mocks.organizationMemberFindFirst },
        user: { findFirst: mocks.userFindFirst },
        project: {
          create: mocks.projectCreate,
          updateMany: mocks.projectUpdateMany,
        },
        projectMember: {
          deleteMany: mocks.projectMemberDeleteMany,
          create: mocks.projectMemberCreate,
        },
        auditLog: { create: mocks.auditCreate },
      }),
  },
}));

import { createProject, updateProject } from "@/app/dashboard/head/actions";

function projectForm(expert = "") {
  const form = new FormData();
  form.set("id", "project-1");
  form.set("name", "Project");
  form.set("address", "Address");
  form.set("customer", "Customer");
  form.set("stage", "Review");
  form.set("deadline", "2027-01-01");
  form.set("expert", expert);
  return form;
}

describe("HEAD project expert assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentHeadOrganization.mockResolvedValue({
      user: { id: "head-1" },
      organization: { id: "organization-1" },
    });
    mocks.organizationMemberFindFirst.mockResolvedValue({ id: "head-membership" });
    mocks.projectCreate.mockResolvedValue({ id: "project-1" });
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1", status: "OPEN" });
    mocks.projectUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("creates a project atomically without an expert or fallback assignment", async () => {
    await createProject(projectForm());
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
    expect(mocks.projectCreate.mock.calls[0][0].data.organizationId).toBe(
      "organization-1",
    );
    expect(mocks.projectCreate.mock.calls[0][0].data.members.create).toEqual([
      { userId: "head-1", role: "HEAD" },
    ]);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects a selected expert without an active EXPERT membership in the organization", async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    await expect(createProject(projectForm("foreign-expert"))).rejects.toThrow(
      "Expert not found in organization",
    );
    expect(mocks.projectCreate).not.toHaveBeenCalled();
    expect(mocks.userFindFirst.mock.calls[0][0].where).toMatchObject({
      id: "foreign-expert",
      isActive: true,
      organizationMemberships: {
        some: {
          organizationId: "organization-1",
          role: "EXPERT",
          removedAt: null,
        },
      },
    });
  });

  it("assigns an organization expert later and replaces the prior expert", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "expert-1" });
    await updateProject(projectForm("expert-1"));
    expect(mocks.projectMemberDeleteMany).toHaveBeenCalledWith({
      where: { projectId: "project-1", role: "EXPERT" },
    });
    expect(mocks.projectMemberCreate).toHaveBeenCalledWith({
      data: { projectId: "project-1", userId: "expert-1", role: "EXPERT" },
    });
  });
});
