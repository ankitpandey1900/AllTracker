import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth/index.js";
import { ensureProfileForUser } from "../_lib/data/profile-repo.js";
import { headersFromNode, readJsonBody } from "../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response.js";
import { getPool } from "../_lib/db/pool.js";

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
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
    const pool = getPool();

    // GET /api/app/maamu — list all conversations with messages
    if (req.method === "GET") {
      const { rows: convRows } = await pool.query(
        `
          select id, title, created_at, updated_at
          from maamu_conversations
          where user_id = $1
          order by updated_at desc
          limit 50
        `,
        [profile.profileId],
      );

      const conversations = await Promise.all(
        convRows.map(async (conv: any) => {
          const { rows: msgRows } = await pool.query(
            `
              select id, role, content, created_at
              from maamu_messages
              where conversation_id = $1
              order by created_at asc
            `,
            [conv.id],
          );
          return {
            id: conv.id,
            title: conv.title,
            createdAt: new Date(conv.created_at).getTime(),
            lastActive: new Date(conv.updated_at).getTime(),
            messages: msgRows.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at).getTime(),
            })),
          };
        }),
      );

      sendJson(res, 200, conversations);
      return;
    }

    // POST /api/app/maamu — create/update conversation or add message
    if (req.method === "POST") {
      const body = await readJsonBody<{
        action: "create_session" | "add_message" | "delete_session" | "rename_session";
        conversationId?: string;
        title?: string;
        role?: string;
        content?: string;
      }>(req);

      if (!body?.action) {
        sendJson(res, 400, { error: "action is required" });
        return;
      }

      if (body.action === "create_session") {
        const title = body.title || "New Chat";
        const { rows } = await pool.query(
          `
            insert into maamu_conversations (user_id, title, created_at, updated_at)
            values ($1::uuid, $2, now(), now())
            returning id, title, created_at, updated_at
          `,
          [profile.profileId, title],
        );
        sendJson(res, 200, {
          id: rows[0].id,
          title: rows[0].title,
          createdAt: new Date(rows[0].created_at).getTime(),
          lastActive: new Date(rows[0].updated_at).getTime(),
          messages: [],
        });
        return;
      }

      if (body.action === "add_message") {
        if (!body.conversationId || !body.role || !body.content) {
          sendJson(res, 400, { error: "conversationId, role, content required" });
          return;
        }
        // Verify ownership
        const { rowCount } = await pool.query(
          "select 1 from maamu_conversations where id = $1 and user_id = $2 limit 1",
          [body.conversationId, profile.profileId],
        );
        if (!rowCount) {
          sendJson(res, 403, { error: "Conversation not found" });
          return;
        }
        const { rows } = await pool.query(
          `
            insert into maamu_messages (conversation_id, role, content, created_at)
            values ($1::uuid, $2, $3, now())
            returning id, role, content, created_at
          `,
          [body.conversationId, body.role, body.content],
        );
        // Touch updated_at on the conversation
        await pool.query(
          "update maamu_conversations set updated_at = now() where id = $1",
          [body.conversationId],
        );
        sendJson(res, 200, {
          id: rows[0].id,
          role: rows[0].role,
          content: rows[0].content,
          timestamp: new Date(rows[0].created_at).getTime(),
        });
        return;
      }

      if (body.action === "rename_session") {
        if (!body.conversationId || !body.title) {
          sendJson(res, 400, { error: "conversationId and title required" });
          return;
        }
        await pool.query(
          "update maamu_conversations set title = $2, updated_at = now() where id = $1 and user_id = $3",
          [body.conversationId, body.title, profile.profileId],
        );
        sendJson(res, 200, { ok: true });
        return;
      }

      if (body.action === "delete_session") {
        if (!body.conversationId) {
          sendJson(res, 400, { error: "conversationId required" });
          return;
        }
        // Messages cascade-delete via FK
        await pool.query(
          "delete from maamu_conversations where id = $1 and user_id = $2",
          [body.conversationId, profile.profileId],
        );
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 400, { error: "Unknown action" });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    handleRouteError(res, error);
  }
}
