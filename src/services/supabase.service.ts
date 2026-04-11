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

/** Generic function to save data to any table (using the sync_id) */
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

/** Generic function to get data from any table (filtered by sync_id) */
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

// --- Tracker Data ---

export async function saveTrackerDataCloud(data: TrackerDay[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.TRACKER_DATA, { data, updated_at: new Date() });
}

export async function loadTrackerDataCloud(): Promise<TrackerDay[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.TRACKER_DATA);
  if (result?.data?.data) return result.data.data as TrackerDay[];
  return null;
}

// --- Settings Sync ---

export async function saveSettingsCloud(settings: Settings): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.SETTINGS, { data: settings, updated_at: new Date() });
}

export async function loadSettingsCloud(): Promise<Settings | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.SETTINGS);
  if (result?.data?.data) return result.data.data as Settings;
  return null;
}

// --- Routine Sync ---

export async function saveRoutinesCloud(routines: RoutineItem[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.ROUTINES, { data: routines, updated_at: new Date() });
}

export async function loadRoutinesCloud(): Promise<RoutineItem[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.ROUTINES);
  if (result?.data?.data) return result.data.data as RoutineItem[];
  return null;
}



// --- Bookmark Sync ---

export async function saveBookmarksCloud(bookmarks: Bookmark[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.BOOKMARKS, { data: bookmarks, updated_at: new Date() });
}

export async function loadBookmarksCloud(): Promise<Bookmark[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.BOOKMARKS);
  if (result?.data?.data) return result.data.data as Bookmark[];
  return null;
}

// --- History Sync ---

export async function saveRoutineHistoryCloud(history: RoutineHistory): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.ROUTINE_HISTORY, { data: history, updated_at: new Date() });
}

export async function loadRoutineHistoryCloud(): Promise<RoutineHistory | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.ROUTINE_HISTORY);
  if (result?.data?.data) return result.data.data as RoutineHistory;
  return null;
}

// --- Timer State Sync ---

export async function saveTimerStateCloud(state: ActiveTimer): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.TIMER_STATE, { data: state, updated_at: new Date() });
}

export async function loadTimerStateCloud(): Promise<ActiveTimer | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.TIMER_STATE);
  if (result?.data?.data) return result.data.data as ActiveTimer;
  return null;
}

// --- Routine Resets ---

export async function saveRoutineResetCloud(reset: string): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.ROUTINE_RESET, { data: reset, updated_at: new Date() });
}

export async function loadRoutineResetCloud(): Promise<string | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.ROUTINE_RESET);
  if (result?.data?.data) return result.data.data as string;
  return null;
}

// --- Task List ---

export async function saveTasksCloud(tasks: StudyTask[]): Promise<void> {
  await upsertToSupabase(SUPABASE_TABLES.TASKS, { data: tasks, updated_at: new Date() });
}

export async function loadTasksCloud(): Promise<StudyTask[] | null> {
  const result = await fetchFromSupabase(SUPABASE_TABLES.TASKS);
  if (result?.data?.data) return result.data.data as StudyTask[];
  return null;
}

// --- Realtime WebSocket Gateway ---

export function subscribeToRealtimeTelemetry(
  callback: (payload: any) => void
): { unsubscribe: () => void } {
  if (!isSupabaseReady()) return { unsubscribe: () => {} };

  console.log('📡 CONNECTING WEBSOCKETS TO TELEMETRY MATRIX...');
  
  const channel = supabaseClient!
    .channel('telemetry_pulse_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operative_telemetry' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
         console.log('🔗 REALTIME WEBSOCKETS LINK ESTABLISHED');
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
 * Filtered specifically for the current user's sync_id.
 */
export function subscribeToUserDataSync(
  callback: (payload: any) => void
): { unsubscribe: () => void } {
  if (!isSupabaseReady()) return { unsubscribe: () => {} };

  const syncId = getCurrentUserId();
  if (!syncId) return { unsubscribe: () => {} };

  console.log(`📡 BROADCAST MATRIX: Monitoring private data for [${syncId}]`);

  const channel = supabaseClient!
    .channel(`user_data_sync_${syncId}`)
    // Listen to changes in all relevant user tables
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_data', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routines', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_history', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_state', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_reset', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `sync_id=eq.${syncId}` }, (p) => callback(p))
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

  const pulsePayload = {
    id: syncId,
    total_hours: Number(profile.total_hours || 0),
    today_hours: Number(profile.today_hours || 0),
    last_active: new Date().toISOString(),
    is_focusing: profile.is_focusing_now === true,
    focus_subject: profile.current_focus_subject || 'IDLE',
    is_focus_public: profile.is_focus_public !== false,
    current_rank: profile.current_rank || 'RECRUIT'
  };

  const { error: pulseErr } = await supabaseClient!
    .from('operative_telemetry')
    .upsert(pulsePayload, { onConflict: 'id' });

  if (pulseErr) {
    console.error('🚨 TELEMETRY PULSE ERROR:', pulseErr);
    const { showToast } = await import('@/utils/dom.utils');
    showToast(`Telemetry Sync Failed: ${pulseErr.message}`, 'error');
  }

  // 2. MODULE B: REGISTRY (Identity - Low-Frequency)
  if (profile.display_name || profile.avatar || profile.nation || profile.User_name) {
    const registryPayload: any = { 
      id: syncId,
      handle: profile.display_name || `OP-${syncId.slice(0, 5)}`,
      full_name: profile.User_name || 'Operative',
      avatar: profile.avatar || '👨‍🚀',
      nation: profile.nation || 'Global',
      dob: profile.dob || '2000-01-01',
      phone_number: profile.phone_number || null,
      email: profile.email || null,
      is_focus_public: profile.is_focus_public !== false
    };

    const { error: regErr } = await supabaseClient!
      .from('profile_registry')
      .upsert(registryPayload, { onConflict: 'id' });
    
    if (regErr) {
      console.error('🚨 REGISTRY SYNC ERROR:', regErr);
      const { showToast } = await import('@/utils/dom.utils');
      showToast(`Identity Sync Failed: ${regErr.message}`, 'error');
    }
  }

  console.log(`✅ SYNC SUCCESS: Updated telemetry and registry for ${syncId}`);
}

/** Gets the Top 10 people for the World Stage leaderboard */
export async function fetchLeaderboard(): Promise<GlobalProfile[]> {
  if (!isSupabaseReady()) return [];

  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .select('display_name, User_name, dob, nation, avatar, total_hours, today_hours, current_rank, is_focusing_now, last_active, current_focus_subject, is_focus_public')
    .order('total_hours', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching World Stage:', error);
    return [];
  }

  return (data || []) as GlobalProfile[];
}

/** Loads the profile for a specific user from the cloud (Secure Table Lookup) */
export async function loadUserProfileCloud(syncId?: string): Promise<GlobalProfile | null> {
  if (!isSupabaseReady()) return null;
  const targetId = syncId || getCurrentUserId();
  if (!targetId) return null;

  // 🛡️ SECURITY: Query the base table directly to get private fields (phone, email)
  const { data, error } = await supabaseClient!
    .from('profile_registry')
    .select(`
      id,
      handle,
      full_name,
      avatar,
      nation,
      dob,
      phone_number,
      email,
      recovery_key,
      is_focus_public
    `)
    .eq('id', targetId)
    .maybeSingle();

  if (error) {
    console.error('Error loading cloud profile:', error);
    return null;
  }

  if (!data) return null;

  // Map database fields to the GlobalProfile type
  return {
    id: data.id,
    display_name: data.handle,
    User_name: data.full_name,
    avatar: data.avatar,
    nation: data.nation,
    dob: data.dob,
    phone_number: data.phone_number,
    email: data.email,
    recovery_key: data.recovery_key,
    // Add missing required fields for the interface
    total_hours: 0,
    today_hours: 0,
    current_rank: 'RECRUIT',
    is_focusing_now: false,
    last_active: new Date().toISOString(),
    sync_id: data.id,
    is_focus_public: data.is_focus_public !== false
  } as GlobalProfile;
}

/** Checks if any data exists in the tracker_data table for a specific sync_id */
export async function checkIfSyncIdHasData(syncId: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  
  const { data, error } = await supabaseClient!
    .from(SUPABASE_TABLES.TRACKER_DATA)
    .select('sync_id')
    .eq('sync_id', syncId.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking sync_id existence:', error);
    return false;
  }
  
  return !!data;
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

  const { data: profile } = await supabaseClient!
    .from(SUPABASE_TABLES.GLOBAL_PROFILES)
    .select('display_name')
    .ilike('display_name', username.trim())
    .eq('id', syncId.trim())
    .maybeSingle();
    
  if (profile) return true;

  // 🛡️ NO BYPASS: Strict validation enforced.
  return false;
}

/** Checks if an Email is already in use by another Sync ID (Secure RPC) */
export async function isEmailTaken(email: string, excludeSyncId?: string | null): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  if (!email) return false;

  const { data, error } = await supabaseClient!.rpc('check_email_uniqueness', {
    target_email: email.trim(),
    current_id: excludeSyncId || ''
  });

  if (error) {
    console.error('Error checking email uniqueness:', error);
    return false;
  }
  return !!data;
}

/** Checks if a Phone Number is already in use by another Sync ID (Secure RPC) */
export async function isPhoneTaken(phone: string, excludeSyncId?: string | null): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  if (!phone) return false;

  const { data, error } = await supabaseClient!.rpc('check_phone_uniqueness', {
    target_phone: phone.trim(),
    current_id: excludeSyncId || ''
  });

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

  const { data, error } = await supabaseClient!
    .from('platform_telemetry')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching global telemetry:', error);
    return null;
  }

  return data;
}
