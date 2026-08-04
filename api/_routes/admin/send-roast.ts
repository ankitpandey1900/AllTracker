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

    let emailContent = "";

    if (custom_message && custom_message.trim().length > 0) {
      emailContent = `
        <div style="font-family: Arial, sans-serif; font-size: 15px; color: #111111; line-height: 1.5;">
          <p>Hi ${user.username},</p>
          <p>${custom_message}</p>
          <br/>
          <p>Regards,<br/>The All Tracker Team</p>
        </div>
      `;
    } else {
      const daysInactive = Math.floor((Date.now() - new Date(user.last_active).getTime()) / (1000 * 60 * 60 * 24));
      let timeText = "a week";
      if (daysInactive >= 30 && daysInactive < 60) timeText = "over a month";
      else if (daysInactive >= 60) timeText = "a long time";
      else if (daysInactive > 7) timeText = `${daysInactive} days`;
      else timeText = `${daysInactive} days (even though it hasn't been a full week)`;

      let roast = "";
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

      emailContent = `
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
            - <br/>
            <strong>Your strict accountability partner</strong><br/>
            (Auto-generated reminder based on inactivity)
          </p>
        </div>
      `;
    }

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
