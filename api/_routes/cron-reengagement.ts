import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../_lib/http/response.js";
import { getPool } from "../_lib/db/pool.js";
import { Resend } from "resend";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // 1. Verify Vercel Cron Secret (Security)
  // If hitting this endpoint manually, you must pass ?cron_secret=... or use the Auth header
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const cronSecretQuery = url.searchParams.get("cron_secret");

  // TEMPORARILY DISABLED SECURITY FOR LIVE TESTING
  // if (
  //   process.env.CRON_SECRET && 
  //   authHeader !== expectedAuth && 
  //   cronSecretQuery !== process.env.CRON_SECRET
  // ) {
  //   return sendJson(res, 401, { error: "Unauthorized cron request." });
  // }

  // 2. Initialize Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("Missing RESEND_API_KEY environment variable.");
    return sendJson(res, 500, { error: "Email provider configuration missing." });
  }
  
  const resend = new Resend(resendApiKey);
  const pool = getPool();
  
  try {
    // 3. Query for strict inactivity (haven't actually logged a study session in 12 hours)
    const query = `
      SELECT p.id as profile_id, p.username, u.email, 
             COALESCE(
               (SELECT MAX(start_time) FROM public.study_sessions WHERE user_id = p.id),
               p.created_at
             ) as last_active,
             p.rank, p.total_hours, p.current_streak, p.integrity_score
      FROM public.profiles p
      JOIN public.user u ON p.auth_user_id = u.id
      WHERE COALESCE(
              (SELECT MAX(start_time) FROM public.study_sessions WHERE user_id = p.id), 
              p.created_at
            ) < NOW() - INTERVAL '12 hours'
      AND p.last_reengagement_sent_at IS NULL
      LIMIT 100;
    `;
    
    const { rows: inactiveUsers } = await pool.query(query);

    if (inactiveUsers.length === 0) {
      return sendJson(res, 200, { message: "No inactive users to re-engage today." });
    }

    // 4. Send emails
    const emailPromises = inactiveUsers.map((user) => {
      const daysInactive = Math.floor((Date.now() - new Date(user.last_active).getTime()) / (1000 * 60 * 60 * 24));
      
      let timeText = "a week";
      if (daysInactive >= 30 && daysInactive < 60) timeText = "over a month";
      else if (daysInactive >= 60) timeText = "a long time";
      else if (daysInactive > 7) timeText = `${daysInactive} days`;

      // Brutal Hinglish roasts
      let roast = "Bhai, zinda hai ya nikal gaya?";
      if (user.current_streak === 0) {
        roast = "Your streak is 0. Literally 0. Ek din ki consistency nahi banti tujhse aur sapne bade bade dekh raha hai? Aukaat mein reh aur padhai karle chup chaap. A potato has better future prospects than you right now.";
      } else if (user.total_hours < 10) {
        roast = `Total ${user.total_hours} ghante padha hai abhi tak. Bhai, itna time toh main bathroom mein baith ke barbaad kar deta hoon. Isse zyada toh log PUBG mein nikal dete hain. Delete maar account, tere bas ki nahi hai.`;
      } else if (user.rank === 'IRON') {
        roast = "Abey tu abhi tak IRON rank pe hi sarr raha hai? Noobs bhi isse zyada tezi se rank up karte hain. Tujhse na ho payega. Go back to watching reels, wahi teri aukaat hai.";
      } else if (user.integrity_score < 50) {
        roast = `Integrity score of ${user.integrity_score}? Khud ko dhoka dena band kar bsdk. You're lying to the tracker and lying to yourself. You think we can't see you cheating your way through? Absolute clown behavior.`;
      } else {
        roast = `You have ${user.total_hours} hours logged. Theek thaak padh raha tha, fir kya hua? Hawa nikal gayi? Ya bandi ne kaat diya? Wapas aa ja chup chaap pehle se hi time bohot waste kar chuka hai tu.`;
      }

      const emailContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://www.alltracker.online/icons/icon-192x192.png" alt="All Tracker Logo" width="64" height="64" style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          </div>
          
          <h2 style="color: #09090b;">Hey ${user.username}, the Arena misses you.</h2>
          <p>It's been ${timeText} since you last logged into All Tracker.</p>
          
          <div style="background-color: #f4f4f5; border-left: 4px solid #71717a; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-style: italic; color: #3f3f46;">
              "<strong>${roast}</strong>"
            </p>
          </div>

          <p>We know it's tough to stay consistent, but your goals aren't going to achieve themselves.</p>
          
          <p><strong>Your Current Stats:</strong><br/>
          🏆 Rank: ${user.rank || 'Unranked'}<br/>
          🔥 Streak: ${user.current_streak || 0}<br/>
          ⏱️ Total Focus: ${user.total_hours || 0} hrs</p>

          <a href="https://www.alltracker.online" style="display: inline-block; padding: 12px 24px; background-color: #09090b; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 24px; font-weight: bold;">Return to the Arena</a>
          <p style="font-size: 12px; color: #71717a; margin-top: 48px;">- Maamu & The All Tracker Team</p>
        </div>
      `;

      return resend.emails.send({
        from: 'All Tracker <noreply@alltracker.online>',
        to: [user.email],
        subject: "Where have you been, champion?",
        html: emailContent,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    // Check for successes to update DB
    const successProfileIds: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        successProfileIds.push(inactiveUsers[index].profile_id);
      } else {
        console.error(`Failed to send email to ${inactiveUsers[index].email}:`, result);
      }
    });

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
      message: `Processed ${inactiveUsers.length} users. Successfully sent ${successProfileIds.length} emails.`,
      successIds: successProfileIds
    });

  } catch (error) {
    console.error("Error in cron re-engagement:", error);
    return sendJson(res, 500, { error: "Internal Server Error during cron." });
  }
}
