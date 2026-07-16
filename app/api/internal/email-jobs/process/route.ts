import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { withApiObservability } from "@/lib/api-observability";
import { metrics } from "@/lib/metrics";

import {
  assertEmailProviderConfigured,
  EmailProviderConfigurationError,
} from "@/lib/email/provider";
import { processEmailJobs } from "@/lib/email/email-worker";
import {
  EmailTemplateConfigurationError,
  getValidatedAppUrl,
} from "@/lib/email/templates";

function securelyMatches(value: string, expected: string) {
  const actualHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

async function processEmailJobsRequest(request: Request) {
  const secret = process.env.EMAIL_JOB_SECRET?.trim();

  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: "Email worker is not configured" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!securelyMatches(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEmailProviderConfigured();
    getValidatedAppUrl();
    const result = await processEmailJobs({ batchSize: 10 });
    metrics.emailJobs(result.sent, "success");
    metrics.emailJobs(result.failed + result.cancelled, "failure");
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof EmailProviderConfigurationError ||
      error instanceof EmailTemplateConfigurationError
    ) {
      return NextResponse.json(
        { error: "Email provider is not configured" },
        { status: 503 },
      );
    }

    metrics.emailJobs(1, "failure");
    throw error;
  }
}

export const POST = withApiObservability(
  "/api/internal/email-jobs/process",
  processEmailJobsRequest,
);
