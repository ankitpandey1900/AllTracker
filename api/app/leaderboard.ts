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

    const leaderboard = await fetchLeaderboard();
    sendJson(res, 200, leaderboard);
  } catch (error) {
    handleRouteError(res, error);
  }
}
