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
      const daysInactive = Math.floor((Date.now() - new Date(user.last_active).getTime()) / (1000 * 60 * 60 * 24));
      
      const roundedTotalHrs = Number(user.total_hours || 0).toFixed(1);
      const rounded7DayHrs = Number(user.last_7_days_hours || 0).toFixed(1);
      const rankDisplay = user.rank ? user.rank.split(' ')[0] : 'Unranked';
      
      let timeText = "a week";
      if (daysInactive >= 30 && daysInactive < 60) timeText = "over a month";
      else if (daysInactive >= 60) timeText = "a long time";
      else if (daysInactive > 7) timeText = `${daysInactive} days`;

      // Brutal Hinglish roasts
      let roast = "Bhai, zinda hai ya nikal gaya?";
      if (user.current_streak === 0) {
        roast = "Your streak is 0. Literally 0. Ek din ki consistency nahi banti tujhse aur sapne bade bade dekh raha hai? Aukaat mein reh aur padhai karle chup chaap. A potato has better future prospects than you right now.";
      } else if (user.total_hours < 10) {
        roast = `Total ${roundedTotalHrs} ghante padha hai abhi tak. Bhai, itna time toh main bathroom mein baith ke barbaad kar deta hoon. Isse zyada toh log PUBG mein nikal dete hain. Delete maar account, tere bas ki nahi hai.`;
      } else if (user.rank && user.rank.includes('IRON')) {
        roast = "Abey tu abhi tak IRON rank pe hi sarr raha hai? Noobs bhi isse zyada tezi se rank up karte hain. Tujhse na ho payega. Go back to watching reels, wahi teri aukaat hai.";
      } else if (user.integrity_score < 50) {
        roast = `Integrity score of ${user.integrity_score}? Khud ko dhoka dena band kar bsdk. You're lying to the tracker and lying to yourself. You think we can't see you cheating your way through? Absolute clown behavior.`;
      } else {
        roast = `You have ${roundedTotalHrs} hours logged. Theek thaak padh raha tha, fir kya hua? Hawa nikal gayi? Ya bandi ne kaat diya? Wapas aa ja chup chaap pehle se hi time bohot waste kar chuka hai tu.`;
      }

      const emailContent = `
        <div style="font-family: Arial, sans-serif; font-size: 15px; color: #111111; line-height: 1.5;">
          <p>Ae ${user.username}, idhar aa...</p>
          
          <p>Kya chal raha hai tere life mein? It's been ${timeText} since you opened All Tracker. Padhai likhai chhod di kya?</p>
          
          <p>${roast}</p>

          <p>Tere ko kya lagta hai, aisi laziness ke saath tu apna goal achieve karega? (ಠ_ಠ)<br/>
          Auto chalane ki naubat aa jayegi beta agar yahi halat rahi toh. Baad mein mat bolna Maamu ne warning nahi di thi.</p>
          
          <p>
            <strong>Dekh apni halat ek baar:</strong><br/>
            Rank: ${rankDisplay} (Sharam kar)<br/>
            Streak: ${user.current_streak || 0} (Waah, kya consistency hai)<br/>
            Last 7 Days: ${rounded7DayHrs} hrs (Sharam se doob mar)<br/>
            Total Focus: ${roundedTotalHrs} hrs (Mera ek din ka screen time isse zyada hai)
          </p>

          <p>Abhi ke abhi wapas ja aur timer chalu kar: <a href="https://www.alltracker.online">https://www.alltracker.online</a></p>

          <p>No excuses. Padhai kar chup chaap.</p>
          
          <p>
            - Tera Maamu<br/>
            <span style="font-size: 12px; color: #666666;">(Admin of Reality Checks)</span>
          </p>
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
