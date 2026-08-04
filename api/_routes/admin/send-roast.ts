import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../../_lib/auth/index.js";
import { getPool } from "../../_lib/db/pool.js";
import { headersFromNode, readJsonBody } from "../../_lib/http/request.js";
import { handleRouteError, sendJson } from "../../_lib/http/response.js";
import { Resend } from "resend";

const ADMIN_EMAILS = ["ankit1pandey11@gmail.com"];

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
      sendJson(res, 401, { error: "Unauthorized. Admin access required." });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = await readJsonBody<{ profile_id: string; custom_message?: string; custom_subject?: string }>(req);
    if (!body || !body.profile_id) {
      sendJson(res, 400, { error: "Missing profile_id" });
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      sendJson(res, 500, { error: "RESEND_API_KEY missing" });
      return;
    }

    const pool = getPool();
    const { profile_id, custom_message, custom_subject } = body;
    if (!profile_id) {
      sendJson(res, 400, { error: "Missing profile_id" });
      return;
    }

    // Check if user has received a reengagement email recently
    const rateLimitQuery = await pool.query(
      `SELECT id, username, current_streak, total_hours, rank, integrity_score,
       (SELECT COALESCE(SUM(duration), 0) FROM public.study_sessions WHERE user_id = p.id AND start_time >= NOW() - INTERVAL '7 days') as last_7_days_hours
       FROM public.profiles p WHERE id = $1`,
      [profile_id]
    );
    
    const user = rateLimitQuery.rows[0];
    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    // Wait, we need their actual email.
    // Let's just query it directly.
    const emailQuery = await pool.query(`SELECT email FROM public.user WHERE id = (SELECT auth_user_id FROM public.profiles WHERE id = $1)`, [profile_id]);
    const email = emailQuery.rows[0]?.email;
    if (!email) {
      sendJson(res, 404, { error: "Email not found" });
      return;
    }

    const roundedTotalHrs = Number(user.total_hours || 0).toFixed(1);
    const rounded7DayHrs = Number(user.last_7_days_hours || 0).toFixed(1);
    const rankDisplay = user.rank ? user.rank.split(' ')[0] : 'Unranked';

    const lastActiveDate = user.last_active ? new Date(user.last_active).getTime() : Date.now();
    const daysInactive = Math.floor((Date.now() - lastActiveDate) / (1000 * 60 * 60 * 24));
    let timeText = "a week";
    if (daysInactive >= 30 && daysInactive < 60) timeText = "over a month";
    else if (daysInactive >= 60) timeText = "a long time";
    else if (daysInactive > 7) timeText = `${daysInactive} days`;
    else timeText = `${Math.max(0, daysInactive)} days (even though it hasn't been a full week)`;

    let mainBodyContent = "";
    let dynamicSubject = "";

    if (custom_message && custom_message.trim().length > 0) {
      mainBodyContent = `
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 24px;">Hi ${user.username},</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">${custom_message.replace(/\n/g, '<br/>')}</p>
      `;
    } else {
      let roast = "";
      if (user.current_streak === 0) {
        roast = "Streak: 0. Ek din bhi lagatar padhai nahi ho rahi tujhse? Instagram band kar aur thoda focus kar le, varna aukaat wahi reh jayegi.";
        dynamicSubject = `Reality Check: Your streak is 0, ${user.username}. Time to focus.`;
      } else if (user.total_hours < 10) {
        roast = `Sirf ${roundedTotalHrs} hrs total? Itna time toh log bathroom me reels scroll karte hue nikal dete hain. Padhna shuru kar bhai, tera future dark lag raha hai.`;
        dynamicSubject = `Reality Check: Only ${roundedTotalHrs} hours logged? Serious ho ja, ${user.username}.`;
      } else if (user.rank && user.rank.includes('IRON')) {
        roast = "Abhi tak IRON rank pe hi atak raha tu? Tujhse zyada grind toh bgmi ke noobs karte hain. Chup chaap level up kar le.";
        dynamicSubject = `Reality Check: Still stuck in Iron Rank, ${user.username}?`;
      } else if (user.integrity_score < 50) {
        roast = `Integrity score: ${user.integrity_score}. Khud se jhoot bolna band kar bhai. We both know you're faking those study sessions. Literal clown behavior 🤡`;
        dynamicSubject = `Reality Check: Stop faking your focus time, ${user.username}.`;
      } else {
        roast = `Total ${roundedTotalHrs} hrs karke achanak ruk kyu gaya? Motivation khatam ya breakup ho gaya? Wapas aa ja beta, bohot time waste kar chuka hai tu.`;
        dynamicSubject = `Reality Check: Why did you stop tracking, ${user.username}?`;
      }

      mainBodyContent = `
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">Ae ${user.username}, idhar aa...</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
          It's been <strong>${timeText}</strong> since you last tracked a session. Padhai likhai bilkul chhod di kya?
        </p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 15px; font-weight: 500; line-height: 1.5;">${roast}</p>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 8px;">
          Aisi laziness se tera goal kabhi achieve nahi hone wala. Baad mein mat bolna Maamu ne reality check nahi diya tha. (ಠ_ಠ)
        </p>
      `;
    }

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                
                <!-- Premium Header -->
                <tr>
                  <td style="background-color: #000000; padding: 40px 0; text-align: center;">
                    <img src="https://www.alltracker.online/icon-192.png" alt="All Tracker Logo" width="64" height="64" style="display: block; margin: 0 auto 16px auto; border-radius: 12px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ALL TRACKER</h1>
                    <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Reality Check</p>
                  </td>
                </tr>
                
                <!-- Main Content Area -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    ${mainBodyContent}
                  </td>
                </tr>

                <!-- Elegantly Styled Stats Box -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
                      <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Performance Report</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
                        <tr>
                          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Current Rank</td>
                          <td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right;">${rankDisplay}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Active Streak</td>
                          <td style="padding: 10px 0; color: #d97706; font-weight: 700; text-align: right; border-top: 1px solid #e2e8f0;">${user.current_streak || 0} 🔥</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Past 7 Days</td>
                          <td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right; border-top: 1px solid #e2e8f0;">${rounded7DayHrs} hrs</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Total Focus Time</td>
                          <td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right; border-top: 1px solid #e2e8f0;">${roundedTotalHrs} hrs</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                  <td style="padding: 10px 40px 40px 40px; text-align: center;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="https://www.alltracker.online" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);">Start Focus Timer Now</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; font-style: italic;">No more excuses.</p>
                  </td>
                </tr>
                
                <!-- Premium Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; font-weight: 600;">
                      The All Tracker Accountability System
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                      You are receiving this reality check because you created an account.<br>
                      If you're giving up, you can manually delete your account in settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailSubject = (custom_message && custom_message.trim().length > 0) 
      ? (custom_subject && custom_subject.trim().length > 0 ? custom_subject : `Update from All Tracker`) 
      : dynamicSubject;

    const resend = new Resend(resendApiKey);
    const sendResult = await resend.emails.send({
      from: 'Maamu @ All Tracker <maamu@alltracker.online>',
      to: [email],
      subject: emailSubject,
      html: emailContent,
    });

    if (sendResult.error) {
      console.error("Failed to send targeted email", sendResult.error);
      sendJson(res, 500, { error: "Failed to send email" });
      return;
    }

    // Mark as sent
    await pool.query(`
      UPDATE public.profiles
      SET last_reengagement_sent_at = NOW()
      WHERE id = $1::uuid
    `, [body.profile_id]);

    sendJson(res, 200, { success: true, message: "Roast delivered successfully." });
  } catch (err) {
    handleRouteError(res, err);
  }
}
