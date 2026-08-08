import type { IncomingMessage, ServerResponse } from 'node:http';
import webpush from 'web-push';
import { getPool } from '../_lib/db/pool.js';
import { sendJson } from '../_lib/http/response.js';

const SLOTS = [
  { id: 'morning-brief', minute: 450 },
  { id: 'morning-start', minute: 570 },
  { id: 'midday-check', minute: 720 },
  { id: 'afternoon-reset', minute: 870 },
  { id: 'evening-push', minute: 1050 },
  { id: 'night-sprint', minute: 1200 },
  { id: 'day-close', minute: 1305 },
];

function indiaNow(): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts();
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '0';
  return { date: `${read('year')}-${read('month')}-${read('day')}`, minute: Number(read('hour')) * 60 + Number(read('minute')) };
}

function message(username: string, todayHours: number, slot: string): { title: string; body: string } {
  if (slot === 'morning-brief') return { title: 'Maamu: naya din, nayi fight', body: `${username}, pehla focused block chalu karo. Intentions se rank nahi banti.` };
  if (slot === 'day-close') return todayHours > 0
    ? { title: 'Maamu: day close check', body: `${username}, ${todayHours.toFixed(1)}h logged. Kal ke liye ek clear target set karke so.` }
    : { title: 'Maamu: scoreboard blank hai', body: `${username}, aaj 0h. 20 minutes ka honest session abhi bhi din bacha sakta hai.` };
  if (todayHours === 0) return { title: 'Maamu is watching', body: `${username}, abhi tak study time zero hai. Phone side mein rakho aur ek session start karo.` };
  if (todayHours < 2) return { title: 'Warm-up khatam hua?', body: `${username}, ${todayHours.toFixed(1)}h is a start, not a finish. Ek deep-focus block aur.` };
  return { title: 'Momentum mat todo', body: `${username}, ${todayHours.toFixed(1)}h already logged. Abhi discipline ka interest mil raha hai.` };
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    sendJson(res, 401, { error: 'Unauthorized cron request.' });
    return;
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    sendJson(res, 503, { error: 'Web Push is not configured.' });
    return;
  }

  const now = indiaNow();
  const slot = SLOTS.find(item => now.minute >= item.minute && now.minute < item.minute + 15);
  if (!slot) {
    sendJson(res, 200, { ok: true, sent: 0, reason: 'No reminder slot due.' });
    return;
  }

  webpush.setVapidDetails('mailto:support@alltracker.online', publicKey, privateKey);
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string; endpoint: string; subscription: webpush.PushSubscription; username: string; today_hours: number;
  }>(`
    select ps.id, ps.endpoint, ps.subscription, p.username, coalesce(s.today_hours, 0) as today_hours
    from push_subscriptions ps
    join profiles p on p.id = ps.user_id
    left join user_stats s on s.user_id = p.id
    where ps.disabled_at is null
  `);

  let sent = 0;
  for (const subscription of rows) {
    const lock = await pool.query(
      `insert into push_delivery_log (subscription_id, delivery_date, slot) values ($1::uuid, $2::date, $3) on conflict do nothing returning id`,
      [subscription.id, now.date, slot.id],
    );
    if (lock.rowCount !== 1) continue;

    try {
      const payload = message(subscription.username || 'Operative', Number(subscription.today_hours || 0), slot.id);
      await webpush.sendNotification(subscription.subscription, JSON.stringify({ ...payload, url: '/' }), { TTL: 60 * 60 * 3 });
      sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await pool.query('update push_subscriptions set disabled_at = now() where id = $1::uuid', [subscription.id]);
      }
      console.error('Push delivery failed', { subscriptionId: subscription.id, statusCode: error?.statusCode });
    }
  }
  sendJson(res, 200, { ok: true, sent, slot: slot.id });
}
