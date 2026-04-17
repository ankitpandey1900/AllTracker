import type { IncomingMessage, ServerResponse } from "node:http";
import { fetchLeaderboard } from "../../server/data/discovery-repo";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../server/http/response";

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
