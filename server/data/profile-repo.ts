import type { PoolClient } from "pg";
import { getPool } from "../db/pool";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type ProfileMetadata = {
  dob?: string;
  phoneNumber?: string;
  isPublic?: boolean;
  isFocusPublic?: boolean;
};

type StoredSettings = Record<string, unknown> & {
  profile?: ProfileMetadata;
};

export type AuthenticatedProfile = {
  profileId: string;
  authUserId: string;
  username: string;
  fullName: string;
  nation: string;
  avatar: string;
  rank: string;
  totalHours: number;
  todayHours: number;
  isFocusing: boolean;
  focusSubject: string | null;
  lastActive: string | null;
  createdAt: string;
  updatedAt: string | null;
  email: string;
  image: string | null;
  metadata: ProfileMetadata;
};

function makeUsernameSeed(user: SessionUser): string {
  const raw =
    user.email?.split("@")[0] ||
    user.name ||
    `pilot-${user.id.slice(0, 8)}`;

  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return normalized || `pilot-${user.id.slice(0, 8)}`;
}

async function generateUniqueUsername(
  client: PoolClient,
  user: SessionUser,
): Promise<string> {
  const seed = makeUsernameSeed(user);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate =
      attempt === 0 ? seed : `${seed}-${String(attempt + 1).padStart(2, "0")}`;

    const { rowCount } = await client.query(
      "select 1 from profiles where username = $1 limit 1",
      [candidate],
    );

    if (!rowCount) {
      return candidate;
    }
  }

  return `pilot-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
}

function parseProfileMetadata(data: unknown): ProfileMetadata {
  const settings =
    data && typeof data === "object" ? (data as StoredSettings) : undefined;
  const profile = settings?.profile;
  return {
    dob: typeof profile?.dob === "string" ? profile.dob : "",
    phoneNumber:
      typeof profile?.phoneNumber === "string" ? profile.phoneNumber : "",
    isPublic: profile?.isPublic !== false,
    isFocusPublic: profile?.isFocusPublic !== false,
  };
}

function mapProfileRow(row: any): AuthenticatedProfile {
  return {
    profileId: row.profile_id,
    authUserId: row.auth_user_id,
    username: row.username,
    fullName: row.full_name || row.user_name || "",
    nation: row.nation || "Global",
    avatar: row.avatar || "👤",
    rank: row.rank || "IRON",
    totalHours: Number(row.total_hours || 0),
    todayHours: Number(row.today_hours || 0),
    isFocusing: row.is_focusing === true,
    focusSubject: row.focus_subject || null,
    lastActive: row.last_active || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    email: row.email,
    image: row.image || null,
    metadata: parseProfileMetadata(row.settings_data),
  };
}

async function fetchProfile(
  client: PoolClient,
  authUserId: string,
): Promise<AuthenticatedProfile | null> {
  const { rows } = await client.query(
    `
      select
        p.id as profile_id,
        p.auth_user_id,
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
        p.created_at,
        p.updated_at,
        u.name as user_name,
        u.email,
        u.image,
        us.data as settings_data
      from profiles p
      join "user" u on u.id = p.auth_user_id
      left join user_settings us on us.id = p.id
      where p.auth_user_id = $1
      limit 1
    `,
    [authUserId],
  );

  if (!rows.length) {
    return null;
  }

  return mapProfileRow(rows[0]);
}

export async function ensureProfileForUser(
  user: SessionUser,
): Promise<AuthenticatedProfile> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const existing = await fetchProfile(client, user.id);
    if (existing) {
      const nextFullName = user.name || existing.fullName;
      if (nextFullName !== existing.fullName) {
        await client.query(
          "update profiles set full_name = $2, updated_at = now() where auth_user_id = $1",
          [user.id, nextFullName],
        );
      }
      await client.query("commit");
      return (await fetchProfile(client, user.id)) as AuthenticatedProfile;
    }

    const username = await generateUniqueUsername(client, user);
    const avatar = "👤";
    const fullName = user.name || "";

    const { rows } = await client.query(
      `
        insert into profiles (
          auth_user_id,
          username,
          full_name,
          avatar,
          nation,
          rank,
          total_hours,
          today_hours,
          is_focusing,
          last_active,
          updated_at
        )
        values ($1, $2, $3, $4, 'Global', 'IRON', 0, 0, false, now(), now())
        returning id
      `,
      [user.id, username, fullName, avatar],
    );

    const profileId = rows[0].id as string;

    await client.query(
      `
        insert into user_settings (id, data, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (id)
        do nothing
      `,
      [profileId, JSON.stringify({ profile: { isPublic: true, isFocusPublic: true } })],
    );

    await client.query(
      `
        insert into user_trackers (id, data, updated_at)
        values ($1, '[]'::jsonb, now())
        on conflict (id)
        do nothing
      `,
      [profileId],
    );

    await client.query(
      `
        insert into timer_state (user_id, is_running, elapsed_acc, col_name, updated_at)
        values ($1, false, 0, '', now())
        on conflict (user_id)
        do nothing
      `,
      [profileId],
    );

    await client.query("commit");
    return (await fetchProfile(client, user.id)) as AuthenticatedProfile;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getProfileByAuthUserId(
  authUserId: string,
): Promise<AuthenticatedProfile | null> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fetchProfile(client, authUserId);
  } finally {
    client.release();
  }
}

export async function isUsernameTaken(
  username: string,
  excludeAuthUserId?: string,
): Promise<boolean> {
  const pool = getPool();
  const query = excludeAuthUserId
    ? `
        select 1
        from profiles
        where lower(username) = lower($1)
          and auth_user_id <> $2
        limit 1
      `
    : `
        select 1
        from profiles
        where lower(username) = lower($1)
        limit 1
      `;

  const values = excludeAuthUserId ? [username, excludeAuthUserId] : [username];
  const { rowCount } = await pool.query(query, values);
  return Boolean(rowCount);
}

export async function updateProfileIdentity(
  profile: AuthenticatedProfile,
  updates: {
    username: string;
    fullName: string;
    nation: string;
    avatar: string;
    metadata: ProfileMetadata;
  },
): Promise<AuthenticatedProfile> {
  const pool = getPool();
  if (
    updates.username.toLowerCase() !== profile.username.toLowerCase() &&
    (await isUsernameTaken(updates.username, profile.authUserId))
  ) {
    throw new Error("USERNAME_TAKEN");
  }

  await pool.query(
    `
      update profiles
      set
        username = $2,
        full_name = $3,
        nation = $4,
        avatar = $5,
        updated_at = now()
      where id = $1
    `,
    [
      profile.profileId,
      updates.username,
      updates.fullName,
      updates.nation,
      updates.avatar,
    ],
  );

  await pool.query(
    `
      insert into user_settings (id, data, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (id)
      do update set
        data = jsonb_set(
          coalesce(user_settings.data, '{}'::jsonb),
          '{profile}',
          $3::jsonb,
          true
        ),
        updated_at = now()
    `,
    [
      profile.profileId,
      JSON.stringify({ profile: updates.metadata }),
      JSON.stringify(updates.metadata),
    ],
  );

  return (await getProfileByAuthUserId(profile.authUserId)) as AuthenticatedProfile;
}

export async function broadcastProfileStats(
  profile: AuthenticatedProfile,
  payload: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();
  const nextUsername =
    typeof payload.display_name === "string" && payload.display_name.trim()
      ? payload.display_name.trim()
      : profile.username;

  await pool.query(
    `
      update profiles
      set
        username = $2,
        full_name = $3,
        avatar = $4,
        nation = $5,
        rank = $6,
        total_hours = $7,
        today_hours = $8,
        is_focusing = $9,
        focus_subject = $10,
        last_active = now(),
        updated_at = now()
      where id = $1
    `,
    [
      profile.profileId,
      nextUsername,
      typeof payload.User_name === "string" && payload.User_name.trim()
        ? payload.User_name
        : profile.fullName,
      typeof payload.avatar === "string" && payload.avatar.trim()
        ? payload.avatar
        : profile.avatar,
      typeof payload.nation === "string" && payload.nation.trim()
        ? payload.nation
        : profile.nation,
      typeof payload.current_rank === "string" && payload.current_rank.trim()
        ? payload.current_rank
        : profile.rank,
      Number(payload.total_hours || profile.totalHours || 0),
      Number(payload.today_hours || profile.todayHours || 0),
      payload.is_focusing_now === true,
      typeof payload.current_focus_subject === "string"
        ? payload.current_focus_subject
        : null,
    ],
  );

  const metadata = {
    dob: typeof payload.dob === "string" ? payload.dob : profile.metadata.dob || "",
    phoneNumber:
      typeof payload.phone_number === "string"
        ? payload.phone_number
        : profile.metadata.phoneNumber || "",
    isPublic:
      typeof payload.is_public === "boolean"
        ? payload.is_public
        : profile.metadata.isPublic !== false,
    isFocusPublic:
      typeof payload.is_focus_public === "boolean"
        ? payload.is_focus_public
        : profile.metadata.isFocusPublic !== false,
  };

  const existing = await pool.query(
    "select data from user_settings where id = $1 limit 1",
    [profile.profileId],
  );
  const current = existing.rows[0]?.data || {};
  const merged = {
    ...(current && typeof current === "object" ? current : {}),
    profile: metadata,
  };
  await pool.query(
    `
      insert into user_settings (id, data, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (id)
      do update set
        data = excluded.data,
        updated_at = excluded.updated_at
    `,
    [profile.profileId, JSON.stringify(merged)],
  );
}
