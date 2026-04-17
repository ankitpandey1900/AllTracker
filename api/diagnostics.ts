import type { IncomingMessage, ServerResponse } from "node:http";

// INLINED HELPERS FOR VERCEL DIAGNOSTICS
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const requiredAuthKeys = [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
    ];

    const missing = requiredAuthKeys.filter((key) => !readEnv(key));
    const databaseUrl = readEnv("DATABASE_URL");

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      status: "diagnostics_active",
      db_configured: !!databaseUrl,
      auth_configured: missing.length === 0,
      missing_keys: missing,
      node_version: process.version,
      database_url_pre: databaseUrl ? databaseUrl.substring(0, 10) + "..." : null
    }));
  } catch (error: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
