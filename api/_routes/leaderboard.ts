import type { IncomingMessage, ServerResponse } from "node:http";
import { fetchLeaderboard } from "../_lib/data/discovery-repo.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const timeframe = url.searchParams.get('timeframe') || 'weekly';

    const leaderboard = await fetchLeaderboard(timeframe);
    sendJson(res, 200, leaderboard);
  } catch (error) {
    handleRouteError(res, error);
  }
}
