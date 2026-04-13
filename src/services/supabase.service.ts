/**
 * Handles all communication with Supabase (the cloud database).
 * 
 * It saves and loads your study data, routines, and leaderboard 
 * stats so you don't lose anything if you change devices.
 */

import { supabaseClient } from '@/config/supabase';
import { SUPABASE_TABLES } from '@/config/constants';
import type { TrackerDay, Settings } from '@/types/tracker.types';
import type { StudyTask } from '@/types/task.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import type { ActiveTimer } from '@/types/timer.types';
import type { GlobalProfile, StudySession } from '@/types/profile.types';
import { getCurrentUserId } from '@/services/auth.service';
import { log } from '@/utils/logger.utils';

// --- Setup Helpers ---

function isSupabaseReady(): boolean {
  return supabaseClient !== null;
}

/** 
 * 📡 SYNC INDICATOR SERVICE
 * Manages the connection status icons across the Dashboard and Focus HUD.
 */
export const SyncIndicator = {
  update(status: 'syncing' | 'synced' | 'error' | 'offline'): void {
    const el = document.getElementById('syncStatus');
    const hudIcon = document.getElementById('timerSyncStatus');
    
    const config: Record<string, { text: string; color: string; isLive: boolean }> = {
      syncing: { text: '🔄 Syncing...',   color: '#3498db', isLive: true },
      synced:  { text: '✅ Synced',        color: '#2ecc71', isLive: true },
      error:   { text: '❌ Sync Error',    color: '#e74c3c', isLive: false },
      offline: { text: '📶 Offline',       color: '#f39c12', isLive: false },
    };

    const c = config[status];

    // Update Main Dashboard Text
    if (el) {
      el.textContent = c.text;
      el.style.color = c.color;
      if (status === 'error') {
        el.title = 'Check console for details or verify project credentials.';
      }
    }

    // Update HUD Cloud Icon
    if (hudIcon) {
      if (c.isLive) {
        hudIcon.classList.add('sync-live');
        hudIcon.classList.remove('sync-offline');
        hudIcon.title = status === 'syncing' ? 'Syncing with Cloud...' : 'Cloud Sync Active';
      } else {
        hudIcon.classList.add('sync-offline');
        hudIcon.classList.remove('sync-live');
        hudIcon.title = status === 'error' ? 'Connection Error' : 'Offline: Local Only';
      }
    }
  }
};

/** Replaces legacy flat function with the new Service Object */
export function updateSyncStatus(status: 'syncing' | 'synced' | 'error' | 'offline'): void {
  SyncIndicator.update(status);
}

// --- Schema Cache ---
let cachedUserId: string | null = null;
let cachedHandle: string | null = null;

/** Retrieves the Dual-Key Identity (UUID + Handle) for the current operative */
async function getUserContext(): Promise<{ id: string; handle: string } | null> {
  if (cachedUserId && cachedHandle) return { id: cachedUserId, handle: cachedHandle };
  if (!isSupabaseReady()) return null;

  const syncId = getCurrentUserId();
  if (!syncId) return null;

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('id, handle')
    .eq('sync_id', syncId)
    .maybeSingle();

  if (error || !data) return null;
  cachedUserId = data.id;
  cachedHandle = data.handle;
  return { id: data.id, handle: data.handle };
}

/** Generic function to save data to any vault (using user_id + handle) */
async function upsertToVault(table: string, payload: any): Promise<{ error?: unknown }> {
  if (!isSupabaseReady()) return { error: 'Supabase client not initialized' };

  const ctx = await getUserContext();
  if (!ctx) return { error: 'No User Context found' };

  updateSyncStatus('syncing');

  const { error } = await supabaseClient!
    .from(table)
    .upsert({ user_id: ctx.id, handle: ctx.handle, data: payload, updated_at: new Date() }, { onConflict: 'user_id' });

  if (error) {
    log.error(`Vault Sync Failure [${table}]`, error);
    updateSyncStatus('error');
    return { error };
  }

  updateSyncStatus('synced');
  return {};
}

/** Generic function to get data from any vault (filtered by user_id) */
async function fetchFromVault(table: string): Promise<{ data?: any | null; updatedAt?: string; error?: unknown }> {
  if (!isSupabaseReady()) return { error: 'Supabase client not initialized' };

  const ctx = await getUserContext();
  if (!ctx) return { error: 'No User context found' };

  updateSyncStatus('syncing');

  const { data, error } = await supabaseClient!
    .from(table)
    .select('*')
    .eq('user_id', ctx.id)
    .maybeSingle();

  if (error) {
    log.error(`Vault Retrieval Failure [${table}]`, error);
    updateSyncStatus('error');
    return { error };
  }

  updateSyncStatus('synced');
  return { data: data?.data, updatedAt: data?.updated_at };
}

// --- Tracker Data ---

export async function saveTrackerDataCloud(data: TrackerDay[]): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.TRACKER, data);
}

export async function loadTrackerDataCloud(): Promise<{ data: TrackerDay[], updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.TRACKER);
  if (result.data) return { data: result.data as TrackerDay[], updatedAt: result.updatedAt || null };
  return null;
}

// --- Settings Sync ---

export async function saveSettingsCloud(settings: Settings): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.SETTINGS, settings);
}

export async function loadSettingsCloud(): Promise<{ data: Settings, updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.SETTINGS);
  if (result.data) return { data: result.data as Settings, updatedAt: result.updatedAt || null };
  return null;
}

// --- Routine Sync ---

export async function saveRoutinesCloud(routines: RoutineItem[]): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.ROUTINES, routines);
}

export async function loadRoutinesCloud(): Promise<{ data: RoutineItem[], updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.ROUTINES);
  if (result.data) return { data: result.data as RoutineItem[], updatedAt: result.updatedAt || null };
  return null;
}

// --- Bookmark Sync ---

export async function saveBookmarksCloud(bookmarks: Bookmark[]): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.BOOKMARKS, bookmarks);
}

export async function loadBookmarksCloud(): Promise<{ data: Bookmark[], updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.BOOKMARKS);
  if (result.data) return { data: result.data as Bookmark[], updatedAt: result.updatedAt || null };
  return null;
}

// --- History Sync ---

export async function saveRoutineHistoryCloud(history: RoutineHistory): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.HISTORY, history);
}

export async function loadRoutineHistoryCloud(): Promise<{ data: RoutineHistory, updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.HISTORY);
  if (result.data) return { data: result.data as RoutineHistory, updatedAt: result.updatedAt || null };
  return null;
}

// --- Timer State Sync ---

export async function saveTimerStateCloud(state: ActiveTimer): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.TIMER, state);
}

export async function loadTimerStateCloud(): Promise<{ data: ActiveTimer, updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.TIMER);
  if (result.data) return { data: result.data as ActiveTimer, updatedAt: result.updatedAt || null };
  return null;
}

// --- Routine Resets (Merged into settings or routines if needed, but keeping for now) ---
export async function saveRoutineResetCloud(reset: string): Promise<void> {}
export async function loadRoutineResetCloud(): Promise<string | null> { return null; }

// --- Task List ---

export async function saveTasksCloud(tasks: StudyTask[]): Promise<void> {
  await upsertToVault(SUPABASE_TABLES.TASKS, tasks);
}

export async function loadTasksCloud(): Promise<{ data: StudyTask[], updatedAt: string | null } | null> {
  const result = await fetchFromVault(SUPABASE_TABLES.TASKS);
  if (result.data) return { data: result.data as StudyTask[], updatedAt: result.updatedAt || null };
  return null;
}

// --- Realtime WebSocket Gateway ---

export function subscribeToRealtimeTelemetry(
  callback: (payload: any) => void
): { unsubscribe: () => void } {
  if (!isSupabaseReady()) return { unsubscribe: () => {} };

  // Listen to operative_stats (focus status, total_hours) and operative_profiles (avatar, handle changes)
  // These are public tables — any row change fires a leaderboard refresh
  const channelId = `world_stage_live_feed_${Math.random().toString(36).substring(7)}`;
  const channel = supabaseClient!
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operative_stats' },
      (payload) => { callback(payload); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operative_profiles' },
      (payload) => { callback(payload); }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        log.success(`REAL-TIME HUD ACTIVE [${channelId.slice(0, 8)}]`);
      } else if (status === 'CHANNEL_ERROR') {
        log.error(`REAL-TIME HUD ERROR [${channelId.slice(0, 8)}]`, err);
      }
    });

  return {
    unsubscribe: () => {
      supabaseClient!.removeChannel(channel);
    }
  };
}


/**
 * ⚡ FULL-STACK DATA SYNC GATEWAY
 * Subscribes to all private user data tables (Tracker, Tasks, Routines, etc.)
 * Filtered specifically for the current user's profile_id.
 */
export async function subscribeToUserDataSync(
  callback: (payload: any) => void
): Promise<{ unsubscribe: () => void }> {
  if (!isSupabaseReady()) return { unsubscribe: () => {} };

  const ctx = await getUserContext();
  if (!ctx) {
    console.warn('📡 SYNC DELAY: User context not yet established. Realtime sync pending...');
    return { unsubscribe: () => {} };
  }

    log.info(`BROADCAST MATRIX: Monitoring private data channel for pilot ${ctx.handle} (${ctx.id.slice(0, 8)}).`, '📡');

  const channel = supabaseClient!
    .channel(`user_data_sync_${ctx.id}`)
    // Listen to changes in all relevant user tables using the new Granular Vaults
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.TRACKER, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.SETTINGS, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.ROUTINES, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.BOOKMARKS, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.TIMER, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.TASKS, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.HISTORY, filter: `user_id=eq.${ctx.id}` }, (p) => callback(p))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
         log.info('REALTIME DATA SYNC ESTABLISHED: Zero-refresh mode active.', '🔗');
      } else if (status === 'CLOSED') {
         log.info('REALTIME DATA SYNC CLOSED.', '🔗');
      } else if (status === 'CHANNEL_ERROR') {
         log.error('REALTIME DATA SYNC ERROR: Automatic retry initiated.');
      }
    });

  return {
    unsubscribe: () => {
      supabaseClient!.removeChannel(channel);
    }
  };
}

// --- World Stage Logic (Leaderboard) ---

/** Sends your stats (total hours, etc.) to the global leaderboard */
export async function broadcastGlobalStats(profile: Partial<GlobalProfile>): Promise<void> {
  if (!isSupabaseReady()) return;
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const ctx = await getUserContext();
  if (!ctx) return;

  // 1. Update Telemetry (operative_stats)
  const pulsePayload = {
    user_id: ctx.id,
    handle: ctx.handle,
    total_hours: Number(profile.total_hours || 0),
    today_hours: Number(profile.today_hours || 0),
    last_active: new Date().toISOString(),
    is_focusing: profile.is_focusing_now === true,
    focus_subject: profile.current_focus_subject || 'IDLE',
    current_rank: profile.current_rank || 'RECRUIT',
    updated_at: new Date().toISOString()
  };

  const { error: pulseErr } = await supabaseClient!
    .from(SUPABASE_TABLES.STATS)
    .upsert(pulsePayload, { onConflict: 'user_id' });

  if (pulseErr) {
    log.error('STATS PULSE ERROR', pulseErr);
  }

  // 2. Update Registry (operative_profiles) - Only if identity data changed
  // 🛡️ DATA INTEGRITY GUARD: Only update fields that are actually provided and non-empty
  if (profile.display_name || profile.avatar || profile.nation || profile.User_name) {
    const registryPayload: any = { id: ctx.id };
    
    if (profile.display_name) registryPayload.handle = profile.display_name;
    if (profile.User_name) registryPayload.real_name = profile.User_name;
    if (profile.avatar) registryPayload.avatar = profile.avatar;
    if (profile.nation) registryPayload.nation = profile.nation;
    if (profile.dob) registryPayload.dob = profile.dob;
    if (profile.phone_number) registryPayload.phone = profile.phone_number;
    if (profile.email) registryPayload.email = profile.email;
    if (profile.is_public !== undefined) registryPayload.is_public = profile.is_public;

    const { error: regErr } = await supabaseClient!
      .from(SUPABASE_TABLES.PROFILES)
      .update(registryPayload)
      .eq('id', ctx.id);
    
    if (regErr) {
      log.error('REGISTRY SYNC ERROR', regErr);
    }
  }
  log.info(`Broadcasting Sync: Pilot ${ctx.handle} metadata secured.`);
}

/** Logs a specific study session into the persistent history table */
export async function logStudySessionCloud(duration: number, subject: string, startTime?: Date, note?: string): Promise<void> {
  if (!isSupabaseReady()) return;
  const ctx = await getUserContext();
  if (!ctx) return;

  const logDate = new Date().toISOString().split('T')[0];

  // ⚡ TACTICAL SEQUENCING: Count previous sessions for this subject today
  const { count } = await supabaseClient!
    .from(SUPABASE_TABLES.SESSIONS)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.id)
    .eq('subject', subject || 'GENERAL')
    .eq('log_date', logDate);

  const { error } = await supabaseClient!
    .from(SUPABASE_TABLES.SESSIONS)
    .insert({
      user_id: ctx.id,
      handle: ctx.handle,
      duration: Number(duration),
      subject: subject || 'GENERAL',
      note: note || '',
      start_at: startTime ? startTime.toISOString() : new Date(Date.now() - (duration * 3600000)).toISOString(),
      end_at: new Date().toISOString(),
      log_date: logDate,
      session_number: (count || 0) + 1
    });

  if (error) {
    log.error('SESSION LOG ERROR', error);
  } else {
    log.success(`SESSION LOGGED: S#${(count || 0) + 1} [${subject}]`);
  }
}

/** Professional Migration Engine: Moves old local history to the Cloud Table */
export async function migrateLocalHistoryToCloud(logs: any[]): Promise<{ success: boolean; count: number }> {
  if (!isSupabaseReady() || !logs || logs.length === 0) return { success: false, count: 0 };
  
  const ctx = await getUserContext();
  if (!ctx) return { success: false, count: 0 };

  // 🔍 DUPLICATE GUARD: Fetch existing sessions for this range to prevent "Double-Sync"
  const { data: existing } = await supabaseClient!
    .from(SUPABASE_TABLES.SESSIONS)
    .select('start_at, subject')
    .eq('user_id', ctx.id);

  const existingMap = new Set((existing || []).map(e => `${e.subject}_${e.start_at}`));

  // Map local SessionLog to Supabase StudySession
  const rows = logs
    .map(log => {
      const endTime = new Date(log.date);
      const durationHrs = Number(log.duration) || 0;
      const startTime = new Date(endTime.getTime() - (durationHrs * 3600000));
      const subject = log.categoryName || log.subject || 'LEGACY';
      const startAtStr = startTime.toISOString();

      // Skip if exactly the same session already exists in cloud
      if (existingMap.has(`${subject}_${startAtStr}`)) return null;

      return {
        user_id: ctx.id,
        handle: ctx.handle,
        duration: durationHrs,
        subject,
        note: log.notes || log.note || '',
        start_at: startAtStr,
        end_at: endTime.toISOString(),
        log_date: endTime.toISOString().split('T')[0],
        session_number: 1 
      };
    })
    .filter(row => row !== null); // Remove duplicates

  if (rows.length === 0) {
    log.info('MIGRATION: Cloud vaults already synchronized. No sequence required.');
    return { success: true, count: 0 };
  }

  // Perform bulk insert
  const { error } = await supabaseClient!
    .from(SUPABASE_TABLES.SESSIONS)
    .insert(rows);

  if (error) {
    log.error('MIGRATION SEQUENCE ERROR', error);
    return { success: false, count: 0 };
  }

  log.success(`MIGRATION SUCCESS: ${rows.length} sessions moved to immutable storage.`);
  return { success: true, count: rows.length };
}

/** Fetches personal history for the 'History' tab */
export async function fetchMySessionsCloud(): Promise<StudySession[]> {
  if (!isSupabaseReady()) return [];
  const ctx = await getUserContext();
  if (!ctx) return [];

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.SESSIONS)
    .select('*')
    .eq('user_id', ctx.id)
    .order('end_at', { ascending: false })
    .limit(300); // 300 sessions limit for tab performance

  if (error) {
    log.error('History Retrieval Failure', error);
    return [];
  }

  return (data || []) as StudySession[];
}


/** Gets all operatives for the World Stage leaderboard */
export async function fetchLeaderboard(): Promise<GlobalProfile[]> {
  if (!isSupabaseReady()) return [];

  // Start from PROFILES to ensure we see everyone (Left Join with Stats)
  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select(`
      handle,
      real_name,
      avatar,
      nation,
      is_public,
      operative_stats (
        total_hours,
        today_hours,
        current_rank,
        last_active,
        is_focusing,
        focus_subject
      )
    `)
    .limit(1000);

  if (error) {
    log.error('World Stage Retrieval Failure', error);
    return [];
  }

  const results = (data || []).map((profile: any) => {
    // PostgREST 1-to-1 joins sometimes return an object, or an array if 1-to-many. Handle both safely.
    let stats = profile.operative_stats || {};
    if (Array.isArray(stats)) {
      stats = stats[0] || {};
    }
    return {
      display_name: profile.handle || 'Unknown',
      User_name: profile.real_name,
      avatar: profile.avatar || '👨‍🚀',
      nation: profile.nation || 'Global',
      total_hours: stats.total_hours || 0,
      today_hours: stats.today_hours || 0,
      current_rank: stats.current_rank || 'RECRUIT',
      is_focusing_now: stats.is_focusing || false,
      last_active: stats.last_active,
      current_focus_subject: stats.focus_subject,
      is_public: profile.is_public !== false
    };
  });

  // Sort by total hours descending
  return results.sort((a, b) => b.total_hours - a.total_hours) as any[];
}

/** Loads the profile for a specific user from the cloud */
export async function loadUserProfileCloud(syncId?: string): Promise<GlobalProfile | null> {
  if (!isSupabaseReady()) return null;
  const targetSyncId = syncId || getCurrentUserId();
  if (!targetSyncId) return null;

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select(`
      id,
      handle,
      real_name,
      avatar,
      nation,
      dob,
      phone,
      email,
      is_public,
      operative_stats ( current_rank )
    `)
    .eq('sync_id', targetSyncId)
    .maybeSingle();

  if (error || !data) return null;

  let stats = (data as any).operative_stats || {};
  if (Array.isArray(stats)) {
    stats = stats[0] || {};
  }
  const rank = stats.current_rank || '';

  return {
    sync_id: targetSyncId,
    display_name: data.handle,
    User_name: data.real_name,
    avatar: data.avatar,
    nation: data.nation,
    dob: data.dob,
    phone_number: data.phone,
    email: data.email,
    is_public: data.is_public !== false,
    // These will be hydrated by operative_stats later if needed
    total_hours: 0,
    today_hours: 0,
    current_rank: rank.replace('[PRIV]', '').trim() || 'RECRUIT',
    is_focusing_now: false,
    last_active: new Date().toISOString()
  } as any;
}

/** Checks if any data exists for a specific sync_id */
export async function checkIfSyncIdHasData(syncId: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  
  const { data } = await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('id')
    .eq('sync_id', syncId.trim())
    .limit(1)
    .maybeSingle();
  
  return !!data;
}

/** Deletes all data for a specific sync_id (used during migration) */
export async function deleteOldSyncIdData(oldSyncId: string): Promise<void> {
  if (!isSupabaseReady()) return;
  
  // With ON DELETE CASCADE, removing the profile removes everything
  await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .delete()
    .eq('sync_id', oldSyncId);
}

/** Transfers record from one sync_id to another */
export async function transferCloudRecord(table: string, oldSyncId: string, newSyncId: string): Promise<void> {
  if (!isSupabaseReady()) return;
  if (table !== SUPABASE_TABLES.PROFILES) return; // Only process once

  await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .update({ sync_id: newSyncId })
    .eq('sync_id', oldSyncId);
}

// Global telemetry state with persistent console-stability check
let telemetryEndpointActive = !localStorage.getItem('all_tracker_telemetry_muted');

/** Checks if a Username is already in use by another Sync ID */
export async function isUsernameTaken(username: string, excludeSyncId?: string | null): Promise<boolean> {
  if (!isSupabaseReady()) return false;

  let query = supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('handle')
    .ilike('handle', username.trim()); // Case-insensitive match

  if (excludeSyncId) {
    query = query.neq('sync_id', excludeSyncId);
  }

  const { data, error } = await query.maybeSingle();
  
  if (error) {
    log.error('Auth Check Failure', error);
    return false;
  }

  return !!data;
}

/** Verifies if a user exists with the exact display_name (User ID) and sync_id (Password) */
export async function verifyUserCredentials(username: string, syncId: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;

  const { data: profile } = await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('handle')
    .ilike('handle', username.trim())
    .eq('sync_id', syncId.trim())
    .maybeSingle();
    
  if (profile) return true;

  // 🛡️ NO BYPASS: Strict validation enforced.
  return false;
}

/** Checks if an Email is already in use by another Sync ID (Direct Query) */
export async function isEmailTaken(email: string, excludeSyncId?: string | null): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  if (!email) return false;

  let query = supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('email')
    .ilike('email', email.trim());

  if (excludeSyncId) {
    query = query.neq('sync_id', excludeSyncId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking email uniqueness:', error);
    return false;
  }
  return !!data;
}

/** Checks if a Phone Number is already in use by another Sync ID (Direct Query) */
export async function isPhoneTaken(phone: string, excludeSyncId?: string | null): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  if (!phone) return false;

  let query = supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('phone')
    .eq('phone', phone.trim());

  if (excludeSyncId) {
    query = query.neq('sync_id', excludeSyncId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking phone uniqueness:', error);
    return false;
  }
  return !!data;
}

/** Fetches real-time global platform telemetry (Total Users, Active Now, etc.) */
export async function fetchGlobalTelemetry(): Promise<{
  total_pilots: number;
  active_now: number;
  global_hours_today: number;
  total_platform_hours: number;
  nations_active: number;
} | null> {
  if (!isSupabaseReady()) return null;

  try {
    // 1. Fetch Atomic Metrics (Total Pilots, Active Now)
    const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
    const [{ count: total_pilots }, { count: active_now }] = await Promise.all([
      supabaseClient!.from(SUPABASE_TABLES.PROFILES).select('*', { count: 'exact', head: true }),
      supabaseClient!.from(SUPABASE_TABLES.STATS).select('*', { count: 'exact', head: true })
        .eq('is_focusing', true)
        .gt('last_active', tenMinsAgo) // 🛡️ HEARTBEAT GUARD: Only count truly active pilots
    ]);

    // 2. Fetch Performance Metrics (Total & Today Platform Hours)
    const { data: statsData } = await supabaseClient!.from(SUPABASE_TABLES.STATS).select('total_hours, today_hours, last_active');
    const total_platform_hours = (statsData || []).reduce((sum, row) => sum + (row.total_hours || 0), 0);
    
    // ⚡ PRECISION RESET: Only sum 'today_hours' if last_active is actually Today
    const now = new Date();
    const total_today_hours = (statsData || []).reduce((sum, row) => {
      const lastActive = row.last_active ? new Date(row.last_active) : null;
      const isToday = lastActive && 
                      lastActive.getFullYear() === now.getFullYear() &&
                      lastActive.getMonth() === now.getMonth() &&
                      lastActive.getDate() === now.getDate();
      
      return sum + (isToday ? (row.today_hours || 0) : 0);
    }, 0);

    // Secure global study pulse with graceful degradation for optional telemetry
    let session_hours_today: number | null = 0;
    try {
      if (supabaseClient && telemetryEndpointActive) {
        const { data, error: rpcError } = await supabaseClient.rpc('get_global_study_sum_utc');
        if (!rpcError) {
            session_hours_today = data;
        } else if (rpcError.code === '42883' || rpcError.code === 'P0001') {
            // Function unavailable: disable session telemetry for console stability
            telemetryEndpointActive = false;
            try { localStorage.setItem('all_tracker_telemetry_muted', 'true'); } catch(e) {}
        }
      }
    } catch (e) {
      telemetryEndpointActive = false;
      try { localStorage.setItem('all_tracker_telemetry_muted', 'true'); } catch(e) {}
    }
    
    return {
      total_pilots: total_pilots || 0,
      active_now: active_now || 0,
      global_hours_today: Number(session_hours_today) || total_today_hours || 0,
      total_platform_hours: total_platform_hours || 0,
      nations_active: 0
    };
  } catch (err) {
    // Muted Telemetry Warning to keep console clean
    return null;
  }
}
