import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    status: "ok",
    message: "Debug endpoint is active",
    timestamp: new Date().toISOString(),
    env_keys: Object.keys(process.env).filter(k => 
      k.includes("DATABASE") || k.includes("AUTH") || k.includes("GOOGLE") || k.includes("GITHUB")
    ),
    node_version: process.version
  }));
}
