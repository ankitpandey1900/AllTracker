/**
 * Supabase service layer
 *
 * Handles all direct Supabase API calls using the Sync ID pattern.
 * Each function is a thin wrapper around upsert/select with proper typing.
 */

import { supabaseClient } from '@/config/supabase';
import { SUPABASE_TABLES } from '@/config/constants';
import type { TrackerDay, Settings } from '@/types/tracker.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import type { ActiveTimer } from '@/types/timer.types';
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
