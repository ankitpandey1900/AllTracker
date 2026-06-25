import { getPool } from "../db/pool.js";
import type { AuthenticatedProfile } from "./profile-repo.js";

const DEFAULT_TZ = 'Asia/Kolkata';

/**
 * Validates and sanitises a user-supplied IANA timezone string.
 * Falls back to Asia/Kolkata if the value is missing, empty, or clearly invalid.
 * Uses a simple regex + length check — PostgreSQL will still reject truly unknown zones
 * at query time, so this is a defence-in-depth safeguard.
 */
function safeTz(tz?: string | null): string {
  if (!tz || typeof tz !== 'string') return DEFAULT_TZ;
  const trimmed = tz.trim();
  // IANA identifiers look like "Area/Location" (e.g. "America/New_York")
  if (trimmed.length < 2 || trimmed.length > 64 || /[;'"\\]/.test(trimmed)) return DEFAULT_TZ;
  return trimmed;
}

export async function logStudySession(
  profile: AuthenticatedProfile,
  payload: {
    duration: number;
    subject: string;
    startAt?: string;
    endAt?: string;
    note?: string;
    timezone?: string;
  },
): Promise<void> {
  const pool = getPool();
  const tz = safeTz(payload.timezone);
  const endAt = payload.endAt ? new Date(payload.endAt) : new Date();
  const startAt = payload.startAt
    ? new Date(payload.startAt)
    : new Date(endAt.getTime() - payload.duration * 60 * 60 * 1000);

  // Prevent duplicate saves within a short window (e.g. multi-tab stop or API retries)
  const recentCheck = await pool.query(
    `
      select id from study_sessions 
      where user_id = $1::uuid 
        and (
          (subject = $2 and abs(duration - $3) < 0.001 and created_at > now() - interval '10 seconds')
          or (start_time = $4::timestamp)
        )
      limit 1
    `,
    [
      profile.profileId, 
      payload.subject || "GENERAL", 
      Number(payload.duration || 0),
      startAt.toISOString()
    ]
  );

  if (recentCheck.rows.length > 0) {
    console.log(`[Log]: Duplicate session detected for user ${profile.profileId}. Skipping save.`);
    return;
  }

  // Split sessions crossing midnight in the user's timezone
  const getDateStrInTz = (d: Date) => {
    return new Intl.DateTimeFormat('en-GB', { 
      timeZone: tz, 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(d);
  };

  if (getDateStrInTz(startAt) !== getDateStrInTz(endAt)) {
    console.log(`[Log]: Session crossing ${tz} midnight detected. Splitting log...`);
    
    // Calculate the midnight boundary in the user's timezone
    // Get the date components at endAt in the user's timezone
    const endLocalStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(endAt);
    
    // Parse the local time components
    const parts = endLocalStr.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      const [, mm, dd, yyyy] = parts;
      // Build "YYYY-MM-DDT00:00:00" in the user's timezone
      const midnightLocalStr = `${yyyy}-${mm}-${dd}T00:00:00`;
      
      // Compute the UTC equivalent of midnight in the user's timezone
      // by comparing how the same instant renders in UTC vs the target timezone
      const tempDate = new Date(midnightLocalStr + 'Z'); // treat as UTC temporarily
      const utcStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).format(tempDate);
      const localAtTemp = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).format(tempDate);
      
      // Parse both to compute offset
      const parseToMs = (str: string) => {
        const p = str.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
        if (!p) return 0;
        return Date.UTC(+p[3], +p[1]-1, +p[2], +p[4], +p[5], +p[6]);
      };
      
      const offsetMs = parseToMs(localAtTemp) - parseToMs(utcStr);
      // Midnight UTC = midnight local - offset
      const midnightUtc = new Date(tempDate.getTime() - offsetMs);

      const clockBeforeMs = midnightUtc.getTime() - startAt.getTime();
      const clockAfterMs = endAt.getTime() - midnightUtc.getTime();
      const totalClockMs = clockBeforeMs + clockAfterMs;

      // Distribute actual focused duration proportionally based on clock boundaries
      const actualDurationMs = payload.duration * 3600000;
      const ratio = totalClockMs > 0 ? actualDurationMs / totalClockMs : 1;
      
      const beforeMs = clockBeforeMs * ratio;
      const afterMs = clockAfterMs * ratio;
      
      if (beforeMs > 0 && afterMs > 0) {
        const notePart1 = (payload.note || "").includes("(Part") ? payload.note : (payload.note || "") + " (Part 1/2)";
        const notePart2 = (payload.note || "").includes("(Part") ? payload.note : (payload.note || "") + " (Part 2/2)";

        // Log part 1 (Yesterday)
        await pool.query(
          `insert into study_sessions (user_id, duration, subject, start_time, end_time, note) values ($1::uuid, $2, $3, $4, $5, $6)`,
          [profile.profileId, Number((beforeMs / 3600000).toFixed(4)), payload.subject, startAt.toISOString(), midnightUtc.toISOString(), notePart1]
        );
        // Log part 2 (Today)
        await pool.query(
          `insert into study_sessions (user_id, duration, subject, start_time, end_time, note) values ($1::uuid, $2, $3, $4, $5, $6)`,
          [profile.profileId, Number((afterMs / 3600000).toFixed(4)), payload.subject, midnightUtc.toISOString(), endAt.toISOString(), notePart2]
        );
        await reconcileProfileHours(profile.profileId, tz);
        return;
      }
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
  await reconcileProfileHours(profile.profileId, tz);
}

export async function fetchStudySessions(profile: AuthenticatedProfile, timezone?: string) {
  const pool = getPool();
  const tz = safeTz(timezone);
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
        to_char((start_time AT TIME ZONE 'UTC' AT TIME ZONE $2)::date, 'YYYY-MM-DD') as log_date
      from study_sessions
      where user_id = $1::uuid
      order by end_time desc
      limit 300
    `,
    [profile.profileId, tz],
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
 * Uses the user's timezone (defaults to Asia/Kolkata) for "today" boundary.
 */
export async function reconcileProfileHours(profileId: string, timezone?: string): Promise<void> {
  const pool = getPool();
  const tz = safeTz(timezone);
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
            and (start_time AT TIME ZONE 'UTC' AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date
        ),
        updated_at = now()
      where id = $1::uuid
    `,
    [profileId, tz]
  );
}
