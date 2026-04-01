/**
 * Supabase service layer
 *
 * Handles all direct Supabase API calls using the Sync ID pattern.
 * Each function is a thin wrapper around upsert/select with proper typing.
 */

import { supabaseClient } from '@/config/supabase';
import { SUPABASE_TABLES } from '@/config/constants';
import type { TrackerDay, Settings } from '@/types/tracker.types';
import type { StudyTask } from '@/types/task.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import type { ActiveTimer } from '@/types/timer.types';
import type { GlobalProfile } from '@/types/profile.types';
import { getCurrentUserId } from '@/services/auth.service';

// ─── Helpers ─────────────────────────────────────────────────

function isSupabaseReady(): boolean {
  return supabaseClient !== null;
}

export function updateSyncStatus(status: 'syncing' | 'synced' | 'error' | 'offline'): void {
  const el = document.getElementById('syncStatus');
  if (!el) return;

  const config: Record<string, { text: string; color: string }> = {
    syncing: { text: '🔄 Syncing...',   color: '#3498db' },
    synced:  { text: '✅ Synced',        color: '#2ecc71' },
    error:   { text: '❌ Sync Error',    color: '#e74c3c' },
    offline: { text: '📶 Offline',       color: '#f39c12' },
  };

  const c = config[status];
  el.textContent = c.text;
  el.style.color = c.color;
  if (status === 'error') {
    el.title = 'Check console for details or verify project credentials.';
  }
}

/** Generic upsert to a Supabase table (keyed by sync_id) */
async function upsertToSupabase(table: string, payload: Record<string, unknown>): Promise<{ data?: unknown; error?: unknown }> {
  if (!isSupabaseReady()) return { error: 'Supabase client not initialized' };

  const syncId = getCurrentUserId();
  if (!syncId) return { error: 'No Sync ID established' };

  payload.sync_id = syncId;
  updateSyncStatus('syncing');

  const { data, error } = await supabaseClient!
    .from(table)
    .upsert(payload, { onConflict: 'sync_id' })
    .select();

  if (error) {
    console.error(`Error saving to ${table}:`, error);
    updateSyncStatus('error');
    return { error };
  }

  updateSyncStatus('synced');
  return { data };
}

/** Generic fetch from a Supabase table (filtered by sync_id) */
async function fetchFromSupabase(table: string): Promise<{ data?: Record<string, unknown> | null; error?: unknown }> {
  if (!isSupabaseReady()) return { error: 'Supabase client not initialized' };

  const syncId = getCurrentUserId();
  if (!syncId) return { error: 'No Sync ID established' };

  updateSyncStatus('syncing');

  const { data, error } = await supabaseClient!
    .from(table)
    .select('*')
    .eq('sync_id', syncId)
    .maybeSingle();

  if (error) {
    console.error(`Error loading from ${table}:`, error);
    updateSyncStatus('error');
    return { error };
  }

  updateSyncStatus('synced');
  return { data };
}

// ─── Tracker Data ────────────────────────────────────────────

export async function saveTrackerDataCloud(data: TrackerDay[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.TRACKER_DATA, { data, updated_at: new Date() });
}

export async function loadTrackerDataCloud(): Promise<TrackerDay[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.TRACKER_DATA);
  if (result?.data?.data) return result.data.data as TrackerDay[];
  return null;
}

// ─── Settings ────────────────────────────────────────────────

export async function saveSettingsCloud(settings: Settings): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.SETTINGS, { data: settings, updated_at: new Date() });
}

export async function loadSettingsCloud(): Promise<Settings | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.SETTINGS);
  if (result?.data?.data) return result.data.data as Settings;
  return null;
}

// ─── Routines ────────────────────────────────────────────────

export async function saveRoutinesCloud(routines: RoutineItem[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.ROUTINES, { data: routines, updated_at: new Date() });
}

export async function loadRoutinesCloud(): Promise<RoutineItem[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.ROUTINES);
  if (result?.data?.data) return result.data.data as RoutineItem[];
  return null;
}



// ─── Bookmarks ───────────────────────────────────────────────

export async function saveBookmarksCloud(bookmarks: Bookmark[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.BOOKMARKS, { data: bookmarks, updated_at: new Date() });
}

export async function loadBookmarksCloud(): Promise<Bookmark[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.BOOKMARKS);
  if (result?.data?.data) return result.data.data as Bookmark[];
  return null;
}

// ─── Routine History ─────────────────────────────────────────

export async function saveRoutineHistoryCloud(history: RoutineHistory): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.ROUTINE_HISTORY, { data: history, updated_at: new Date() });
}

export async function loadRoutineHistoryCloud(): Promise<RoutineHistory | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.ROUTINE_HISTORY);
  if (result?.data?.data) return result.data.data as RoutineHistory;
  return null;
}

// ─── Timer State ─────────────────────────────────────────────

export async function saveTimerStateCloud(state: ActiveTimer): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.TIMER_STATE, { data: state, updated_at: new Date() });
}

export async function loadTimerStateCloud(): Promise<ActiveTimer | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.TIMER_STATE);
  if (result?.data?.data) return result.data.data as ActiveTimer;
  return null;
}

// ─── Routine Reset ───────────────────────────────────────────

export async function saveRoutineResetCloud(reset: string): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.ROUTINE_RESET, { data: reset, updated_at: new Date() });
}

export async function loadRoutineResetCloud(): Promise<string | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.ROUTINE_RESET);
  if (result?.data?.data) return result.data.data as string;
  return null;
}

// ─── Tasks ───────────────────────────────────────────────────

export async function saveTasksCloud(tasks: StudyTask[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.TASKS, { data: tasks, updated_at: new Date() });
}

export async function loadTasksCloud(): Promise<StudyTask[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.TASKS);
  if (result?.data?.data) return result.data.data as StudyTask[];
  return null;
}

// ─── Global Leaderboard (World Stage) ────────────────────────

/** Broadcasts high-level stats to the public leaderboard table */
export async function broadcastGlobalStats(profile: Partial<GlobalProfile>): Promise<void> {
  if (!isSupabaseReady()) return;
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const payload = {
    ...profile,
    sync_id: syncId,
    last_active: new Date().toISOString()
  };

  await supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .upsert(payload, { onConflict: 'sync_id' });
}

/** Fetches the top 10 learners for the World Stage */
export async function fetchLeaderboard(): Promise<GlobalProfile[]> {
  if (!isSupabaseReady()) return [];

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .select('*')
    .order('total_hours', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching World Stage:', error);
    return [];
  }

  return (data || []) as GlobalProfile[];
}

/** Loads the profile for a specific user from the cloud */
export async function loadUserProfileCloud(syncId?: string): Promise<GlobalProfile | null> {
  if (!isSupabaseReady()) return null;
  const targetId = syncId || getCurrentUserId();
  if (!targetId) return null;

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .select('*')
    .eq('sync_id', targetId)
    .maybeSingle();

  if (error) {
    console.error('Error loading cloud profile:', error);
    return null;
  }
  return data as GlobalProfile;
}

/** Deletes all data for a specific sync_id (used during migration) */
export async function deleteOldSyncIdData(oldSyncId: string): Promise<void> {
  if (!isSupabaseReady()) return;
  
  const tables = Object.values(SUPABASE_TABLES);
  
  for (const table of tables) {
    await supabaseClient!
      .from(table)
      .delete()
      .eq('sync_id', oldSyncId);
  }
}

/** Transfers record from one sync_id to another */
export async function transferCloudRecord(table: string, oldSyncId: string, newSyncId: string): Promise<void> {
  if (!isSupabaseReady()) return;

  const { data } = await supabaseClient!
    .from(table)
    .select('*')
    .eq('sync_id', oldSyncId)
    .maybeSingle();

  if (data) {
    const payload = { ...data, sync_id: newSyncId };
    delete payload.id; // Let Supabase gen new ID or handle it
    await supabaseClient!.from(table).upsert(payload, { onConflict: 'sync_id' });
  }
}

/** Checks if a Username is already in use by another Sync ID */
export async function isUsernameTaken(username: string, excludeSyncId?: string | null): Promise<boolean> {
  if (!isSupabaseReady()) return false;

  let query = supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .select('display_name')
    .ilike('display_name', username.trim()); // Case-insensitive match

  if (excludeSyncId) {
    query = query.neq('sync_id', excludeSyncId);
  }

  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.error('Error checking username uniqueness:', error);
    return false;
  }

  return !!data;
}

/** Verifies if a user exists with the exact display_name (User ID) and sync_id (Password) */
export async function verifyUserCredentials(username: string, syncId: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .select('display_name')
    .ilike('display_name', username.trim())
    .eq('sync_id', syncId.trim())
    .maybeSingle();
    
  if (error || !data) {
    if (error) console.error('Credential verification error:', error);
    return false;
  }
  
  return true;
}
