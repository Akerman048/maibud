import { describe, expect, it } from "vitest";

import {
  normalizeAuthErrorForLogging,
  normalizeError,
} from "@/lib/error-normalization";

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

  it("normalizes an Auth.js-like nested adapter error without constructor names", () => {
    const normalized = normalizeAuthErrorForLogging({
      type: "AdapterError",
      cause: {
        err: new Error(
          "relation Account does not exist; Bearer bearer-secret; id_token=id-secret",
        ),
      },
    });

    expect(normalized).toMatchObject({
      errorType: "AdapterError",
      causeErrorName: "Error",
      causeErrorMessage: expect.stringContaining("relation Account does not exist"),
    });
    expect(JSON.stringify(normalized)).not.toContain("bearer-secret");
    expect(JSON.stringify(normalized)).not.toContain("id-secret");
  });

  it.each([
    "Configuration",
    "MissingSecret",
    "UntrustedHost",
    "AdapterError",
    "OAuthCallbackError",
    "CallbackRouteError",
    "AccessDenied",
    "CredentialsSignin",
    "JWTSessionError",
  ])("preserves the stable Auth.js type %s", (type) => {
    expect(normalizeAuthErrorForLogging({ type, name: "f" })).toMatchObject({
      errorType: type,
      errorName: "f",
    });
  });

  it("omits details that are not safely structured", () => {
    expect(
      normalizeAuthErrorForLogging({
        type: "AdapterError",
        details: new Error("must not be serialized as details"),
      }),
    ).not.toHaveProperty("details");
  });
});
