import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { headersFromNode, readJsonBody } from "../../_lib/http/request.js";
import { sendJson } from "../../_lib/http/response.js";
import { getPool } from "../../_lib/db/pool.js";
import webpush from "web-push";

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

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, RESEND_FROM_EMAIL } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return sendJson(res, 500, { error: "VAPID keys not configured" });
  }

  const defaultEmail = RESEND_FROM_EMAIL || "mailto:admin@alltracker.online";
  const mailtoUrl = defaultEmail.startsWith('mailto:') ? defaultEmail : `mailto:${defaultEmail}`;
  
  webpush.setVapidDetails(mailtoUrl, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const body = await readJsonBody<{ title: string; message: string }>(req);
  if (!body || !body.title || !body.message) {
    return sendJson(res, 400, { error: "Missing title or message" });
  }

  const pool = getPool();
  
  try {
    const { rows: subscriptions } = await pool.query(
      `SELECT id, subscription FROM push_subscriptions`
    );

    if (subscriptions.length === 0) {
      return sendJson(res, 200, { sent: 0, message: "No active push subscriptions found." });
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.message,
      icon: "/icon-192.png",
      url: "/",
    });

    let sentCount = 0;
    const staleIds: string[] = [];

    const sendPromises = subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleIds.push(row.id);
        } else {
          console.error("Push broadcast error for subscription:", err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    if (staleIds.length > 0) {
      await pool.query(
        `DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])`,
        [staleIds]
      );
    }

    return sendJson(res, 200, { sent: sentCount, staleRemoved: staleIds.length });

  } catch (error) {
    console.error("Error in broadcast-push:", error);
    return sendJson(res, 500, { error: "Internal Server Error" });
  }
}
