import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { getPool } from "../../_lib/db/pool.js";
import { headersFromNode } from "../../_lib/http/request.js";
import { handleRouteError, sendJson } from "../../_lib/http/response.js";

const ADMIN_EMAILS = ["ankit1pandey11@gmail.com"];

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
      sendJson(res, 401, { error: "Unauthorized. Admin access required." });
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const rawId = req.query?.profileId;
    const profileId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!profileId) {
      sendJson(res, 400, { error: "profileId is required" });
      return;
    }

    const pool = getPool();
    
    // Fetch Phases
    const phasesResult = await pool.query(
      `SELECT name, start_date, end_date, columns, created_at 
       FROM study_phases 
       WHERE user_id = $1 AND deleted_at IS NULL 
       ORDER BY created_at DESC`,
      [profileId]
    );

    // Fetch Last 10 Sessions
    const sessionsResult = await pool.query(
      `SELECT duration, subject, start_time, end_time, note 
       FROM study_sessions 
       WHERE user_id = $1 
       ORDER BY start_time DESC 
       LIMIT 10`,
      [profileId]
    );

    sendJson(res, 200, {
      phases: phasesResult.rows,
      sessions: sessionsResult.rows
    });
  } catch (err) {
    handleRouteError(res, err);
  }
}
