import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/organization-access", () => ({
  requireHeadOfOrganization: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { UserRole } from "@/app/generated/prisma/client";
import { buildMemberWhere } from "@/lib/member-search";
import { getActiveOrganizationMembershipWhere } from "@/lib/organization-membership";

describe("canonical active organization membership source", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defines active membership from OrganizationMember and active User state", () => {
    expect(
      getActiveOrganizationMembershipWhere({
        organizationId: "organization-1",
        membershipId: "membership-1",
        role: UserRole.EXPERT,
      }),
    ).toEqual({
      id: "membership-1",
      organizationId: "organization-1",
      role: UserRole.EXPERT,
      removedAt: null,
      user: { isActive: true },
    });
  });

  it("uses the canonical active membership predicate for the Team query", () => {
    expect(
      buildMemberWhere({
        organizationId: "organization-1",
        page: 1,
        pageSize: 20,
        search: "",
        active: true,
        sortBy: "createdAt",
        sortDirection: "desc",
      }),
    ).toEqual({
      organizationId: "organization-1",
      removedAt: null,
      user: { isActive: true },
      AND: [],
    });
  });
});
