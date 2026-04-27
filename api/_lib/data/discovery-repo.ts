import { getPool } from "../db/pool.js";

export async function fetchLeaderboard() {
  const pool = getPool();

  // 🛡️ GHOST FOCUS FIX: Auto-clear is_focusing if last_active > 10 minutes ago
  // Handles users who closed their browser/app without clicking Stop
  await pool.query(`
    update profiles 
    set is_focusing = false, focus_subject = null
    where is_focusing = true
      and last_active < now() - interval '10 minutes'
  `);

  const { rows } = await pool.query(
    `
      select
        p.id,
        p.username,
        p.full_name,
        p.avatar,
        p.nation,
        p.rank,
        p.total_hours,
        case 
          when p.last_active > now() - interval '18 hours'
          then p.today_hours 
          else 0 
        end as today_hours,
        p.is_focusing,
        p.focus_subject,
        p.last_active,
        p.dob,
        p.phone_number,
        p.is_public,
        p.is_focus_public,
        p.integrity_score,
        p.competitive_score,
        p.current_streak,
        u.email,
        (p.last_active > now() - interval '60 seconds') as is_online
      from profiles p
      join "user" u on u.id = p.auth_user_id
      order by p.competitive_score desc, p.total_hours desc, p.updated_at desc nulls last
      limit 1000
    `,
  );

  return rows.map((row: any) => ({
    sync_id: row.id,
    display_name: row.username,
    User_name: row.full_name || "",
    dob: row.dob ? (typeof row.dob === 'string' ? row.dob.split('T')[0] : new Date(row.dob).toISOString().split('T')[0]) : "",
    nation: row.nation || "Global",
    total_hours: Number(row.total_hours || 0),
    today_hours: Number(row.today_hours || 0),
    current_rank: row.rank || "IRON",
    is_focusing_now: row.is_focusing === true,
    last_active: row.last_active || new Date().toISOString(),
    avatar: row.avatar || "👤",
    current_focus_subject: row.focus_subject || null,
    phone_number: row.phone_number || "",
    is_public: row.is_public !== false,
    is_focus_public: row.is_focus_public !== false,
    email: row.email,
    is_online: row.is_online === true,
    integrity_score: Number(row.integrity_score || 0),
    competitive_score: Number(row.competitive_score || 0),
    current_streak: Number(row.current_streak || 0),
  }));
}

export async function fetchTelemetry() {
  const pool = getPool();

  // 👻 GHOST FOCUS FIX: Auto-clear is_focusing if last_active > 10 minutes ago
  await pool.query(`
    update profiles 
    set is_focusing = false, focus_subject = null
    where is_focusing = true
      and last_active < now() - interval '10 minutes'
  `);

  const { rows: totalRows } = await pool.query(
    "select count(*)::int as count from profiles",
  );

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { rows: activeRows } = await pool.query(
    `
      select count(*)::int as count
      from profiles
      where is_focusing = true
        and last_active > $1
    `,
    [tenMinutesAgo],
  );

  const { rows: totals } = await pool.query(
    `
      select
        coalesce(sum(total_hours), 0) as total_platform_hours,
        coalesce(sum(case when last_active > now() - interval '18 hours' then today_hours else 0 end), 0) as global_hours_today
      from profiles
    `,
  );

  const result = {
    total_pilots: Number(totalRows[0]?.count || 0),
    active_now: Number(activeRows[0]?.count || 0),
    global_hours_today: Number(totals[0]?.global_hours_today || 0),
    total_platform_hours: Number(totals[0]?.total_platform_hours || 0),
    nations_active: 0,
  };

  // 📊 PLATFORM ANALYTICS: Write daily snapshot to platform_stats table.
  // Uses UPSERT so we can call this frequently without creating duplicate rows.
  // All values are calculated fresh from the live profiles data above.
  try {
    const avgHours = result.total_pilots > 0
      ? (result.global_hours_today / result.total_pilots)
      : 0;

    await pool.query(
      `
        insert into platform_stats (
          stat_date,
          active_users,
          total_hours,
          avg_hours,
          peak_focusing,
          all_time_users,
          all_time_hours,
          created_at,
          updated_at
        )
        values (
        (now())::date,
          $1, $2, $3, $4, $5, $6,
          now(), now()
        )
        on conflict (stat_date) do update set
          active_users   = greatest(platform_stats.active_users, $1),
          total_hours    = $2,
          avg_hours      = $3,
          peak_focusing  = greatest(platform_stats.peak_focusing, $4),
          all_time_users = $5,
          all_time_hours = $6,
          updated_at     = now()
      `,
      [
        result.active_now,
        result.global_hours_today,
        avgHours,
        result.active_now,
        result.total_pilots,
        result.total_platform_hours,
      ],
    );
  } catch (err) {
    // Non-fatal: analytics write failures should never break the main telemetry response
    console.warn('[platform_stats] Snapshot write failed:', err);
  }

  return result;
}
