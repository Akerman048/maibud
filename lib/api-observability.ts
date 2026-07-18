import "server-only";

import { NextResponse } from "next/server";

import { normalizeError } from "@/lib/error-normalization";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { getRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

type RouteHandler<TRequest extends Request = Request, TContext = unknown> = (
  request: TRequest,
  context: TContext,
) => Response | Promise<Response>;

export function withApiObservability<TRequest extends Request, TContext>(
  route: string,
  handler: RouteHandler<TRequest, TContext>,
): RouteHandler<TRequest, TContext> {
  return async (request, context) => {
    const requestId = getRequestId(request.headers.get(REQUEST_ID_HEADER));
    const startedAt = performance.now();
    let response: Response;

    try {
      response = await handler(request, context);
    } catch (error) {
      logger.error("Unhandled API error", {
        requestId,
        route,
        method: request.method,
        error: normalizeError(error),
      });
      response = NextResponse.json(
        { error: "Internal server error", requestId },
        { status: 500 },
      );
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set(REQUEST_ID_HEADER, requestId);
    const observedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const contextFields = {
      requestId,
      route,
      method: request.method,
      status: observedResponse.status,
      durationMs,
    };
    if (observedResponse.status >= 500) logger.error("API request completed", contextFields);
    else if (observedResponse.status >= 400) logger.warn("API request completed", contextFields);
    else logger.info("API request completed", contextFields);
    metrics.httpRequest(
      route,
      request.method,
      observedResponse.status,
      durationMs,
    );
    return observedResponse;
  };
}

export function methodNotAllowed(route: string) {
  return withApiObservability(route, async (request) =>
    request.method === "HEAD"
      ? new Response(null, { status: 405, headers: { allow: "GET" } })
      : NextResponse.json(
          { error: "Method not allowed" },
          { status: 405, headers: { allow: "GET" } },
        ),
  );
}
