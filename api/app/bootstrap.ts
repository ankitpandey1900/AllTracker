import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth";
import { readVault } from "../_lib/data/vault-repo";
import { ensureProfileForUser } from "../_lib/data/profile-repo";
import { headersFromNode } from "../_lib/http/request";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response";

export default async function handler(
  req: IncomingMessage,
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
    const [settings, tracker] = await Promise.all([
      readVault(profile, "settings"),
      readVault(profile, "tracker"),
    ]);

    sendJson(res, 200, {
      session,
      profile,
      settings: settings.data,
      tracker: tracker.data,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
}
