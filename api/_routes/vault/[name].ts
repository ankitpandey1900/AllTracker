import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { readVault, writeVault, deleteTask, upsertTask, deletePhase, upsertPhase } from "../../_lib/data/vault-repo.js";
import { ensureProfileForUser } from "../../_lib/data/profile-repo.js";
import { headersFromNode, readJsonBody } from "../../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../_lib/http/response.js";

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

    const isPhaseRoute = name === "phases";
    if (!name || (!allowedVaults.has(name) && !isPhaseRoute)) {
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

    if (isPhaseRoute && req.method === "POST") {
      const body = await readJsonBody<{ phase?: unknown }>(req);
      if (!body?.phase || typeof body.phase !== "object") {
        sendJson(res, 400, { error: "phase is required" });
        return;
      }
      await upsertPhase(profile, body.phase as Record<string, unknown>);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (isPhaseRoute && req.method === "DELETE") {
      const body = await readJsonBody<{ id?: string }>(req);
      if (!body?.id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }
      await deletePhase(profile, body.id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (isPhaseRoute) {
      sendMethodNotAllowed(res, ["POST", "DELETE"]);
      return;
    }

    if (req.method === "GET") {
      const payload = await readVault(profile, name as any);
      sendJson(res, 200, payload);
      return;
    }

    if (name === "tasks" && req.method === "POST") {
      const body = await readJsonBody<{ task?: unknown }>(req);
      if (!body?.task || typeof body.task !== "object") {
        sendJson(res, 400, { error: "task is required" });
        return;
      }
      await upsertTask(profile, body.task as Record<string, unknown>);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (name === "tasks" && req.method === "DELETE") {
      const body = await readJsonBody<{ id?: string }>(req);
      if (!body?.id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }
      await deleteTask(profile, body.id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method !== "PUT") {
      sendMethodNotAllowed(res, name === "tasks" ? ["GET", "POST", "PUT", "DELETE"] : ["GET", "PUT"]);
      return;
    }

    const body = await readJsonBody<{ data: unknown }>(req);
    const result = await writeVault(profile, name as any, body?.data);
    sendJson(res, 200, result);
  } catch (error) {
    handleRouteError(res, error);
  }
}
