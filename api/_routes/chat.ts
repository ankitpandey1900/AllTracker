import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../_lib/http/request.js";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAuth } from "../_lib/auth/index.js";
import { headersFromNode } from "../_lib/http/request.js";
import { getPool } from "../_lib/db/pool.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.writeHead(500).end(JSON.stringify({ error: "Server Configuration Error: GEMINI_API_KEY is missing." }));
      return;
    }

    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user) {
      res.writeHead(401).end(JSON.stringify({ error: "Unauthorized. Please log in." }));
      return;
    }

    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT count(*) as count 
      FROM maamu_messages m
      JOIN maamu_conversations c ON c.id = m.conversation_id
      WHERE c.user_id = (SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1)
        AND m.role = 'user' 
        AND m.created_at >= CURRENT_DATE
    `, [session.user.id]);

    const dailyUsage = parseInt(rows[0]?.count || '0', 10);
    if (dailyUsage >= 3) {
      res.writeHead(429).end(JSON.stringify({ error: "Daily Maamu limit reached. Come back tomorrow!" }));
      return;
    }
    
    const google = createGoogleGenerativeAI({ apiKey: apiKey.trim() });

    const body = await readJsonBody<{ messages: any[] }>(req);

    if (!body || !body.messages) {
      res.writeHead(400).end(JSON.stringify({ error: "Missing messages array" }));
      return;
    }

    const systemMessage = body.messages.find((m: any) => m.role === 'system')?.content;
    const coreMessages = body.messages.filter((m: any) => m.role !== 'system');
    const requestedModel = (body as any).model || "gemini-3.5-flash";

    const result = streamText({
      model: google(requestedModel),
      system: systemMessage,
      messages: coreMessages,
      temperature: 0.7
    });
    
    // In Node.js ServerResponse, we must handle errors gracefully
    result.pipeTextStreamToResponse(res).catch((err: any) => {
      console.error('Pipe Error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.end();
      }
    });
    
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    if (!res.headersSent) {
      res.writeHead(500).end(JSON.stringify({ error: "Internal Server Error" }));
    } else {
      res.end();
    }
  }
}
