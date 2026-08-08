import type { IncomingMessage, ServerResponse } from 'node:http';
import webpush from 'web-push';
import { getAuth } from '../../_lib/auth/index.js';
import { getPool } from '../../_lib/db/pool.js';
import { headersFromNode, readJsonBody } from '../../_lib/http/request.js';
import { handleRouteError, sendJson, sendMethodNotAllowed } from '../../_lib/http/response.js';

const ADMIN_EMAILS = ['ankit1pandey11@gmail.com'];

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      sendMethodNotAllowed(res, ['POST']);
      return;
    }
    const session = await getAuth().api.getSession({ headers: headersFromNode(req.headers) });
    if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
      sendJson(res, 401, { error: 'Unauthorized. Admin access required.' });
      return;
    }
    const body = await readJsonBody<{ profile_id?: string; title?: string; message?: string }>(req);
    if (!body?.profile_id || !body.message?.trim()) {
      sendJson(res, 400, { error: 'profile_id and message are required.' });
      return;
    }
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      sendJson(res, 503, { error: 'Web Push is not configured.' });
      return;
    }

    try {
      webpush.setVapidDetails('mailto:support@alltracker.online', publicKey, privateKey);
    } catch {
      sendJson(res, 503, { error: 'Web Push keys are invalid. Set the matching VAPID public and private keys in Vercel, then redeploy.' });
      return;
    }
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; subscription: webpush.PushSubscription }>(
      'select id, subscription from push_subscriptions where user_id = $1::uuid and disabled_at is null',
      [body.profile_id],
    );
    let sent = 0;
    let failedStatus: number | undefined;
    for (const row of rows) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({
          title: body.title?.trim() || 'Maamu: reality check',
          body: body.message.trim(),
          url: '/',
        }));
        sent += 1;
      } catch (error: any) {
        failedStatus = error?.statusCode;
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await pool.query('update push_subscriptions set disabled_at = now() where id = $1::uuid', [row.id]);
        }
      }
    }
    if (rows.length > 0 && sent === 0 && failedStatus) {
      sendJson(res, 502, {
        error: `Push provider rejected this subscription (${failedStatus}). Ask the user to enable notifications again; if it continues, verify the deployed VAPID key pair matches the public key used by the browser.`,
      });
      return;
    }
    sendJson(res, 200, { success: true, sent, subscribedDevices: rows.length });
  } catch (error) {
    handleRouteError(res, error);
  }
}
