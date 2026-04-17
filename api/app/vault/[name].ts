import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../../server/auth";
import { readVault, writeVault } from "../../../server/data/vault-repo";
import { ensureProfileForUser } from "../../../server/data/profile-repo";
import { headersFromNode, readJsonBody } from "../../../server/http/request";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../../server/http/response";

const allowedVaults = new Set([
  "tracker",
  "settings",
  "routines",
  "history",
  "bookmarks",
  "tasks",
  "timer",
]);

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
): Promise<void> {
  try {
    const rawName = req.query?.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;

    if (!name || !allowedVaults.has(name)) {
      sendJson(res, 404, { error: "Unknown vault" });
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

    if (req.method === "GET") {
      const payload = await readVault(profile, name as any);
      sendJson(res, 200, payload);
      return;
    }

    if (req.method !== "PUT") {
      sendMethodNotAllowed(res, ["GET", "PUT"]);
      return;
    }

    const body = await readJsonBody<{ data: unknown }>(req);
    const result = await writeVault(profile, name as any, body?.data);
    sendJson(res, 200, result);
  } catch (error) {
    handleRouteError(res, error);
  }
}
