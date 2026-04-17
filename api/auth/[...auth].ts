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
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("AllTracker Auth Handler: LIVE");
  }

  try {
    const auth = getAuth();
    console.log(`[AUTH] Processing ${req.method} ${req.url}`);
    return toNodeHandler(auth)(req, res);
  } catch (error) {
    console.error(`[AUTH ERROR] ${error}`);
    handleRouteError(res, error);
  }
}
