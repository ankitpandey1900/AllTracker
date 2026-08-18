import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { headersFromNode } from "../../_lib/http/request.js";
import { sendJson } from "../../_lib/http/response.js";
import { getPool } from "../../_lib/db/pool.js";
import { Resend } from "resend";
import { generateRoast } from "../../_lib/roast-generator.js";

const ADMIN_EMAILS = ["ankit1pandey11@gmail.com"];

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // 1. Verify Admin Session
  const session = await getAuth().api.getSession({
    headers: headersFromNode(req.headers),
  });

  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    return sendJson(res, 401, { error: "Unauthorized. Admin access required." });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // 2. Initialize Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return sendJson(res, 500, { error: "Email provider configuration missing." });
  }
  
  const resend = new Resend(resendApiKey);
  const pool = getPool();
  
  try {
    // 3. Query for strict inactivity (haven't actually logged a study session in 7 days)
    const query = `
      SELECT p.id as profile_id, p.username, u.email, 
             COALESCE(up.last_active, p.created_at) as last_active,
             (SELECT COALESCE(SUM(duration), 0) FROM public.study_sessions WHERE user_id = p.id AND start_time >= NOW() - INTERVAL '0 days') as last_7_days_hours,
             s.rank, s.total_hours, s.current_streak, s.integrity_score
      FROM public.profiles p
      JOIN public.user u ON p.auth_user_id = u.id
      LEFT JOIN public.user_stats s ON s.user_id = p.id
      LEFT JOIN public.user_presence up ON up.user_id = p.id
      WHERE COALESCE(up.last_active, p.created_at) < NOW() - INTERVAL '0 days'
      AND s.last_reengagement_sent_at IS NULL
      LIMIT 100;
    `;
    
    const { rows: inactiveUsers } = await pool.query(query);

    if (inactiveUsers.length === 0) {
      return sendJson(res, 200, { notifiedCount: 0, message: "No inactive users to re-engage today." });
    }

    // 4. Send emails using Batch API
    const batchEmails = inactiveUsers.map((user) => {
      const lastActiveDate = user.last_active ? new Date(user.last_active).getTime() : Date.now();
      const daysInactive = Math.floor((Date.now() - lastActiveDate) / (1000 * 60 * 60 * 24));
      
      let timeText = "a week";
      if (daysInactive >= 30 && daysInactive < 60) timeText = "over a month";
      else if (daysInactive >= 60) timeText = "a long time";
      else if (daysInactive > 7) timeText = `${daysInactive} days`;
      else timeText = `${Math.max(0, daysInactive)} days`;

      const { roastBody, dynamicSubject } = generateRoast({
        current_streak: user.current_streak || 0,
        total_hours: user.total_hours || 0,
        last_7_days_hours: user.last_7_days_hours || 0,
        rank: user.rank || '',
        integrity_score: user.integrity_score || 0,
        days_inactive: daysInactive
      });

      let mainBodyContent = `
        <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.5px;">Ae ${user.username}, idhar aa...</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
          It's been <strong>${timeText}</strong> since you last tracked a session. Padhai likhai bilkul chhod di kya?
        </p>
        <div style="background-color: #fafafa; border-left: 3px solid #000000; padding: 18px 24px; margin: 32px 0;">
          <p style="margin: 0; color: #111827; font-size: 16px; font-style: italic; line-height: 1.6;">"${roastBody}"</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 32px;">
          Aisi laziness se tera goal kabhi achieve nahi hone wala. Baad mein mat bolna Maamu ne reality check nahi diya tha. (ಠ_ಠ)
        </p>
      `;

      const emailContent = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px;">
                <tr><td style="padding-bottom: 20px;">${mainBodyContent}</td></tr>
                <tr><td style="padding-bottom: 40px;">
                  <a href="https://www.alltracker.online" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 15px;">Start Focus Timer</a>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      return {
        from: process.env.RESEND_FROM_EMAIL || 'All Tracker <onboarding@resend.dev>',
        to: [user.email],
        subject: dynamicSubject,
        html: emailContent,
      };
    });

    const result = await resend.batch.send(batchEmails);
    
    // Check for successes to update DB
    const successProfileIds: string[] = [];
    if (result.data) {
      successProfileIds.push(...inactiveUsers.map(u => u.profile_id));
    }

    // 5. Update DB to mark emails as sent
    if (successProfileIds.length > 0) {
      const updateQuery = `
        UPDATE public.user_stats
        SET last_reengagement_sent_at = NOW()
        WHERE user_id = ANY($1::uuid[]);
      `;
      await pool.query(updateQuery, [successProfileIds]);
    }

    return sendJson(res, 200, { notifiedCount: successProfileIds.length });

  } catch (error) {
    console.error("Error in admin nuke:", error);
    return sendJson(res, 500, { error: "Internal Server Error during nuke." });
  }
}
