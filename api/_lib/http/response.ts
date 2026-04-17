import type { ServerResponse } from "node:http";
import { ConfigurationError } from "../config/env";

function applyDefaultHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
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
  if (error instanceof ConfigurationError) {
    sendServiceUnavailable(res, error.message);
    return;
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  sendJson(res, 500, { error: message, code: "INTERNAL_SERVER_ERROR" });
}
