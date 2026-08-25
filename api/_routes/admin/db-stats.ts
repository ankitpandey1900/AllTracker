import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth, isAdmin } from "../../_lib/auth/index.js";
import { getPool } from "../../_lib/db/pool.js";
import { headersFromNode } from "../../_lib/http/request.js";
import { handleRouteError, sendJson } from "../../_lib/http/response.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user || !isAdmin(session.user.email)) {
      sendJson(res, 401, { error: "Unauthorized. Admin access required." });
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const pool = getPool();
    
    // Execute counts concurrently for performance
    const [
      studySessionsResult,
      tasksResult,
      feedPostsResult,
      badgesResult,
      pushSubsResult,
      vaultDocsResult,
      maamuResult
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM public.study_sessions"),
      pool.query("SELECT COUNT(*) FROM public.tasks"),
      pool.query("SELECT COUNT(*) FROM public.transmissions"),
      pool.query("SELECT COUNT(*) FROM public.user_badges"),
      pool.query("SELECT COUNT(*) FROM public.push_subscriptions"),
      pool.query("SELECT COUNT(*) FROM public.bookmarks"),
      pool.query("SELECT COUNT(*) FROM public.maamu_messages")
    ]);

    const globalActivityResult = await pool.query(`
      SELECT start_time::date as study_date, SUM(duration) as total_duration 
      FROM public.study_sessions 
      WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY start_time::date 
      ORDER BY study_date ASC
    `);

    sendJson(res, 200, { 
      stats: {
        totalStudySessions: parseInt(studySessionsResult.rows[0].count, 10),
        totalTasks: parseInt(tasksResult.rows[0].count, 10),
        totalFeedPosts: parseInt(feedPostsResult.rows[0].count, 10),
        totalBadges: parseInt(badgesResult.rows[0].count, 10),
        totalPushSubs: parseInt(pushSubsResult.rows[0].count, 10),
        totalVaultDocs: parseInt(vaultDocsResult.rows[0].count, 10),
        totalMaamuMessages: parseInt(maamuResult.rows[0].count, 10),
        globalActivity: globalActivityResult.rows
      }
    });
  } catch (err) {
    handleRouteError(res, err);
  }
}
