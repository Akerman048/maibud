import { describe, expect, it } from "vitest";

import { normalizeError } from "@/lib/error-normalization";

describe("error normalization", () => {
  it("normalizes Prisma errors without query details", () => {
    const error = Object.assign(new Error("Query contains password=secret"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    expect(normalizeError(error, "production")).toEqual({
      name: "PrismaError",
      message: "Database operation failed",
      code: "P2002",
    });
  });

  it("keeps bounded AWS operational metadata", () => {
    const error = Object.assign(new Error("S3 refused request"), {
      name: "S3ServiceException",
      $metadata: { httpStatusCode: 503, requestId: "aws-request-id" },
    });
    expect(normalizeError(error, "production")).toEqual({
      name: "AwsServiceError",
      message: "S3 refused request",
      statusCode: 503,
      requestId: "aws-request-id",
    });
  });

  it("redacts credentials and omits stack in production", () => {
    const normalized = normalizeError(
      new Error("failed postgresql://user:password@db/internal?token=secret"),
      "production",
    );
    expect(normalized.message).not.toContain("password");
    expect(normalized.stack).toBeUndefined();
  });

  it("includes a bounded stack outside production", () => {
    const normalized = normalizeError(new Error("failure"), "test");
    expect(normalized.stack).toContain("Error: failure");
    expect(normalized.stack!.length).toBeLessThanOrEqual(2_000);
  });
});
