import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth/index.js";
import { broadcastProfileStats } from "../_lib/data/profile-repo.js";
import { ensureProfileForUser } from "../_lib/data/profile-repo.js";
import { headersFromNode, readJsonBody } from "../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response.js";

// 🔒 SECURITY: Simple in-memory rate limiter for broadcast endpoint
// Prevents a single user from flooding the leaderboard update API
const broadcastRateMap = new Map<string, number>();
const BROADCAST_MIN_INTERVAL_MS = 30_000; // 30 seconds minimum between broadcasts

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    // 🔒 Rate limit check
    const userId = session.user.id;
    const lastBroadcast = broadcastRateMap.get(userId) || 0;
    if (Date.now() - lastBroadcast < BROADCAST_MIN_INTERVAL_MS) {
      sendJson(res, 429, { error: "Too many requests. Please wait before broadcasting again." });
      return;
    }
    broadcastRateMap.set(userId, Date.now());

    const profile = await ensureProfileForUser(session.user);
    const body = await readJsonBody<Record<string, unknown>>(req);
    await broadcastProfileStats(profile, body || {});
    sendJson(res, 200, { ok: true });
  } catch (error) {
    handleRouteError(res, error);
  }
}
