import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../_lib/http/request.js";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

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
    
    const google = createGoogleGenerativeAI({ apiKey: apiKey.trim() });

    const body = await readJsonBody<{ messages: any[] }>(req);

    if (!body || !body.messages) {
      res.writeHead(400).end(JSON.stringify({ error: "Missing messages array" }));
      return;
    }

    const systemMessage = body.messages.find((m: any) => m.role === 'system')?.content;
    const coreMessages = body.messages.filter((m: any) => m.role !== 'system');

    const result = streamText({
      model: google("gemini-1.5-pro"),
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
