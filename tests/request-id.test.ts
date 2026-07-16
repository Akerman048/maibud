import { describe, expect, it } from "vitest";

import { getRequestId, isValidRequestId } from "@/lib/request-id";

describe("request id", () => {
  it("accepts a bounded safe incoming id", () => {
    expect(getRequestId("trace_123:abc.def-9")).toBe("trace_123:abc.def-9");
  });

  it.each([null, "", " has-space", "path/id", "x".repeat(101)])(
    "generates a UUID for invalid value %s",
    (value) => {
      const requestId = getRequestId(value);
      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(isValidRequestId(requestId)).toBe(true);
    },
  );
});
