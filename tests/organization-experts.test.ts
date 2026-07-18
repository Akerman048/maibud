import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { organizationMember: { findMany: mocks.findMany } },
}));

import {
  BUSY_EXPERT_PROJECT_THRESHOLD,
  getOrganizationExperts,
} from "@/lib/projects";

describe("organization experts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries only active EXPERT memberships in the selected organization and derives workload", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "membership-1",
        user: {
          id: "expert-1",
          name: "Expert One",
          memberships: Array.from(
            { length: BUSY_EXPERT_PROJECT_THRESHOLD },
            (_, index) => ({ projectId: `project-${index}` }),
          ),
        },
      },
    ]);

    await expect(getOrganizationExperts("organization-1")).resolves.toEqual([
      {
        id: "expert-1",
        name: "Expert One",
        activeProjects: BUSY_EXPERT_PROJECT_THRESHOLD,
        status: "busy",
      },
    ]);

    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toEqual({
      organizationId: "organization-1",
      role: "EXPERT",
      removedAt: null,
      user: { isActive: true },
    });
    expect(query.select.user.select.memberships.where).toEqual({
      role: "EXPERT",
      project: {
        organizationId: "organization-1",
        status: { notIn: ["ARCHIVED", "COMPLETED"] },
      },
    });
  });
});
