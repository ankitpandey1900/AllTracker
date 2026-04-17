import { getPool } from "../db/pool.js";

export async function fetchLeaderboard() {
  const pool = getPool();
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
        p.today_hours,
        p.is_focusing,
        p.focus_subject,
        p.last_active,
        u.email,
        us.data as settings_data
      from profiles p
      join "user" u on u.id = p.auth_user_id
      left join user_settings us on us.id = p.id
      order by p.total_hours desc, p.updated_at desc nulls last
      limit 1000
    `,
  );

  return rows.map((row: any) => {
    const settings =
      row.settings_data && typeof row.settings_data === "object"
        ? row.settings_data
        : {};
    const meta =
      settings.profile && typeof settings.profile === "object"
        ? settings.profile
        : {};

    return {
      sync_id: row.id,
      display_name: row.username,
      User_name: row.full_name || "",
      dob: typeof meta.dob === "string" ? meta.dob : "",
      nation: row.nation || "Global",
      total_hours: Number(row.total_hours || 0),
      today_hours: Number(row.today_hours || 0),
      current_rank: row.rank || "IRON",
      is_focusing_now: row.is_focusing === true,
      last_active: row.last_active || new Date().toISOString(),
      avatar: row.avatar || "👤",
      current_focus_subject: row.focus_subject || null,
      phone_number: typeof meta.phoneNumber === "string" ? meta.phoneNumber : "",
      is_public: meta.isPublic !== false,
      is_focus_public: meta.isFocusPublic !== false,
      email: row.email,
    };
  });
}

export async function fetchTelemetry() {
  const pool = getPool();
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
        coalesce(sum(case when last_active::date = now()::date then today_hours else 0 end), 0) as global_hours_today
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
