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
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(m.id) as total_messages,
        MAX(m.created_at) as last_used
      FROM public.profiles p
      JOIN public.user u ON p.auth_user_id = u.id
      LEFT JOIN public.maamu_conversations c ON c.user_id = p.id
      LEFT JOIN public.maamu_messages m ON m.conversation_id = c.id AND m.role = 'user'
      GROUP BY p.id, p.username, u.email
      HAVING COUNT(m.id) > 0
      ORDER BY total_messages DESC;
    `;
    
    const result = await pool.query(query);
    
    sendJson(res, 200, { usage: result.rows });
  } catch (err) {
    handleRouteError(res, err);
  }
}
