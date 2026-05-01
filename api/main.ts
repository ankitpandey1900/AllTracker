import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRouteError, sendJson } from "./_lib/http/response.js";

// Import all handlers
import bootstrap from "./_routes/bootstrap.js";
import broadcast from "./_routes/broadcast.js";
import config from "./_routes/config.js";
import feed from "./_routes/feed.js";
import leaderboard from "./_routes/leaderboard.js";
import maamu from "./_routes/maamu.js";
import profileAvailability from "./_routes/profile-availability.js";
import profile from "./_routes/profile.js";
import studySessions from "./_routes/study-sessions.js";
import telemetry from "./_routes/telemetry.js";
import vaultName from "./_routes/vault/[name].js";
import vaultSync from "./_routes/vault/sync.js";

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const path = url.pathname.replace("/api/app", "");
    
    // Route matching logic
    if (path === "/bootstrap") return bootstrap(req, res);
    if (path === "/broadcast") return broadcast(req, res);
    if (path === "/config") return config(req, res);
    if (path === "/feed") return feed(req, res);
    if (path === "/leaderboard") return leaderboard(req, res);
    if (path === "/maamu") return maamu(req, res);
    if (path === "/profile-availability") return profileAvailability(req, res);
    if (path === "/profile") return profile(req, res);
    if (path === "/study-sessions") return studySessions(req, res);
    if (path === "/telemetry") return telemetry(req, res);
    if (path === "/vault/sync") return vaultSync(req, res);
    
    // Dynamic vault path: /api/app/vault/:name
    if (path.startsWith("/vault/")) {
      const name = path.replace("/vault/", "");
      if (name) {
        req.query = { ...req.query, name };
        return vaultName(req, res);
      }
    }

    sendJson(res, 404, { error: `Route not found: ${path}` });
  } catch (error) {
    handleRouteError(res, error);
  }
}
