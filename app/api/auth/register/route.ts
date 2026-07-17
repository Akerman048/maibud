import { NextResponse } from "next/server";

import { withApiObservability } from "@/lib/api-observability";
import {
  registerOrganization,
  RegistrationEmailConflictError,
} from "@/lib/organization-registration";
import {
  checkRegistrationRateLimit,
  getRegistrationClientIp,
} from "@/lib/registration-rate-limit";
import { registrationSchema } from "@/lib/registration-validation";

export const dynamic = "force-dynamic";
export const MAX_REGISTRATION_BODY_BYTES = 16 * 1024;

const NO_STORE_HEADERS = { "cache-control": "no-store" };

export const POST = withApiObservability(
  "/api/auth/register",
  async (request) => {
    const rateLimit = checkRegistrationRateLimit(
      getRegistrationClientIp(request),
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Забагато спроб. Спробуйте пізніше." },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "retry-after": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength !== null && /^\d+$/.test(contentLength)) {
      if (BigInt(contentLength) > BigInt(MAX_REGISTRATION_BODY_BYTES)) {
        return NextResponse.json(
          { error: "Запит занадто великий." },
          { status: 413, headers: NO_STORE_HEADERS },
        );
      }
    }

    let body: unknown;

    try {
      const bodyText = await request.text();
      const actualBytes = new TextEncoder().encode(bodyText).byteLength;

      if (actualBytes > MAX_REGISTRATION_BODY_BYTES) {
        return NextResponse.json(
          { error: "Запит занадто великий." },
          { status: 413, headers: NO_STORE_HEADERS },
        );
      }

      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: "Некоректний формат запиту." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Перевірте введені дані.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    try {
      await registerOrganization(parsed.data);

      return NextResponse.json(
        { success: true },
        { status: 201, headers: NO_STORE_HEADERS },
      );
    } catch (error) {
      if (error instanceof RegistrationEmailConflictError) {
        return NextResponse.json(
          {
            error: "Обліковий запис із цим email уже існує.",
            fieldErrors: {
              email: ["Обліковий запис із цим email уже існує."],
            },
          },
          { status: 409, headers: NO_STORE_HEADERS },
        );
      }

      throw error;
    }
  },
);
