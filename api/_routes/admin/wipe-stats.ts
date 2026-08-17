import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { headersFromNode, readJsonBody } from "../../_lib/http/request.js";
import { sendJson } from "../../_lib/http/response.js";
import { getPool } from "../../_lib/db/pool.js";

const ADMIN_EMAILS = ["ankit1pandey11@gmail.com"];

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const session = await getAuth().api.getSession({
    headers: headersFromNode(req.headers),
  });

  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    return sendJson(res, 401, { error: "Unauthorized. Admin access required." });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const body = await readJsonBody<{ profile_id: string }>(req);
  if (!body || !body.profile_id) {
    return sendJson(res, 400, { error: "Missing profile_id" });
  }

  const pool = getPool();
  
  try {
    // Start a transaction
    await pool.query("BEGIN");

    // 1. Delete all study sessions for this user
    await pool.query(`DELETE FROM public.study_sessions WHERE user_id = $1::uuid`, [body.profile_id]);

    // 2. Wipe their stats in user_stats
    await pool.query(`
      UPDATE public.user_stats 
      SET total_hours = 0, 
          current_streak = 0, 
          longest_streak = 0,
          rank = 'Bronze I',
          integrity_score = 100
      WHERE user_id = $1::uuid
    `, [body.profile_id]);

    await pool.query("COMMIT");

    return sendJson(res, 200, { message: "Stats wiped successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error wiping stats:", error);
    return sendJson(res, 500, { error: "Internal Server Error while wiping stats." });
  }
}
