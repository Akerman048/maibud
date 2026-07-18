import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({ count: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-guard", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { commentThread: { count: mocks.count } },
}));

import { getOpenCommentThreadCount } from "@/lib/comment-threads";

describe("sidebar comment count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.count.mockResolvedValue(7);
  });

  it.each([UserRole.EXPERT, UserRole.DESIGNER])(
    "counts real open and returned threads available through %s project membership",
    async (role) => {
      await expect(
        getOpenCommentThreadCount("current-user", role),
      ).resolves.toBe(7);

      expect(mocks.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              document: {
                project: {
                  members: {
                    some: {
                      userId: "current-user",
                      role,
                    },
                  },
                },
              },
            },
            { status: { in: ["OPEN", "RETURNED"] } },
          ],
        },
      });
    },
  );

  it("does not query an internal comment count for roles without that navigation item", async () => {
    await expect(
      getOpenCommentThreadCount("head-user", UserRole.HEAD),
    ).resolves.toBe(0);
    expect(mocks.count).not.toHaveBeenCalled();
  });
});
