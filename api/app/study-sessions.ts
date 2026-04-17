import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth/index.js";
import { fetchStudySessions, logStudySession } from "../_lib/data/study-repo.js";
import { ensureProfileForUser } from "../_lib/data/profile-repo.js";
import { headersFromNode, readJsonBody } from "../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const profile = await ensureProfileForUser(session.user);

    if (req.method === "GET") {
      const rows = await fetchStudySessions(profile);
      sendJson(res, 200, rows);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["GET", "POST"]);
      return;
    }

    const body = await readJsonBody<{
      duration: number;
      subject: string;
      startAt?: string;
      endAt?: string;
      note?: string;
    }>(req);

    if (!body?.subject) {
      sendJson(res, 400, { error: "subject is required" });
      return;
    }

    await logStudySession(profile, body);
    sendJson(res, 201, { ok: true });
  } catch (error) {
    handleRouteError(res, error);
  }
}
