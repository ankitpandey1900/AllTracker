import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { readVault, VaultName } from "../../_lib/data/vault-repo.js";
import { ensureProfileForUser } from "../../_lib/data/profile-repo.js";
import { headersFromNode } from "../../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../_lib/http/response.js";

const vaults: VaultName[] = [
  "tracker",
  "settings",
  "routines",
  "history",
  "bookmarks",
  "tasks",
  "timer",
];

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

    // Fetch all vaults in parallel
    const results = await Promise.all(
      vaults.map(async (name) => {
        const result = await readVault(profile, name);
        return { name, ...result };
      })
    );

    // Map to a cleaner object structure
    const snapshot: Record<string, any> = {};
    results.forEach((r) => {
      snapshot[r.name] = { data: r.data, updatedAt: r.updatedAt };
    });

    sendJson(res, 200, snapshot);
  } catch (error) {
    handleRouteError(res, error);
  }
}
