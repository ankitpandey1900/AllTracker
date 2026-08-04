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
             COALESCE(
               (SELECT MAX(start_time) FROM public.study_sessions WHERE user_id = p.id),
               p.created_at
             ) as last_active,
             (SELECT COALESCE(SUM(duration), 0) FROM public.study_sessions WHERE user_id = p.id AND start_time >= NOW() - INTERVAL '7 days') as last_7_days_hours,
             p.rank, p.total_hours, p.current_streak, p.integrity_score
      FROM public.profiles p
      JOIN public.user u ON p.auth_user_id = u.id
      WHERE COALESCE(
              (SELECT MAX(start_time) FROM public.study_sessions WHERE user_id = p.id), 
              p.created_at
            ) < NOW() - INTERVAL '7 days'
      AND p.last_reengagement_sent_at IS NULL
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

      let roast = "Bhai, zinda hai ya nikal gaya?";
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
              <p style="font-size: 18px; font-weight: bold; margin-top: 0;">Ae ${user.username}, idhar aa...</p>
              
              <p>It's been <strong>${timeText}</strong> since you last tracked a session. Padhai likhai bilkul chhod di kya?</p>
              
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #991b1b; font-weight: 500;">${roast}</p>
              </div>

              <p>Aisi laziness se tera goal kabhi achieve nahi hone wala. Baad mein mat bolna Maamu ne reality check nahi diya tha. (ಠ_ಠ)</p>
              
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

      return {
        from: 'Maamu @ All Tracker <maamu@alltracker.online>',
        to: [user.email],
        subject: `${user.username}, you're slipping.`,
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
        UPDATE public.profiles
        SET last_reengagement_sent_at = NOW()
        WHERE id = ANY($1::uuid[]);
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
