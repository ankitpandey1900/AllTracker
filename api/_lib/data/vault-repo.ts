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
  type: "daily" | "weekly" | null;
  week_of: string | null;
  updated_at: string | null;
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
    type: row.type === "weekly" ? "weekly" : "daily",
    weekOf: row.week_of || undefined,
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
        "select log_date as date, study_hours, problems_solved as \"problemsSolved\", completed, topics, project, updated_at from daily_trackers where user_id = $1 order by log_date asc",
        [profile.profileId]
      );
      
      const data = rows.map(r => ({
        date: r.date,
        studyHours: r.study_hours || [],
        problemsSolved: r.problemsSolved || 0,
        completed: r.completed || false,
        topics: r.topics || '',
        project: r.project || ''
      }));

      const updatedAt = rows.length > 0 ? rows[rows.length - 1].updated_at : null;

      return {
        data,
        updatedAt
      };
    }
    case "settings": {
      const prefsRes = await pool.query(
        "select * from user_preferences where user_id = $1 limit 1",
        [profile.profileId]
      );
      
      const phasesRes = await pool.query(
        "select id, name, start_date as \"startDate\", end_date as \"endDate\", columns from study_phases where user_id = $1 and deleted_at is null order by created_at asc",
        [profile.profileId]
      );
      
      const badgesRes = await pool.query(
        "select badge_id from user_badges where user_id = $1",
        [profile.profileId]
      );

      let data: any = {};
      let updatedAt = null;

      if (prefsRes.rows.length > 0) {
        const p = prefsRes.rows[0];
        data = {
          startDate: p.start_date,
          endDate: p.end_date,
          columns: p.columns || [],
          theme: p.theme,
          timerStyle: p.timer_style,
          timerFont: p.timer_font,
          uiFont: p.ui_font,
          beastMode: p.beast_mode,
          ambientSound: p.ambient_sound,
          ambientVolume: p.ambient_volume,
          timezone: p.timezone,
          maamuModel: p.maamu_model,
          groqApiKey: p.groq_api_key,
          lastRoutineReset: p.last_routine_reset,
          maamuCompact: p.maamu_compact,
          maamuTemplatesCollapsed: p.maamu_templates_collapsed,
          maamuTemplateFavs: p.maamu_template_favs || [],
          maamuTemplateCategory: p.maamu_template_category,
          sessionGoal: p.session_goal
        };
        updatedAt = p.updated_at;
      }
      
      data.customRanges = phasesRes.rows;
      data.unlockedBadges = badgesRes.rows.map(b => b.badge_id);

      return {
        data,
        updatedAt
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
          select id, text, completed, date, priority, created_at, completed_at, type, week_of, updated_at
          from tasks
          where user_id = $1 and deleted_at is null
          order by created_at asc
        `,
        [profile.profileId],
      );
      const updatedAt =
        rows.length > 0 ? rows[rows.length - 1].updated_at || rows[rows.length - 1].created_at || null : null;
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
        const incomingData = Array.isArray(data) ? data : [];
        
        if (incomingData.length > 0) {
          // Batch upsert to daily_trackers
          await client.query(
            `
              insert into daily_trackers (user_id, log_date, study_hours, problems_solved, completed, topics, project, updated_at)
              select 
                $1::uuid, 
                (r->>'date'), 
                case when r->'studyHours' is not null then array(select jsonb_array_elements_text(r->'studyHours')::numeric) else '{}'::numeric[] end,
                COALESCE((r->>'problemsSolved')::integer, 0),
                COALESCE((r->>'completed')::boolean, false),
                COALESCE((r->>'topics'), ''),
                COALESCE((r->>'project'), ''),
                $3
              from jsonb_array_elements($2::jsonb) as r
              on conflict (user_id, log_date)
              do update set
                study_hours = excluded.study_hours,
                problems_solved = excluded.problems_solved,
                completed = excluded.completed,
                topics = excluded.topics,
                project = excluded.project,
                updated_at = excluded.updated_at
            `,
            [profile.profileId, JSON.stringify(incomingData), updatedAt],
          );
        }
        await client.query("commit");
        return { updatedAt };
      }
      case "settings": {
        const incoming = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
        const updatedAt = new Date().toISOString();
        
        // 1. Upsert Preferences
        await client.query(
          `
            insert into user_preferences (
              user_id, start_date, end_date, columns, theme, timer_style, timer_font, ui_font, beast_mode, 
              ambient_sound, ambient_volume, timezone, maamu_model, groq_api_key, 
              last_routine_reset, maamu_compact, maamu_templates_collapsed, 
              maamu_template_favs, maamu_template_category, session_goal, updated_at
            )
            values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19, $20, $21)
            on conflict (user_id)
            do update set
              start_date = excluded.start_date, end_date = excluded.end_date, columns = excluded.columns,
              theme = excluded.theme, timer_style = excluded.timer_style, timer_font = excluded.timer_font, 
              ui_font = excluded.ui_font, beast_mode = excluded.beast_mode, ambient_sound = excluded.ambient_sound, 
              ambient_volume = excluded.ambient_volume, timezone = excluded.timezone, maamu_model = excluded.maamu_model, 
              groq_api_key = excluded.groq_api_key, last_routine_reset = excluded.last_routine_reset, 
              maamu_compact = excluded.maamu_compact, maamu_templates_collapsed = excluded.maamu_templates_collapsed, 
              maamu_template_favs = excluded.maamu_template_favs, maamu_template_category = excluded.maamu_template_category, 
              session_goal = excluded.session_goal, updated_at = excluded.updated_at
          `,
          [
            profile.profileId, incoming.startDate, incoming.endDate, JSON.stringify(incoming.columns || []),
            incoming.theme, incoming.timerStyle, incoming.timerFont, incoming.uiFont, 
            incoming.beastMode, incoming.ambientSound, incoming.ambientVolume, incoming.timezone, 
            incoming.maamuModel, incoming.groqApiKey, incoming.lastRoutineReset, incoming.maamuCompact, 
            incoming.maamuTemplatesCollapsed, JSON.stringify(incoming.maamuTemplateFavs || []), 
            incoming.maamuTemplateCategory, incoming.sessionGoal, updatedAt
          ]
        );

        // 2. Study phases are synchronized through record-level endpoints.
        // Never delete them as a side effect of saving unrelated settings.

        // 3. Refresh Badges
        await client.query("delete from user_badges where user_id = $1", [profile.profileId]);
        if (Array.isArray(incoming.unlockedBadges) && incoming.unlockedBadges.length > 0) {
          await client.query(
            `
              insert into user_badges (user_id, badge_id)
              select $1::uuid, (r->>0)
              from jsonb_array_elements($2::jsonb) as r
            `,
            [profile.profileId, JSON.stringify(incoming.unlockedBadges)]
          );
        }

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
        if (data && Array.isArray(data) && data.length > 0) {
          await client.query(
            `
              insert into tasks (id, user_id, text, completed, date, priority, created_at, completed_at, type, week_of, updated_at, deleted_at)
              select 
                (t->>'id')::uuid, 
                $1::uuid, 
                (t->>'text'), 
                (t->>'completed')::boolean, 
                (t->>'date')::date, 
                (t->>'priority')::integer,
                case when t->>'createdAt' is not null then to_timestamp((t->>'createdAt')::numeric / 1000) else now() end,
                case when t->>'completedAt' is not null then to_timestamp((t->>'completedAt')::numeric / 1000) else null end,
                case when t->>'type' = 'weekly' then 'weekly' else 'daily' end,
                case when t->>'weekOf' is not null then (t->>'weekOf')::date else null end,
                now(),
                null
              from jsonb_array_elements($2::jsonb) as t
              on conflict (id) do update set
                text = excluded.text,
                completed = excluded.completed,
                date = excluded.date,
                priority = excluded.priority,
                completed_at = excluded.completed_at,
                type = excluded.type,
                week_of = excluded.week_of,
                updated_at = excluded.updated_at,
                deleted_at = null
              where tasks.user_id = excluded.user_id
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

export async function upsertPhase(
  profile: AuthenticatedProfile,
  phase: Record<string, unknown>,
): Promise<void> {
  if (
    typeof phase.id !== "string" ||
    typeof phase.startDate !== "string" ||
    typeof phase.endDate !== "string" ||
    !Array.isArray(phase.columns)
  ) {
    throw new Error("Invalid phase payload");
  }

  const pool = getPool();
  await pool.query(
    `
      insert into study_phases (id, user_id, name, start_date, end_date, columns, updated_at, deleted_at)
      values ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, now(), null)
      on conflict (id) do update set
        name = excluded.name,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        columns = excluded.columns,
        updated_at = now(),
        deleted_at = null
      where study_phases.user_id = excluded.user_id
    `,
    [
      phase.id,
      profile.profileId,
      typeof phase.name === "string" ? phase.name : "",
      phase.startDate,
      phase.endDate,
      JSON.stringify(phase.columns),
    ],
  );
  await pool.query("update user_preferences set updated_at = now() where user_id = $1", [profile.profileId]);
}

export async function deletePhase(profile: AuthenticatedProfile, phaseId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update study_phases set deleted_at = now(), updated_at = now() where id = $1::uuid and user_id = $2::uuid",
    [phaseId, profile.profileId],
  );
  await pool.query("update user_preferences set updated_at = now() where user_id = $1", [profile.profileId]);
}

export async function upsertTask(
  profile: AuthenticatedProfile,
  task: Record<string, unknown>,
): Promise<void> {
  if (typeof task.id !== "string" || typeof task.text !== "string" || typeof task.date !== "string") {
    throw new Error("Invalid task payload");
  }

  const priority = Number(task.priority || 2);
  const taskType = task.type === "weekly" ? "weekly" : "daily";
  const pool = getPool();
  await pool.query(
    `
      insert into tasks (id, user_id, text, completed, date, priority, created_at, completed_at, type, week_of, updated_at, deleted_at)
      values ($1::uuid, $2::uuid, $3, $4, $5::date, $6, to_timestamp($7 / 1000.0), $8, $9, $10::date, now(), null)
      on conflict (id) do update set
        text = excluded.text,
        completed = excluded.completed,
        date = excluded.date,
        priority = excluded.priority,
        completed_at = excluded.completed_at,
        type = excluded.type,
        week_of = excluded.week_of,
        updated_at = now(),
        deleted_at = null
      where tasks.user_id = excluded.user_id
    `,
    [
      task.id,
      profile.profileId,
      task.text.trim(),
      task.completed === true,
      task.date,
      Math.min(3, Math.max(1, Number.isFinite(priority) ? priority : 2)),
      Number(task.createdAt || Date.now()),
      task.completedAt ? new Date(Number(task.completedAt)).toISOString() : null,
      taskType,
      typeof task.weekOf === "string" && task.weekOf ? task.weekOf : null,
    ],
  );
}

export async function deleteTask(profile: AuthenticatedProfile, taskId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update tasks set deleted_at = now(), updated_at = now() where id = $1::uuid and user_id = $2::uuid",
    [taskId, profile.profileId],
  );
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
