import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("creates a hash that the Credentials login verifier accepts", async () => {
    const passwordHash = await hashPassword("Secure123");

    await expect(verifyPassword("Secure123", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("Wrong123", passwordHash)).resolves.toBe(false);
    expect(passwordHash).not.toContain("Secure123");
  });
});
