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

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: body.messages,
      temperature: 0.7
    });

    result.pipeTextStreamToResponse(res);
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    if (!res.headersSent) {
      res.writeHead(500).end(JSON.stringify({ error: "Internal Server Error" }));
    } else {
      res.end();
    }
  }
}
