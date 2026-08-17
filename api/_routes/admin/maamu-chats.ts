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

    const url = new URL(req.url || "/", "http://localhost");
    const profileId = url.searchParams.get("profileId");

    if (!profileId) {
      sendJson(res, 400, { error: "Missing profileId" });
      return;
    }

    const pool = getPool();
    const query = `
      SELECT 
        c.id as conversation_id,
        c.title,
        m.role,
        m.content,
        m.created_at
      FROM public.maamu_conversations c
      JOIN public.maamu_messages m ON m.conversation_id = c.id
      WHERE c.user_id = $1::uuid
      ORDER BY c.updated_at DESC, m.created_at ASC;
    `;
    
    const result = await pool.query(query, [profileId]);
    
    // Group by conversation
    const conversationsMap = new Map();
    for (const row of result.rows) {
      if (!conversationsMap.has(row.conversation_id)) {
        conversationsMap.set(row.conversation_id, {
          id: row.conversation_id,
          title: row.title,
          messages: []
        });
      }
      conversationsMap.get(row.conversation_id).messages.push({
        role: row.role,
        content: row.content,
        created_at: row.created_at
      });
    }

    sendJson(res, 200, { conversations: Array.from(conversationsMap.values()) });
  } catch (err) {
    handleRouteError(res, err);
  }
}
