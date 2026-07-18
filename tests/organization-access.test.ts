import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  requireUser: vi.fn(),
  AuthorizationError: class AuthorizationError extends Error {
    status: 401 | 403;
    constructor(message: string, status: 401 | 403) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-guard", () => ({
  AuthorizationError: mocks.AuthorizationError,
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { organizationMember: { findFirst: mocks.findFirst } },
}));

import { requireCurrentHeadOrganization } from "@/lib/organization-access";

describe("current HEAD organization authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "head-1" });
  });

  it("selects a deterministic active database membership instead of trusting the session role", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "membership-1",
      organizationId: "organization-1",
      role: "HEAD",
      user: { email: "head@example.com" },
      organization: { id: "organization-1", name: "First organization" },
    });

    await expect(requireCurrentHeadOrganization()).resolves.toMatchObject({
      actorEmail: "head@example.com",
      organization: { id: "organization-1" },
    });
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "head-1",
          role: "HEAD",
          removedAt: null,
          user: { isActive: true },
        },
        orderBy: [
          { organization: { createdAt: "asc" } },
          { joinedAt: "asc" },
          { id: "asc" },
        ],
      }),
    );
  });

  it("rejects a stale session when the active HEAD membership no longer exists", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(requireCurrentHeadOrganization()).rejects.toMatchObject({
      status: 403,
    });
  });
});
