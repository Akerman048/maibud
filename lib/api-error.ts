import { NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/auth-guard";

export function getAuthorizationErrorResponse(error: unknown) {
  if (!(error instanceof AuthorizationError)) {
    return null;
  }

  return NextResponse.json(
    {
      error: error.message,
    },
    {
      status: error.status,
    },
  );
}