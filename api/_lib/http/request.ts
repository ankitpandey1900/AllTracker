import type { IncomingHttpHeaders, IncomingMessage } from "node:http";

export function headersFromNode(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(key, item));
    } else if (typeof value === "string") {
      result.set(key, value);
    }
  }
  return result;
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as T;
}

