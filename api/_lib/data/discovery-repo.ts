import { getPool } from "../db/pool.js";

export async function fetchLeaderboard() {
  const pool = getPool();
  
  // 🛡️ SELF-HEALING: Reset any stale today_hours before fetching
  await pool.query(`
    update profiles 
    set today_hours = 0 
    where (last_active at time zone 'Asia/Kolkata')::date < (now() at time zone 'Asia/Kolkata')::date
       or (today_hours > 0 and last_active at time zone 'Asia/Kolkata' < '2026-04-26 02:05:00'::timestamp)
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
          when (p.last_active at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date 
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

  // 🛡️ SELF-HEALING: Ensure telemetry is based on clean data
  await pool.query(`
    update profiles 
    set today_hours = 0 
    where (last_active at time zone 'Asia/Kolkata')::date < (now() at time zone 'Asia/Kolkata')::date
       or (today_hours > 0 and last_active at time zone 'Asia/Kolkata' < '2026-04-26 02:05:00'::timestamp)
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
        coalesce(sum(case when (last_active at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date then today_hours else 0 end), 0) as global_hours_today
      from profiles
    `,
  );

  return {
    total_pilots: Number(totalRows[0]?.count || 0),
    active_now: Number(activeRows[0]?.count || 0),
    global_hours_today: Number(totals[0]?.global_hours_today || 0),
    total_platform_hours: Number(totals[0]?.total_platform_hours || 0),
    nations_active: 0,
  };
}
