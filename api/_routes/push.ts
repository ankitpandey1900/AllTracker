import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAuth } from '../_lib/auth/index.js';
import { ensureProfileForUser } from '../_lib/data/profile-repo.js';
import { getPool } from '../_lib/db/pool.js';
import { headersFromNode, readJsonBody } from '../_lib/http/request.js';
import { handleRouteError, sendJson, sendMethodNotAllowed } from '../_lib/http/response.js';

type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function isSubscription(value: PushSubscriptionPayload | null): value is Required<PushSubscriptionPayload> {
  return Boolean(value && typeof value.endpoint === 'string' && typeof value.keys?.p256dh === 'string' && typeof value.keys?.auth === 'string');
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      sendMethodNotAllowed(res, ['POST', 'DELETE']);
      return;
    }

    const session = await getAuth().api.getSession({ headers: headersFromNode(req.headers) });
    if (!session?.user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const body = await readJsonBody<PushSubscriptionPayload>(req);
    if (!body || typeof body.endpoint !== 'string') {
      sendJson(res, 400, { error: 'A push subscription endpoint is required.' });
      return;
    }

    const profile = await ensureProfileForUser(session.user);
    const pool = getPool();

    if (req.method === 'DELETE') {
      await pool.query('delete from push_subscriptions where user_id = $1 and endpoint = $2', [profile.profileId, body.endpoint]);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (!isSubscription(body)) {
      sendJson(res, 400, { error: 'Invalid push subscription.' });
      return;
    }

    await pool.query(
      `
        insert into push_subscriptions (user_id, endpoint, subscription, updated_at)
        values ($1::uuid, $2, $3::jsonb, now())
        on conflict (endpoint) do update set
          user_id = excluded.user_id,
          subscription = excluded.subscription,
          updated_at = now(),
          disabled_at = null
      `,
      [profile.profileId, body.endpoint, JSON.stringify(body)],
    );
    sendJson(res, 200, { ok: true });
  } catch (error) {
    handleRouteError(res, error);
  }
}
