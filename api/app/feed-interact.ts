import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth/index.js";
import { ensureProfileForUser } from "../_lib/data/profile-repo.js";
import { toggleInteraction } from "../_lib/data/feed-repo.js";
import { headersFromNode, readJsonBody } from "../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response.js";

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
      sendJson(res, 401, { error: "Unauthorized. You must be an operative to interact." });
      return;
    }

    const profile = await ensureProfileForUser(session.user);
    const body = await readJsonBody<{ post_id: string; interaction_type: 'LIKE' | 'REPOST' }>(req);

    if (!body?.post_id || !body?.interaction_type) {
      sendJson(res, 400, { error: "post_id and interaction_type are required." });
      return;
    }

    if (body.interaction_type !== 'LIKE' && body.interaction_type !== 'REPOST') {
      sendJson(res, 400, { error: "Invalid interaction type. Must be LIKE or REPOST." });
      return;
    }

    const result = await toggleInteraction(profile.profileId, body.post_id, body.interaction_type);
    sendJson(res, 200, result);
  } catch (error) {
    handleRouteError(res, error);
  }
}
