import { NextResponse } from "next/server";

import {
  methodNotAllowed,
  withApiObservability,
} from "@/lib/api-observability";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";

const READINESS_TIMEOUT_MS = 4_000;

export const dynamic = "force-dynamic";

export const GET = withApiObservability("/api/ready", async () => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Readiness check timed out")),
          READINESS_TIMEOUT_MS,
        );
      }),
    ]);
    return NextResponse.json(
      {
        status: "ready",
        database: "ok",
        timestamp: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    metrics.dbReadinessFailure();
    logger.warn("Database readiness check failed", {
      errorCode: "DB_READINESS_FAILED",
    });
    return NextResponse.json(
      { status: "not_ready", database: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
});

export const HEAD = methodNotAllowed("/api/ready");
export const POST = methodNotAllowed("/api/ready");
export const PUT = methodNotAllowed("/api/ready");
