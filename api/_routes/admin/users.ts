import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { getPool } from "../../_lib/db/pool.js";
import { headersFromNode } from "../../_lib/http/request.js";
import { handleRouteError, sendJson } from "../../_lib/http/response.js";

const ADMIN_EMAILS = ["ankit1pandey11@gmail.com"];

export default async function handler(
  req: IncomingMessage,
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

    const pool = getPool();
    const query = `
      SELECT 
        p.id as profile_id, 
        p.username, 
        u.email, 
        COALESCE(up.last_active, p.created_at) as last_active,
        (SELECT COALESCE(SUM(duration), 0) FROM public.study_sessions WHERE user_id = p.id AND start_time >= NOW() - INTERVAL '7 days') as last_7_days_hours,
        (SELECT COALESCE(SUM(duration), 0) FROM public.study_sessions WHERE user_id = p.id AND start_time >= CURRENT_DATE) as today_hours,
        p.created_at,
        s.rank, 
        s.total_hours, 
        s.current_streak, 
        s.integrity_score,
        s.last_reengagement_sent_at,
        COALESCE(up.is_focusing, false) as is_focusing,
        up.focus_subject,
        (SELECT COUNT(*) FROM public.push_subscriptions ps WHERE ps.user_id = u.id AND ps.disabled_at IS NULL) as push_devices
      FROM public.profiles p
      JOIN public.user u ON p.auth_user_id = u.id
      LEFT JOIN public.user_stats s ON s.user_id = p.id
      LEFT JOIN public.user_presence up ON up.user_id = p.id
      ORDER BY last_active DESC;
    `;
    
    const result = await pool.query(query);
    
    sendJson(res, 200, { users: result.rows });
  } catch (err) {
    handleRouteError(res, err);
  }
}
