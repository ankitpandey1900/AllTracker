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
import type { GlobalProfile } from '@/types/profile.types';
import { getCurrentUserId } from '@/services/auth.service';

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
let cachedProfileId: string | null = null;

/** Retrieves the UUID for the current Sync ID */
async function getProfileId(): Promise<string | null> {
  if (cachedProfileId) return cachedProfileId;
  if (!isSupabaseReady()) return null;

  const syncId = getCurrentUserId();
  if (!syncId) return null;

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.PROFILES)
    .select('id')
    .eq('sync_id', syncId)
    .maybeSingle();

  if (error || !data) return null;
  cachedProfileId = data.id;
  return cachedProfileId;
}

/** Generic function to save data to any vault (using the profile_id) */
async function upsertToVault(table: string, payload: any): Promise<{ error?: unknown }> {
  if (!isSupabaseReady()) return { error: 'Supabase client not initialized' };

  const pId = await getProfileId();
  if (!pId) return { error: 'No Profile ID found' };

  updateSyncStatus('syncing');

  const { error } = await supabaseClient!
    .from(table)
    .upsert({ profile_id: pId, data: payload, updated_at: new Date() }, { onConflict: 'profile_id' });

  if (error) {
    console.error(`Error saving to ${table}:`, error);
    updateSyncStatus('error');
    return { error };
  }

  updateSyncStatus('synced');
  return {};
}

/** Generic function to get data from any vault (filtered by profile_id) */
async function fetchFromVault(table: string): Promise<{ data?: any | null; updatedAt?: string; error?: unknown }> {
  if (!isSupabaseReady()) return { error: 'Supabase client not initialized' };

  const pId = await getProfileId();
  if (!pId) return { error: 'No Profile ID found' };

  updateSyncStatus('syncing');

  const { data, error } = await supabaseClient!
    .from(table)
    .select('*')
    .eq('profile_id', pId)
    .maybeSingle();

  if (error) {
    console.error(`Error loading from ${table}:`, error);
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
  const channel = supabaseClient!
    .channel('world_stage_live_feed')
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
    .subscribe();

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

  const pId = await getProfileId();
  if (!pId) return { unsubscribe: () => {} };

  console.log(`📡 BROADCAST MATRIX: Monitoring private data channel.`);

  const channel = supabaseClient!
    .channel(`user_data_sync_${pId}`)
    // Listen to changes in all relevant user tables using the new Granular Vaults
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.TRACKER, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.SETTINGS, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.ROUTINES, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.BOOKMARKS, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.TIMER, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.TASKS, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.HISTORY, filter: `profile_id=eq.${pId}` }, (p) => callback(p))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
         console.log('🔗 REALTIME DATA SYNC ESTABLISHED');
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

  const pId = await getProfileId();
  if (!pId) return;

  // 1. Update Telemetry (operative_stats)
  const pulsePayload = {
    profile_id: pId,
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
    .upsert(pulsePayload, { onConflict: 'profile_id' });

  if (pulseErr) {
    console.error('🚨 STATS PULSE ERROR:', pulseErr);
  }

  // 2. Update Registry (operative_profiles) - Only if identity data changed
  if (profile.display_name || profile.avatar || profile.nation || profile.User_name) {
    const registryPayload: any = { 
      id: pId,
      handle: profile.display_name,
      real_name: profile.User_name,
      avatar: profile.avatar || '👨‍🚀',
      nation: profile.nation || 'Global',
      dob: profile.dob,
      phone: profile.phone_number,
      email: profile.email,
      is_public: profile.is_focus_public !== false
    };

    const { error: regErr } = await supabaseClient!
      .from(SUPABASE_TABLES.PROFILES)
      .update(registryPayload)
      .eq('id', pId);
    
    if (regErr) {
      console.error('🚨 REGISTRY SYNC ERROR:', regErr);
    }
  }
  console.log(`✅ SYNC SUCCESS: Cloud identity and metrics updated.`);
}

/** Gets the Top 10 people for the World Stage leaderboard */
export async function fetchLeaderboard(): Promise<GlobalProfile[]> {
  if (!isSupabaseReady()) return [];

  // Join profiles and stats
  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.STATS)
    .select(`
      total_hours,
      today_hours,
      current_rank,
      last_active,
      is_focusing,
      focus_subject,
      operative_profiles!inner (
        handle,
        real_name,
        avatar,
        nation,
        is_public
      )
    `)
    .eq('operative_profiles.is_public', true)
    .order('total_hours', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching World Stage:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const profile = row.operative_profiles || {};
    return {
      display_name: profile.handle || 'Unknown',
      User_name: profile.real_name,
      avatar: profile.avatar || '👨‍🚀',
      nation: profile.nation || 'Global',
      total_hours: row.total_hours || 0,
      today_hours: row.today_hours || 0,
      current_rank: row.current_rank || 'PILOT',
      is_focusing_now: row.is_focusing || false,
      last_active: row.last_active,
      current_focus_subject: row.focus_subject,
      is_focus_public: profile.is_public !== false
    };
  }) as any[];
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
      is_public
    `)
    .eq('sync_id', targetSyncId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    sync_id: targetSyncId,
    display_name: data.handle,
    User_name: data.real_name,
    avatar: data.avatar,
    nation: data.nation,
    dob: data.dob,
    phone_number: data.phone,
    email: data.email,
    is_focus_public: data.is_public,
    // These will be hydrated by operative_stats later if needed
    total_hours: 0,
    today_hours: 0,
    current_rank: 'RECRUIT',
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
    console.error('Error checking username uniqueness:', error);
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
  nations_active: number;
} | null> {
  if (!isSupabaseReady()) return null;

  try {
    const [{ count: total_pilots }, { count: active_now }] = await Promise.all([
      supabaseClient!.from(SUPABASE_TABLES.PROFILES).select('*', { count: 'exact', head: true }),
      supabaseClient!.from(SUPABASE_TABLES.STATS).select('*', { count: 'exact', head: true }).eq('is_focusing', true)
    ]);

    return {
      total_pilots: total_pilots || 0,
      active_now: active_now || 0,
      global_hours_today: 0, // Need complex query for sum, ignoring for performance
      nations_active: 0
    };
  } catch (err) {
    console.error('Telemetry fetch failed', err);
    return null;
  }
}
