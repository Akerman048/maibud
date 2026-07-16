import { NextResponse } from "next/server";

import packageJson from "@/package.json";
import {
  methodNotAllowed,
  withApiObservability,
} from "@/lib/api-observability";

export const dynamic = "force-dynamic";

export const GET = withApiObservability("/api/health", async () =>
  NextResponse.json(
    {
      status: "ok",
      service: "maibud",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION?.trim() || packageJson.version,
      environment: process.env.NODE_ENV ?? "development",
    },
    { headers: { "cache-control": "no-store" } },
  ),
);

export const HEAD = methodNotAllowed("/api/health");
export const POST = methodNotAllowed("/api/health");
export const PUT = methodNotAllowed("/api/health");
