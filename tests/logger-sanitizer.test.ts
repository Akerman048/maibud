import { describe, expect, it } from "vitest";

import { createLogRecord, sanitizeLogContext } from "@/lib/logger";

describe("structured logger sanitizer", () => {
  it("recursively redacts credentials and business-sensitive payloads", () => {
    const sanitized = sanitizeLogContext({
      requestId: "req-1",
      authorization: "Bearer secret",
      nested: {
        passwordHash: "hash",
        cookie: "session=secret",
        objectKey: "organizations/private.pdf",
        payload: { invitationToken: "raw-token" },
      },
    });

    expect(sanitized).toEqual({
      requestId: "req-1",
      authorization: "[REDACTED]",
      nested: {
        passwordHash: "[REDACTED]",
        cookie: "[REDACTED]",
        objectKey: "[REDACTED]",
        payload: "[REDACTED]",
      },
    });
  });

  it("bounds nested, circular, array and string values", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const sanitized = sanitizeLogContext({
      circular,
      items: Array.from({ length: 30 }, (_, index) => index),
      text: "x".repeat(700),
    }) as Record<string, unknown>;

    expect(sanitized.circular).toEqual({ self: "[CIRCULAR]" });
    expect(sanitized.items).toHaveLength(20);
    expect((sanitized.text as string).length).toBeLessThanOrEqual(501);
  });

  it("creates one JSON-serializable record with mandatory fields", () => {
    const record = createLogRecord("info", "request completed", { status: 200 });
    expect(record).toMatchObject({ level: "info", message: "request completed", status: 200 });
    expect(() => JSON.stringify(record)).not.toThrow();
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });
});
