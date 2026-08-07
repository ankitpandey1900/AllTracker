import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../_lib/http/response.js";
import { getPool } from "../_lib/db/pool.js";
import { Resend } from "resend";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // 1. Verify Vercel Cron Secret (Security)
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const cronSecretQuery = url.searchParams.get("cron_secret");

  if (
    process.env.CRON_SECRET && 
    authHeader !== expectedAuth && 
    cronSecretQuery !== process.env.CRON_SECRET
  ) {
    return sendJson(res, 401, { error: "Unauthorized cron request." });
  }

  // 2. Initialize Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("Missing RESEND_API_KEY environment variable.");
    return sendJson(res, 500, { error: "Email provider configuration missing." });
  }
  
  const resend = new Resend(resendApiKey);
  const pool = getPool();
  
  try {
    // 3. Query for strict inactivity (haven't actually logged a study session in 7 days)
    const query = `
      SELECT p.id as profile_id, p.username, u.email, 
             COALESCE(up.last_active, p.created_at) as last_active,
             (SELECT COALESCE(SUM(duration), 0) FROM public.study_sessions WHERE user_id = p.id AND start_time >= NOW() - INTERVAL '7 days') as last_7_days_hours,
             s.rank, s.total_hours, s.current_streak, s.integrity_score
      FROM public.profiles p
      JOIN public.user u ON p.auth_user_id = u.id
      LEFT JOIN public.user_stats s ON s.user_id = p.id
      LEFT JOIN public.user_presence up ON up.user_id = p.id
      WHERE COALESCE(up.last_active, p.created_at) < NOW() - INTERVAL '7 days'
      AND s.last_reengagement_sent_at IS NULL
      LIMIT 100;
    `;
    
    const { rows: inactiveUsers } = await pool.query(query);

    if (inactiveUsers.length === 0) {
      return sendJson(res, 200, { message: "No inactive users to re-engage today." });
    }

    // 4. Send emails using Batch API to avoid rate limits
    const batchEmails = inactiveUsers.map((user) => {
      const lastActiveDate = user.last_active ? new Date(user.last_active).getTime() : Date.now();
      const daysInactive = Math.floor((Date.now() - lastActiveDate) / (1000 * 60 * 60 * 24));
      const roundedTotalHrs = Number(user.total_hours || 0).toFixed(1);
      const rounded7DayHrs = Number(user.last_7_days_hours || 0).toFixed(1);
      const rankDisplay = user.rank ? user.rank.split(' ')[0] : 'Unranked';
      
      let timeText = "a week";
      if (daysInactive >= 30 && daysInactive < 60) timeText = "over a month";
      else if (daysInactive >= 60) timeText = "a long time";
      else if (daysInactive > 7) timeText = `${daysInactive} days`;
      else timeText = `${Math.max(0, daysInactive)} days (even though it hasn't been a full week)`;

      let roast = "";
      let dynamicSubject = "";
      if (user.current_streak === 0) {
        roast = "Streak: 0. Ek din bhi lagatar padhai nahi ho rahi tujhse? Instagram band kar aur thoda focus kar le, varna aukaat wahi reh jayegi.";
        dynamicSubject = `bruh, your streak is literally 0 🤡 time to lock in`;
      } else if (user.total_hours < 10) {
        roast = `Sirf ${roundedTotalHrs} hrs total? Itna time toh log bathroom me reels scroll karte hue nikal dete hain. Padhna shuru kar bhai, tera future dark lag raha hai.`;
        dynamicSubject = `you're slacking bestie 😔 only ${roundedTotalHrs} hours?`;
      } else if (user.rank && user.rank.includes('IRON')) {
        roast = "Abhi tak IRON rank pe hi atak raha tu? Tujhse zyada grind toh bgmi ke noobs karte hain. Chup chaap level up kar le.";
        dynamicSubject = `still stuck in iron rank? embarrassing 💀`;
      } else if (user.integrity_score < 50) {
        roast = `Integrity score: ${user.integrity_score}. Khud se jhoot bolna band kar bhai. We both know you're faking those study sessions. Literal clown behavior 🤡`;
        dynamicSubject = `we see you faking those hours 👀 stop playing`;
      } else {
        roast = `Total ${roundedTotalHrs} hrs karke achanak ruk kyu gaya? Motivation khatam ya breakup ho gaya? Wapas aa ja beta, bohot time waste kar chuka hai tu.`;
        dynamicSubject = `u alive? missing u on the leaderboard 🏆`;
      }

      let mainBodyContent = `
        <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.5px;">Ae ${user.username}, idhar aa...</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
          It's been <strong>${timeText}</strong> since you last tracked a session. Padhai likhai bilkul chhod di kya?
        </p>
        
        <div style="background-color: #fafafa; border-left: 3px solid #000000; padding: 18px 24px; margin: 32px 0;">
          <p style="margin: 0; color: #111827; font-size: 16px; font-style: italic; line-height: 1.6;">"${roast}"</p>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 32px;">
          Aisi laziness se tera goal kabhi achieve nahi hone wala. Baad mein mat bolna Maamu ne reality check nahi diya tha. (ಠ_ಠ)
        </p>
      `;

      const rankScoreValue = Math.floor(((user.total_hours || 0) * 1.8) + ((user.current_streak || 0) * 1.5) + ((user.integrity_score || 0) * 0.1));

      const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media (prefers-color-scheme: dark) {
            body, table, td { background-color: #000000 !important; color: #ffffff !important; }
            .content-wrapper { background-color: #000000 !important; }
            h1, h2, h3, p, td { color: #ffffff !important; }
            .divider { border-color: #333333 !important; }
            .roast-box { background-color: #111111 !important; border-color: #ffffff !important; }
            .stats-label { color: #a1a1aa !important; }
            .footer-text { color: #71717a !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff;" class="content-wrapper">
                
                <!-- Logo Header -->
                <tr>
                  <td style="padding-bottom: 40px;">
                    <img src="https://www.alltracker.online/icon-192.png" alt="All Tracker" width="72" height="72" style="display: block; border-radius: 16px;">
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    ${mainBodyContent.replace('background-color: #fee2e2; border-left: 4px solid #ef4444;', 'background-color: #fafafa; border-left: 3px solid #000000;').replace('color: #991b1b;', 'color: #111827;').replace('class="roast-box"', '')}
                  </td>
                </tr>

                <!-- Minimal Stats Grid -->
                <tr>
                  <td style="padding-bottom: 40px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280;" class="stats-label">Current Performance</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;" class="divider stats-label">Rank</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right; color: #111827;" class="divider">${rankDisplay}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;" class="divider stats-label">Rank Score</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 800; text-align: right; color: #d97706;" class="divider">${rankScoreValue}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;" class="divider stats-label">Active Streak</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right; color: #111827;" class="divider">${user.current_streak || 0} 🔥</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;" class="divider stats-label">Past 7 Days</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right; color: #111827;" class="divider">${rounded7DayHrs} hrs</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;" class="divider stats-label">Total Focus</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right; color: #111827;" class="divider">${roundedTotalHrs} hrs</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                  <td style="padding-bottom: 48px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left">
                          <a href="https://www.alltracker.online" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 15px;">Start Focus Timer</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding-top: 32px; border-top: 1px solid #e5e7eb;" class="divider">
                    <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px; line-height: 1.6;" class="footer-text">
                      Sent by <strong>All Tracker</strong> - Your accountability partner.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;" class="footer-text">
                      You are receiving this reality check because you created an account.<br>
                      To stop receiving these, manually delete your account in settings.
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

      return {
        from: 'Maamu @ All Tracker <maamu@alltracker.online>',
        to: [user.email],
        subject: dynamicSubject,
        html: emailContent,
      };
    });

    const result = await resend.batch.send(batchEmails);
    
    // Check for successes to update DB
    const successProfileIds: string[] = [];
    if (result.data) {
      // If the batch succeeds, we assume all emails were queued successfully by Resend
      successProfileIds.push(...inactiveUsers.map(u => u.profile_id));
    } else {
      console.error("Batch send error:", result.error);
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

    return sendJson(res, 200, { 
      message: `Processed ${inactiveUsers.length} users. Successfully sent ${successProfileIds.length} emails.`
    });

  } catch (error) {
    console.error("Error in cron re-engagement:", error);
    return sendJson(res, 500, { error: "Internal Server Error during cron." });
  }
}
