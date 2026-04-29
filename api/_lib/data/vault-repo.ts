import { getPool } from "../db/pool.js";
import type { AuthenticatedProfile } from "./profile-repo.js";

export type VaultName =
  | "tracker"
  | "settings"
  | "routines"
  | "history"
  | "bookmarks"
  | "tasks"
  | "timer";

type RoutineItemRow = {
  id: string;
  title: string;
  time: string | null;
  note: string | null;
  completed: boolean | null;
  days: number[] | null;
  streak: number | null;
  last_completed_at: string | null;
  created_at: string | null;
};

type TaskRow = {
  id: string;
  text: string;
  completed: boolean | null;
  date: string;
  priority: number | null;
  created_at: string | null;
  completed_at: string | null;
};

type BookmarkRow = {
  id: string;
  title: string;
  url: string;
  category: string | null;
  created_at: string | null;
};

type TimerRow = {
  is_running: boolean;
  elapsed_acc: number | string;
  start_time: string | null;
  category: string | null;
  col_name: string | null;
  session_start_clock: string | null;
  break_data: any | null;
  updated_at: string;
};

function stripProfileFromSettings(data: Record<string, unknown>): Record<string, unknown> {
  // profile metadata → profiles table columns
  // chatSessions / activeSessionId → maamu_conversations + maamu_messages tables
  const { profile, chatSessions, activeSessionId, ...rest } = data;
  return rest;
}

function toRoutineItem(row: RoutineItemRow) {
  return {
    id: row.id,
    title: row.title,
    time: row.time || "",
    note: row.note || "",
    completed: row.completed === true,
    days: Array.isArray(row.days) ? row.days.map(Number) : [],
    streak: Number(row.streak || 0),
    lastCompletedIso: (row as any).last_completed_date || "",
  };
}

function toTask(row: TaskRow) {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed === true,
    date: row.date,
    priority: Math.min(3, Math.max(1, Number(row.priority || 2))) as 1 | 2 | 3,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    completedAt: row.completed_at
      ? new Date(row.completed_at).getTime()
      : undefined,
  };
}

function toBookmark(row: BookmarkRow) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category || "Other",
  };
}

function toTimerState(row: TimerRow | undefined) {
  if (!row) {
    return null;
  }

  return {
    isRunning: row.is_running === true,
    elapsedAcc: Number(row.elapsed_acc || 0),
    startTime: row.start_time ? new Date(row.start_time).getTime() : null,
    category: row.category,
    colName: row.col_name || "",
    sessionStartClock: row.session_start_clock
      ? new Date(row.session_start_clock).getTime()
      : null,
    activeBreak: row.break_data || null,
  };
}

export async function readVault(
  profile: AuthenticatedProfile,
  vault: VaultName,
): Promise<{ data: unknown; updatedAt: string | null }> {
  const pool = getPool();
  switch (vault) {
    case "tracker": {
      const { rows } = await pool.query(
        "select data, updated_at from user_trackers where id = $1 limit 1",
        [profile.profileId],
      );
      return {
        data: rows[0]?.data || [],
        updatedAt: rows[0]?.updated_at || null,
      };
    }
    case "settings": {
      const { rows } = await pool.query(
        "select data, updated_at from user_settings where id = $1 limit 1",
        [profile.profileId],
      );
      return {
        data: rows[0]?.data ? stripProfileFromSettings(rows[0].data) : {},
        updatedAt: rows[0]?.updated_at || null,
      };
    }
    case "routines": {
      const { rows } = await pool.query<RoutineItemRow>(
        `
          select id, title, time, note, completed, days, streak, to_char(last_completed_at, 'YYYY-MM-DD') as last_completed_date, created_at
          from routines
          where user_id = $1
          order by created_at asc
        `,
        [profile.profileId],
      );
      const updatedAt =
        rows.length > 0 ? rows[rows.length - 1].created_at || null : null;
      return { data: rows.map(toRoutineItem), updatedAt };
    }
    case "history": {
      const { rows } = await pool.query<{ history_date: string; completed_count: number; updated_at: string | null }>(
        `
          select history_date, completed_count, updated_at
          from routine_history
          where user_id = $1
          order by history_date asc
        `,
        [profile.profileId],
      );
      const history = rows.reduce<Record<string, number>>((acc: Record<string, number>, row: { history_date: string | Date; completed_count: number }) => {
        const dateKey = row.history_date instanceof Date 
          ? row.history_date.toISOString().split("T")[0] 
          : row.history_date;
        acc[dateKey] = Number(row.completed_count || 0);
        return acc;
      }, {});
      const updatedAt =
        rows.length > 0 ? rows[rows.length - 1].updated_at || null : null;
      return { data: history, updatedAt };
    }
    case "bookmarks": {
      const { rows } = await pool.query<BookmarkRow>(
        `
          select id, title, url, category, created_at
          from bookmarks
          where user_id = $1
          order by created_at asc
        `,
        [profile.profileId],
      );
      const updatedAt =
        rows.length > 0 ? rows[rows.length - 1].created_at || null : null;
      return { data: rows.map(toBookmark), updatedAt };
    }
    case "tasks": {
      const { rows } = await pool.query<TaskRow>(
        `
          select id, text, completed, date, priority, created_at, completed_at
          from tasks
          where user_id = $1
          order by created_at asc
        `,
        [profile.profileId],
      );
      const updatedAt =
        rows.length > 0 ? rows[rows.length - 1].created_at || null : null;
      return { data: rows.map(toTask), updatedAt };
    }
    case "timer": {
      const { rows } = await pool.query<TimerRow>(
        `
          select is_running, elapsed_acc, start_time, category, col_name, session_start_clock, break_data, updated_at
          from timer_state
          where user_id = $1
          limit 1
        `,
        [profile.profileId],
      );
      return {
        data: toTimerState(rows[0]),
        updatedAt: rows[0]?.updated_at || null,
      };
    }
    default:
      throw new Error(`Unsupported vault: ${vault}`);
  }
}

export async function writeVault(
  profile: AuthenticatedProfile,
  vault: VaultName,
  data: any,
): Promise<{ updatedAt: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    switch (vault) {
      case "tracker": {
        const updatedAt = new Date().toISOString();
        await client.query(
          `
            insert into user_trackers (id, data, updated_at)
            values ($1, $2::jsonb, $3)
            on conflict (id)
            do update set
              data = excluded.data,
              updated_at = excluded.updated_at
          `,
          [profile.profileId, JSON.stringify(data || []), updatedAt],
        );
        await client.query("commit");
        return { updatedAt };
      }
      case "settings": {
        const existing = await client.query(
          "select data from user_settings where id = $1 limit 1",
          [profile.profileId],
        );
        const current = existing.rows[0]?.data || {};
        // Strip keys that belong in other tables (profile → profiles columns, chat → maamu tables)
        const incoming = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
        const { profile: _p, chatSessions: _c, activeSessionId: _a, ...incomingClean } = incoming;
        const next: Record<string, unknown> = {
          ...(current && typeof current === "object" ? current as Record<string, unknown> : {}),
          ...incomingClean,
        };
        // Always ensure profile/chat keys are absent
        delete next.profile;
        delete next.chatSessions;
        delete next.activeSessionId;
        const updatedAt = new Date().toISOString();
        await client.query(
          `
            insert into user_settings (id, data, updated_at)
            values ($1, $2::jsonb, $3)
            on conflict (id)
            do update set
              data = excluded.data,
              updated_at = excluded.updated_at
          `,
          [profile.profileId, JSON.stringify(next), updatedAt],
        );
        await client.query("commit");
        return { updatedAt };
      }
      case "routines": {
        await client.query("delete from routines where user_id = $1", [profile.profileId]);
        if (data && Array.isArray(data) && data.length > 0) {
          await client.query(
            `
              insert into routines (id, user_id, title, time, note, completed, days, streak, last_completed_at)
              select 
                (r->>'id')::uuid, 
                $1::uuid, 
                (r->>'title'), 
                (r->>'time'), 
                (r->>'note'), 
                (r->>'completed')::boolean, 
                case when r->'days' is not null then array(select jsonb_array_elements_text(r->'days')::integer) else '{0,1,2,3,4,5,6}'::integer[] end,
                (r->>'streak')::integer,
                case when r->>'lastCompletedIso' is not null and r->>'lastCompletedIso' <> '' then (r->>'lastCompletedIso' || 'T00:00:00.000Z')::timestamp else null end
              from jsonb_array_elements($2::jsonb) as r
            `,
            [profile.profileId, JSON.stringify(data)],
          );
        }
        await client.query("commit");
        return { updatedAt: new Date().toISOString() };
      }
      case "history": {
        await client.query("delete from routine_history where user_id = $1", [profile.profileId]);
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          await client.query(
            `
              insert into routine_history (user_id, history_date, completed_count, updated_at)
              select 
                $1::uuid, 
                key::date, 
                value::integer, 
                now()
              from jsonb_each_text($2::jsonb)
            `,
            [profile.profileId, JSON.stringify(data)],
          );
        }
        await client.query("commit");
        return { updatedAt: new Date().toISOString() };
      }
      case "bookmarks": {
        await client.query("delete from bookmarks where user_id = $1", [profile.profileId]);
        if (data && Array.isArray(data) && data.length > 0) {
          await client.query(
            `
              insert into bookmarks (id, user_id, title, url, category)
              select 
                (b->>'id')::uuid, 
                $1::uuid, 
                (b->>'title'), 
                (b->>'url'), 
                (b->>'category')
              from jsonb_array_elements($2::jsonb) as b
            `,
            [profile.profileId, JSON.stringify(data)],
          );
        }
        await client.query("commit");
        return { updatedAt: new Date().toISOString() };
      }
      case "tasks": {
        await client.query("delete from tasks where user_id = $1", [profile.profileId]);
        if (data && Array.isArray(data) && data.length > 0) {
          await client.query(
            `
              insert into tasks (id, user_id, text, completed, date, priority, created_at, completed_at)
              select 
                (t->>'id')::uuid, 
                $1::uuid, 
                (t->>'text'), 
                (t->>'completed')::boolean, 
                (t->>'date')::date, 
                (t->>'priority')::integer,
                case when t->>'createdAt' is not null then (t->>'createdAt')::timestamp else now() end,
                case when t->>'completedAt' is not null then (t->>'completedAt')::timestamp else null end
              from jsonb_array_elements($2::jsonb) as t
            `,
            [profile.profileId, JSON.stringify(data)],
          );
        }
        await client.query("commit");
        return { updatedAt: new Date().toISOString() };
      }
      case "timer": {
        const updatedAt = new Date().toISOString();
        await client.query(
          `
            insert into timer_state (
              user_id,
              is_running,
              elapsed_acc,
              start_time,
              category,
              col_name,
              session_start_clock,
              break_data,
              updated_at
            )
            values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
            on conflict (user_id)
            do update set
              is_running = excluded.is_running,
              elapsed_acc = excluded.elapsed_acc,
              start_time = excluded.start_time,
              category = excluded.category,
              col_name = excluded.col_name,
              session_start_clock = excluded.session_start_clock,
              break_data = excluded.break_data,
              updated_at = excluded.updated_at
          `,
          [
            profile.profileId,
            data?.isRunning === true,
            Number(data?.elapsedAcc || 0),
            data?.startTime ? new Date(data.startTime).toISOString() : null,
            data?.category || null,
            data?.colName || "",
            data?.sessionStartClock
              ? new Date(data.sessionStartClock).toISOString()
              : null,
            data?.activeBreak ? JSON.stringify(data.activeBreak) : null,
            updatedAt,
          ],
        );
        await client.query("commit");
        return { updatedAt };
      }
      default:
        throw new Error(`Unsupported vault: ${vault}`);
    }
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function clearTimerState(profile: AuthenticatedProfile): Promise<void> {
  const pool = getPool();
  await pool.query(
    `
      update timer_state
      set
        is_running = false,
        elapsed_acc = 0,
        start_time = null,
        category = null,
        col_name = '',
        session_start_clock = null,
        break_data = null,
        updated_at = now()
      where user_id = $1
    `,
    [profile.profileId],
  );
}
