import { toNodeHandler } from "better-auth/node";
import { getAuth } from "../_lib/auth/index.js";
import { handleRouteError } from "../_lib/http/response.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  // Diagnostic Route to verify the file is reachable even if Better Auth fails
  if (req.url.endsWith("/health") || req.url.includes("/health?")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "LIVE",
      method: req.method,
      url: req.url,
      host: req.headers?.host,
      proto: req.headers?.["x-forwarded-proto"],
      betterAuthUrl: process.env.BETTER_AUTH_URL || "NOT_SET",
    }));
  }

  try {
    const auth = getAuth();
    console.log(`[AUTH] Processing ${req.method} ${req.url} (host: ${req.headers?.host})`);
    return toNodeHandler(auth)(req, res);
  } catch (error) {
    console.error(`[AUTH ERROR] Handler-level error for ${req.method} ${req.url}:`, error);
    handleRouteError(res, error);
  }
}
