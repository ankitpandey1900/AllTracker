import { getPool } from "../db/pool.js";
import type { AuthenticatedProfile } from "./profile-repo.js";

export async function logStudySession(
  profile: AuthenticatedProfile,
  payload: {
    duration: number;
    subject: string;
    startAt?: string;
    endAt?: string;
    note?: string;
  },
): Promise<void> {
  const pool = getPool();
  const endAt = payload.endAt ? new Date(payload.endAt) : new Date();
  const startAt = payload.startAt
    ? new Date(payload.startAt)
    : new Date(endAt.getTime() - payload.duration * 60 * 60 * 1000);

  // 🛡️ PROFESSIONAL MIDNIGHT SPLIT (IST)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  
  if (fmt(startAt) !== fmt(endAt)) {
    console.log(`[Log]: Session crossing IST midnight detected. Splitting log...`);
    
    // 1. Find Midnight IST in UTC
    // We create a date string for the end day at 00:00:00 in IST
    const midnightIST = new Date(endAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    midnightIST.setHours(0, 0, 0, 0);
    
    // We need to get the UTC equivalent of that 12:00 AM IST
    // IST is UTC+5:30, so 12:00 AM IST is 6:30 PM UTC (Previous Day)
    // Actually, a safer way:
    const startMs = startAt.getTime();
    const endMs = endAt.getTime();
    const totalMs = endMs - startMs;
    
    // Calculate how much of the session was before midnight IST
    const midnightUtc = new Date(endAt);
    midnightUtc.setUTCHours(18, 30, 0, 0); 
    if (midnightUtc.getTime() > endAt.getTime()) {
      midnightUtc.setTime(midnightUtc.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const beforeMs = midnightUtc.getTime() - startMs;
    const afterMs = endMs - midnightUtc.getTime();
    
    if (beforeMs > 0 && afterMs > 0) {
      // Log part 1 (Yesterday)
      await pool.query(
        `insert into study_sessions (user_id, duration, subject, start_time, end_time, note) values ($1::uuid, $2, $3, $4, $5, $6)`,
        [profile.profileId, Number((beforeMs / 3600000).toFixed(4)), payload.subject, startAt.toISOString(), midnightUtc.toISOString(), (payload.note || "") + " (Part 1/2)"]
      );
      // Log part 2 (Today)
      await pool.query(
        `insert into study_sessions (user_id, duration, subject, start_time, end_time, note) values ($1::uuid, $2, $3, $4, $5, $6)`,
        [profile.profileId, Number((afterMs / 3600000).toFixed(4)), payload.subject, midnightUtc.toISOString(), endAt.toISOString(), (payload.note || "") + " (Part 2/2)"]
      );
      await reconcileProfileHours(profile.profileId);
      return;
    }
  }

  await pool.query(
    `
      insert into study_sessions (
        user_id,
        duration,
        subject,
        start_time,
        end_time,
        note
      )
      values ($1::uuid, $2, $3, $4, $5, $6)
    `,
    [
      profile.profileId,
      Number(payload.duration || 0),
      payload.subject || "GENERAL",
      startAt.toISOString(),
      endAt.toISOString(),
      payload.note || "",
    ],
  );
  // Re-aggregate totals so Leaderboard stays accurate
  await reconcileProfileHours(profile.profileId);
}

export async function fetchStudySessions(profile: AuthenticatedProfile) {
  const pool = getPool();
  const { rows } = await pool.query(
    `
      select
        id,
        user_id,
        duration,
        subject,
        note,
        start_time,
        end_time,
        to_char((start_time at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD') as log_date
      from study_sessions
      where user_id = $1::uuid
      order by end_time desc
      limit 300
    `,
    [profile.profileId],
  );

  return rows.map((row: any, index: number) => ({
    id: row.id,
    user_id: row.user_id,
    duration: Number(row.duration || 0),
    subject: row.subject,
    note: row.note || "",
    start_at: row.start_time,
    end_at: row.end_time,
    log_date: row.log_date,
    session_number: index + 1,
  }));
}

export async function deleteStudySession(profile: AuthenticatedProfile, sessionId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `
      delete from study_sessions
      where id = $1 and user_id = $2::uuid
    `,
    [sessionId, profile.profileId]
  );
  // Re-aggregate totals so Leaderboard stays accurate
  await reconcileProfileHours(profile.profileId);
}

export async function updateStudySession(
  profile: AuthenticatedProfile,
  sessionId: string,
  payload: { duration: number; subject: string; note: string }
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `
      update study_sessions
      set duration = $1, subject = $2, note = $3
      where id = $4 and user_id = $5::uuid
    `,
    [
      Number(payload.duration || 0),
      payload.subject,
      payload.note || "",
      sessionId,
      profile.profileId
    ]
  );
  // Re-aggregate totals so Leaderboard stays accurate
  await reconcileProfileHours(profile.profileId);
}

/**
 * Re-aggregates profile.total_hours and profile.today_hours
 * from the ground truth study_sessions table.
 * Called after every session mutation (delete / edit).
 */
async function reconcileProfileHours(profileId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `
      update profiles
      set
        total_hours = (
          select coalesce(sum(duration), 0)
          from study_sessions
          where user_id = $1::uuid
        ),
        today_hours = (
          select coalesce(sum(duration), 0)
          from study_sessions
          where user_id = $1::uuid
            and (start_time at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
        ),
        updated_at = now()
      where id = $1::uuid
    `,
    [profileId]
  );
}
