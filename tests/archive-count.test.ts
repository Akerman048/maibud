import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({ count: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { project: { count: mocks.count } },
}));

import { getArchiveProjectCount } from "@/lib/archive";

describe("archive sidebar count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.count.mockResolvedValue(2);
  });

  it("counts the same archived projects available to a designer", async () => {
    await expect(
      getArchiveProjectCount("designer-user", UserRole.DESIGNER),
    ).resolves.toBe(2);

    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            members: {
              some: { userId: "designer-user", role: UserRole.DESIGNER },
            },
          },
          {
            OR: [
              { status: "ARCHIVED" },
              { documents: { some: { status: "ARCHIVED" } } },
            ],
          },
        ],
      },
    });
  });
});
