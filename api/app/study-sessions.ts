import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../server/auth";
import { fetchStudySessions, logStudySession } from "../../server/data/study-repo";
import { ensureProfileForUser } from "../../server/data/profile-repo";
import { headersFromNode, readJsonBody } from "../../server/http/request";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../server/http/response";

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
