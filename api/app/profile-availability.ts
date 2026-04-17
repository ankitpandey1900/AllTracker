import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../server/auth";
import { ensureProfileForUser, isUsernameTaken } from "../../server/data/profile-repo";
import { headersFromNode } from "../../server/http/request";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../server/http/response";

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const profile = await ensureProfileForUser(session.user);
    const rawUsername = req.query?.username;
    const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;

    if (!username?.trim()) {
      sendJson(res, 400, { error: "username query is required" });
      return;
    }

    const taken = await isUsernameTaken(username.trim(), profile.authUserId);
    sendJson(res, 200, { taken });
  } catch (error) {
    handleRouteError(res, error);
  }
}
