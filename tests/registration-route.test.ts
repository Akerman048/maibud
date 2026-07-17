import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registerOrganization: vi.fn(),
  RegistrationEmailConflictError: class RegistrationEmailConflictError extends Error {},
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-observability", () => ({
  withApiObservability: (_route: string, handler: unknown) => handler,
}));
vi.mock("@/lib/organization-registration", () => ({
  RegistrationEmailConflictError: mocks.RegistrationEmailConflictError,
  registerOrganization: mocks.registerOrganization,
}));

import {
  MAX_REGISTRATION_BODY_BYTES,
  POST,
} from "@/app/api/auth/register/route";
import {
  getRegistrationClientIp,
  resetRegistrationRateLimitForTests,
} from "@/lib/registration-rate-limit";

const validRegistration = {
  firstName: "Сергій",
  lastName: "Петренко",
  email: "owner@example.com",
  password: "Secure123",
  confirmPassword: "Secure123",
  organizationName: "МайБуд Проєкт",
  termsAccepted: true,
};

function registrationRequest(
  body: string = JSON.stringify(validRegistration),
  options: { ip?: string; contentLength?: string } = {},
) {
  const headers = new Headers({
    "content-type": "application/json",
    "x-forwarded-for": options.ip ?? "203.0.113.10",
  });
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }

  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers,
    body,
  });
}

async function post(request: Request) {
  return POST(request, undefined);
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.stubEnv("RENDER", "true");
    resetRegistrationRateLimitForTests();
    mocks.registerOrganization.mockReset();
    mocks.registerOrganization.mockResolvedValue({
      userId: "user-1",
      organizationId: "organization-1",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts normal JSON and calls registration", async () => {
    const response = await post(registrationRequest());

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.registerOrganization).toHaveBeenCalledWith(validRegistration);
  });

  it("allows requests through the limit and blocks the next request", async () => {
    for (let requestNumber = 1; requestNumber <= 5; requestNumber += 1) {
      expect((await post(registrationRequest())).status).toBe(201);
    }

    const blocked = await post(registrationRequest());

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    expect(mocks.registerOrganization).toHaveBeenCalledTimes(5);
  });

  it("keeps counters separate for different trusted client IPs", async () => {
    for (let requestNumber = 1; requestNumber <= 5; requestNumber += 1) {
      await post(registrationRequest(undefined, { ip: "203.0.113.10" }));
    }

    const response = await post(
      registrationRequest(undefined, { ip: "198.51.100.20" }),
    );

    expect(response.status).toBe(201);
    expect(mocks.registerOrganization).toHaveBeenCalledTimes(6);
  });

  it("uses platform-trusted IP headers and ignores forwarding headers locally", () => {
    const headers = {
      "x-forwarded-for": "203.0.113.10, 192.0.2.1",
      "x-vercel-forwarded-for": "198.51.100.20",
    };

    expect(
      getRegistrationClientIp(new Request("http://localhost", { headers })),
    ).toBe("203.0.113.10");

    vi.stubEnv("RENDER", "");
    vi.stubEnv("VERCEL", "true");
    expect(
      getRegistrationClientIp(new Request("http://localhost", { headers })),
    ).toBe("198.51.100.20");

    vi.stubEnv("VERCEL", "");
    expect(
      getRegistrationClientIp(new Request("http://localhost", { headers })),
    ).toBe("unknown");
  });

  it("can reset process-local counters between tests", async () => {
    for (let requestNumber = 1; requestNumber <= 5; requestNumber += 1) {
      await post(registrationRequest());
    }
    expect((await post(registrationRequest())).status).toBe(429);

    resetRegistrationRateLimitForTests();

    expect((await post(registrationRequest())).status).toBe(201);
  });

  it("rejects an oversized declared Content-Length before reading or registering", async () => {
    const response = await post(
      registrationRequest("{}", {
        contentLength: String(MAX_REGISTRATION_BODY_BYTES + 1),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Запит занадто великий.",
    });
    expect(mocks.registerOrganization).not.toHaveBeenCalled();
  });

  it("rejects an oversized actual UTF-8 body without Content-Length", async () => {
    const oversizedBody = JSON.stringify({ value: "є".repeat(8_192) });
    expect(oversizedBody.length).toBeLessThan(MAX_REGISTRATION_BODY_BYTES);
    expect(new TextEncoder().encode(oversizedBody).byteLength).toBeGreaterThan(
      MAX_REGISTRATION_BODY_BYTES,
    );

    const response = await post(registrationRequest(oversizedBody));

    expect(response.status).toBe(413);
    expect(mocks.registerOrganization).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON without invoking registration", async () => {
    const response = await post(registrationRequest("{not-json"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Некоректний формат запиту.",
    });
    expect(mocks.registerOrganization).not.toHaveBeenCalled();
  });
});
