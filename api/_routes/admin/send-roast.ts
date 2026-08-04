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

    const body = await readJsonBody<{ profile_id: string; custom_message?: string }>(req);
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
    const { profile_id, custom_message } = body;
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

    if (custom_message && custom_message.trim().length > 0) {
      mainBodyContent = `
        <p style="font-size: 18px; font-weight: bold; margin-top: 0;">Hi ${user.username},</p>
        <p>${custom_message.replace(/\n/g, '<br/>')}</p>
      `;
    } else {
      let roast = "";
      if (user.current_streak === 0) {
        roast = "Streak: 0. Ek din bhi lagatar padhai nahi ho rahi tujhse? Instagram band kar aur thoda focus kar le, varna aukaat wahi reh jayegi.";
      } else if (user.total_hours < 10) {
        roast = `Sirf ${roundedTotalHrs} hrs total? Itna time toh log bathroom me reels scroll karte hue nikal dete hain. Padhna shuru kar bhai, tera future dark lag raha hai.`;
      } else if (user.rank && user.rank.includes('IRON')) {
        roast = "Abhi tak IRON rank pe hi atak raha hai tu? Tujhse zyada grind toh bgmi ke noobs karte hain. Chup chaap level up kar le.";
      } else if (user.integrity_score < 50) {
        roast = `Integrity score: ${user.integrity_score}. Khud se jhoot bolna band kar bhai. We both know you're faking those study sessions. Literal clown behavior 🤡`;
      } else {
        roast = `Total ${roundedTotalHrs} hrs karke achanak ruk kyu gaya? Motivation khatam ya breakup ho gaya? Wapas aa ja beta, bohot time waste kar chuka hai tu.`;
      }

      mainBodyContent = `
        <p style="font-size: 18px; font-weight: bold; margin-top: 0;">Ae ${user.username}, idhar aa...</p>
        
        <p>It's been <strong>${timeText}</strong> since you last tracked a session. Padhai likhai bilkul chhod di kya?</p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #991b1b; font-weight: 500;">${roast}</p>
        </div>

        <p>Aisi laziness se tera goal kabhi achieve nahi hone wala. Baad mein mat bolna Maamu ne reality check nahi diya tha. (ಠ_ಠ)</p>
      `;
    }

    const emailContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header with Logo -->
          <div style="background-color: #09090b; padding: 30px 20px; text-align: center; border-bottom: 3px solid #ef4444;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">ALL TRACKER</h1>
            <p style="color: #a1a1aa; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Reality Check</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 30px; color: #111111; line-height: 1.6; font-size: 16px;">
            ${mainBodyContent}
            
            <!-- Stats Box -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #334155; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Dekh Apni Halat:</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Rank:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: bold; text-align: right;">${rankDisplay}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Streak:</td>
                  <td style="padding: 8px 0; color: #d97706; font-weight: bold; text-align: right; border-top: 1px solid #e2e8f0;">${user.current_streak || 0} 🔥</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Last 7 Days:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: bold; text-align: right; border-top: 1px solid #e2e8f0;">${rounded7DayHrs} hrs</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Total Focus:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: bold; text-align: right; border-top: 1px solid #e2e8f0;">${roundedTotalHrs} hrs</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 35px 0 15px 0;">
              <a href="https://www.alltracker.online" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Start Focus Timer Now</a>
            </div>

            <p style="text-align: center; color: #666666; font-size: 14px;">No excuses. Padhai kar chup chaap.</p>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 13px;">
              <strong>Your strict accountability partner</strong><br/>
              (Auto-generated reminder based on inactivity)
            </p>
            <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 11px;">
              You are receiving this because you signed up for All Tracker.<br/>To stop receiving these, you must manually delete your account.
            </p>
          </div>
        </div>
      </div>
    `;

    const resend = new Resend(resendApiKey);
    const sendResult = await resend.emails.send({
      from: 'Maamu @ All Tracker <maamu@alltracker.online>',
      to: [email],
      subject: `${user.username}, you're slipping.`,
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
