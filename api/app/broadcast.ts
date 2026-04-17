import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../server/auth";
import { broadcastProfileStats } from "../../server/data/profile-repo";
import { ensureProfileForUser } from "../../server/data/profile-repo";
import { headersFromNode, readJsonBody } from "../../server/http/request";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../server/http/response";

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

    const profile = await ensureProfileForUser(session.user);
    const body = await readJsonBody<Record<string, unknown>>(req);
    await broadcastProfileStats(profile, body || {});
    sendJson(res, 200, { ok: true });
  } catch (error) {
    handleRouteError(res, error);
  }
}
