import { describe, expect, it } from "vitest";

import { UserRole } from "@/app/generated/prisma/client";
import { getUserRoleLabel } from "@/lib/user-role";

describe("getUserRoleLabel", () => {
  it.each([
    [UserRole.HEAD, "Керівник"],
    [UserRole.EXPERT, "Експерт"],
    [UserRole.DESIGNER, "Проєктувальник"],
    [UserRole.ARCHIVIST, "Архівіст"],
    [UserRole.CLIENT, "Замовник"],
  ])("localizes %s as %s", (role, label) => {
    expect(getUserRoleLabel(role)).toBe(label);
  });
});
