import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  httpRequest: vi.fn(),
  authGet: vi.fn(),
  authPost: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }));
vi.mock("@/lib/metrics", () => ({
  metrics: { httpRequest: mocks.httpRequest },
}));
vi.mock("@/auth", () => ({
  handlers: { GET: mocks.authGet, POST: mocks.authPost },
}));

import {
  withApiObservability,
} from "@/lib/api-observability";
import {
  GET as authGetRoute,
  POST as authPostRoute,
} from "@/app/api/auth/[...nextauth]/route";

const context = {} as never;

function request(method = "GET", path = "/api/test") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "x-request-id": "runtime-request-id" },
  });
}

function getSetCookies(headers: Headers) {
  return (headers as Headers & { getSetCookie(): string[] }).getSetCookie();
}

describe("API response observability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wraps an immutable redirect without mutating it", async () => {
    const original = Response.redirect("https://example.com/dashboard", 307);
    expect(() => original.headers.set("x-test", "value")).toThrow("immutable");

    const wrapped = withApiObservability("/api/test", async () => original);
    const response = await wrapped(request(), context);

    expect(response).not.toBe(original);
    expect(response.status).toBe(307);
    expect(response.statusText).toBe(original.statusText);
    expect(response.headers.get("location")).toBe(
      "https://example.com/dashboard",
    );
    expect(response.headers.get("x-request-id")).toBe("runtime-request-id");
  });

  it("preserves content type, multiple cookies, status and body", async () => {
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", "authjs.csrf-token=csrf-value; Path=/; HttpOnly");
    headers.append("set-cookie", "authjs.state=state-value; Path=/; HttpOnly");
    const original = new Response('{"ok":true}', {
      status: 202,
      statusText: "Accepted",
      headers,
    });

    const response = await withApiObservability(
      "/api/test",
      async () => original,
    )(request(), context);

    expect(response.status).toBe(202);
    expect(response.statusText).toBe("Accepted");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(getSetCookies(response.headers)).toEqual([
      "authjs.csrf-token=csrf-value; Path=/; HttpOnly",
      "authjs.state=state-value; Path=/; HttpOnly",
    ]);
    expect(await response.text()).toBe('{"ok":true}');
  });

  it("does not consume a streaming response", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("streamed"));
        controller.close();
      },
    });
    const original = new Response(stream);
    const textSpy = vi.spyOn(original, "text");
    const jsonSpy = vi.spyOn(original, "json");
    const arrayBufferSpy = vi.spyOn(original, "arrayBuffer");

    const response = await withApiObservability(
      "/api/stream",
      async () => original,
    )(request(), context);

    expect(original.bodyUsed).toBe(false);
    expect(response.bodyUsed).toBe(false);
    expect(textSpy).not.toHaveBeenCalled();
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(await response.text()).toBe("streamed");
  });

  it("handles thrown errors and redacts OAuth callback secrets", async () => {
    const wrapped = withApiObservability("/api/auth/[...nextauth]", async () => {
      throw new Error(
        "callback failed at http://localhost/api/auth/callback/google?code=oauth-code-secret&state=oauth-state-secret&id_token=id-secret&access_token=access-secret",
      );
    });

    const response = await wrapped(
      request(
        "GET",
        "/api/auth/callback/google?code=request-code-secret&state=request-state-secret",
      ),
      context,
    );
    const logged = JSON.stringify(mocks.logger.error.mock.calls);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Internal server error",
      requestId: "runtime-request-id",
    });
    expect(logged).not.toContain("oauth-code-secret");
    expect(logged).not.toContain("oauth-state-secret");
    expect(logged).not.toContain("id-secret");
    expect(logged).not.toContain("access-secret");
    expect(logged).not.toContain("request-code-secret");
    expect(logged).not.toContain("request-state-secret");
    expect(logged).toContain("[REDACTED]");
  });

  it("continues to support ordinary mutable responses", async () => {
    const original = new Response("ordinary", { status: 200 });
    expect(() => original.headers.set("x-test", "value")).not.toThrow();

    const response = await withApiObservability(
      "/api/test",
      async () => original,
    )(request(), context);

    expect(response.headers.get("x-request-id")).toBe("runtime-request-id");
    expect(await response.text()).toBe("ordinary");
    expect(mocks.httpRequest).toHaveBeenCalledWith(
      "/api/test",
      "GET",
      200,
      expect.any(Number),
    );
  });
});

describe("Auth.js handlers through observability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves an immutable GET callback redirect", async () => {
    mocks.authGet.mockResolvedValue(
      Response.redirect("http://localhost/dashboard", 302),
    );

    const response = await authGetRoute(
      request(
        "GET",
        "/api/auth/callback/google?code=secret&state=secret",
      ) as Parameters<typeof authGetRoute>[0],
      context,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard",
    );
    expect(response.headers.get("x-request-id")).toBe("runtime-request-id");
  });

  it("preserves POST cookies without collapsing them", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "authjs.callback-url=%2Fdashboard; Path=/");
    headers.append("set-cookie", "authjs.csrf-token=csrf; Path=/; HttpOnly");
    mocks.authPost.mockResolvedValue(new Response(null, { status: 200, headers }));

    const response = await authPostRoute(
      request("POST", "/api/auth/signin") as Parameters<
        typeof authPostRoute
      >[0],
      context,
    );

    expect(response.status).toBe(200);
    expect(getSetCookies(response.headers)).toEqual([
      "authjs.callback-url=%2Fdashboard; Path=/",
      "authjs.csrf-token=csrf; Path=/; HttpOnly",
    ]);
  });
});
