import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../_lib/http/request.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    // Forward the authorization header and body
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401).end(JSON.stringify({ error: "Missing authorization header" }));
      return;
    }

    const bodyChunks: Buffer[] = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    }
    let rawBody = Buffer.concat(bodyChunks);
    
    try {
      const parsed = JSON.parse(rawBody.toString('utf8'));
      if (parsed.encodedPayload) {
        rawBody = Buffer.from(parsed.encodedPayload, 'base64');
      }
    } catch (e) {
      // Not JSON or no encodedPayload, proceed as raw
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: rawBody
    });

    res.writeHead(groqRes.status, {
      "Content-Type": groqRes.headers.get("Content-Type") || "application/json",
      "Transfer-Encoding": "chunked"
    });

    if (groqRes.body) {
      const reader = groqRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (error: any) {
    console.error("Groq Relay Error:", error);
    if (!res.headersSent) {
      res.writeHead(500).end(JSON.stringify({ error: "Internal Server Error" }));
    } else {
      res.end();
    }
  }
}
