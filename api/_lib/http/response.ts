import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { ConfigurationError } from "../config/env.js";

function applyDefaultHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-XSS-Protection", "1; mode=block");
}

export function sendJson(
  res: ServerResponse,
  status: number,
  payload: unknown,
): void {
  res.statusCode = status;
  applyDefaultHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

/**
 * Like sendJson, but for data that clients poll. The response carries an ETag
 * and may be revalidated by the browser; if nothing changed since the copy the
 * browser already has, it gets an empty 304 and reuses that copy. The data is
 * never stale: the server still builds it on every request.
 */
export function sendJsonWithEtag(
  req: IncomingMessage,
  res: ServerResponse,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  applyDefaultHeaders(res);
  // Private to this user; the browser must check with the server every time.
  res.setHeader("Cache-Control", "private, no-cache");
  res.setHeader("ETag", etag);

  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}

export function sendMethodNotAllowed(
  res: ServerResponse,
  allowed: string[],
): void {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, { error: "Method not allowed" });
}

export function sendServiceUnavailable(
  res: ServerResponse,
  message: string,
): void {
  sendJson(res, 503, {
    error: message,
    code: "SERVICE_NOT_CONFIGURED",
  });
}

export function handleRouteError(
  res: ServerResponse,
  error: unknown,
): void {
  console.error("[ROUTE ERROR]", error);

  if (error instanceof ConfigurationError) {
    sendServiceUnavailable(res, error.message);
    return;
  }

  // Do not leak internal error details to clients in production
  const isDev = process.env.NODE_ENV !== "production";
  const message = isDev && error instanceof Error
    ? error.message
    : "An unexpected error occurred. Please try again.";
  sendJson(res, 500, { error: message, code: "INTERNAL_SERVER_ERROR" });
}
