import { getSecureLocalProfileString, setSecureLocalProfileString } from '@/utils/security';
/**
 * Data Bridge — Handles saving and loading data.
 * 
 * This bridges the browser storage and the cloud (Supabase).
 * If you're logged in, everything saves to both places automatically.
 */

import { STORAGE_KEYS } from '@/config/constants';
import { getCurrentUserId } from '@/services/auth.service';
import {
  saveTrackerDataCloud, loadTrackerDataCloud,
  saveSettingsCloud, loadSettingsCloud,
  saveRoutinesCloud, loadRoutinesCloud,
  saveBookmarksCloud, loadBookmarksCloud,
  saveRoutineHistoryCloud, loadRoutineHistoryCloud,
  saveTimerStateCloud, loadTimerStateCloud,
  saveRoutineResetCloud, loadRoutineResetCloud,
  saveTasksCloud, loadTasksCloud,
  loadUserProfileCloud,
  updateSyncStatus,
} from '@/services/supabase.service';
import type { TrackerDay, Settings } from '@/types/tracker.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import type { StudyTask } from '@/types/task.types';
import type { ActiveTimer } from '@/types/timer.types';
import { applyThemeToDOM, appState } from '@/state/app-state';


// --- Auth Check ---

function isAuthenticated(): boolean {
  return getCurrentUserId() !== null;
}

// --- Tracker Data Functions ---

function setTrackerData(data: TrackerDay[], pushToCloud = true): void {
  const current = JSON.stringify(appState.trackerData);
  const next = JSON.stringify(data);
  if (current === next) return;

  appState.trackerData = data;
  localStorage.setItem(STORAGE_KEYS.TRACKER_DATA, next);
  if (pushToCloud && isAuthenticated()) {
    saveTrackerDataCloud(data);
  }
}

export async function loadTrackerDataFromStorage(): Promise<TrackerDay[]> {
  if (isAuthenticated()) {
    const cloud = await loadTrackerDataCloud();
    if (cloud && cloud.length > 0) {
      setTrackerData(cloud, false);
      return cloud;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.TRACKER_DATA);
  let localData: TrackerDay[] = [];
  if (saved) { 
    try { 
      localData = JSON.parse(saved); 
    } catch { 
      localData = []; 
    } 
  }
  return localData;
}

export async function saveTrackerDataToStorage(data: TrackerDay[]): Promise<void> {
  setTrackerData(data);
}

// --- Settings Functions ---

import { obfuscate, deobfuscate } from '@/utils/security';

function setSettings(settings: Settings, pushToCloud = true): void {
  const syncId = getCurrentUserId() || '';
  
  if (!syncId && settings.groqApiKey) {
    settings.groqApiKey = ''; 
  }

  const current = JSON.stringify(appState.settings);
  const next = JSON.stringify(settings);
  if (current === next) return;

  appState.settings = { ...appState.settings, ...settings };
  
  const securedSettings = { 
    ...settings, 
    groqApiKey: settings.groqApiKey ? obfuscate(settings.groqApiKey, syncId) : '' 
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(securedSettings));
  
  if (pushToCloud && isAuthenticated()) {
    saveSettingsCloud(settings);
  }
}

export async function loadSettingsFromStorage(): Promise<Settings | null> {
  if (isAuthenticated()) {
    const cloud = await loadSettingsCloud();
    if (cloud) {
      if (cloud.theme) {
        applyThemeToDOM(cloud.theme);
      }
      setSettings(cloud, false);
      return cloud;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  let localSettings: Settings | null = null;
  
  if (saved) { 
    try { 
      localSettings = JSON.parse(saved) as Settings;
      
      // 🔐 IDENTITY-LINKED VAULT (V3): Decrypt using current user ID
      if (localSettings.groqApiKey) {
        const syncId = getCurrentUserId() || '';
        localSettings.groqApiKey = deobfuscate(localSettings.groqApiKey, syncId);
      }
      if (localSettings.theme) {
        applyThemeToDOM(localSettings.theme);
      }
    } catch { 
      localSettings = null; 
    } 
  }
  return localSettings;
}

export async function saveSettingsToStorage(settings: Settings): Promise<void> {
  setSettings(settings);
}

// --- Routine Functions ---

function setRoutines(routines: RoutineItem[], pushToCloud = true): void {
  if (JSON.stringify(appState.routines) === JSON.stringify(routines)) return;
  appState.routines = routines;
  localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  if (pushToCloud && isAuthenticated()) {
    saveRoutinesCloud(routines);
  }
}

export async function loadRoutinesFromStorage(): Promise<RoutineItem[]> {
  if (isAuthenticated()) {
    const cloud = await loadRoutinesCloud();
    if (cloud) {
      setRoutines(cloud, false);
      return cloud;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.ROUTINES);
  let localRoutines: RoutineItem[] = [];
  if (saved) { try { localRoutines = JSON.parse(saved); } catch { localRoutines = []; } }
  return localRoutines;
}

export async function saveRoutinesToStorage(routines: RoutineItem[]): Promise<void> {
  setRoutines(routines);
}



// --- History Functions ---

function setRoutineHistory(history: RoutineHistory, pushToCloud = true): void {
  if (JSON.stringify(appState.routineHistory) === JSON.stringify(history)) return;
  appState.routineHistory = history;
  localStorage.setItem(STORAGE_KEYS.ROUTINE_HISTORY, JSON.stringify(history));
  if (pushToCloud && isAuthenticated()) {
    saveRoutineHistoryCloud(history);
  }
}

export async function loadRoutineHistoryFromStorage(): Promise<RoutineHistory> {
  if (isAuthenticated()) {
    const cloud = await loadRoutineHistoryCloud();
    if (cloud) {
      setRoutineHistory(cloud, false);
      return cloud;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.ROUTINE_HISTORY);
  let localHistory: RoutineHistory = {};
  if (saved) { try { localHistory = JSON.parse(saved); } catch { localHistory = {}; } }
  return localHistory;
}

export async function saveRoutineHistoryToStorage(history: RoutineHistory): Promise<void> {
  setRoutineHistory(history);
}

// --- Bookmark Functions ---

function setBookmarks(bookmarks: Bookmark[], pushToCloud = true): void {
  if (JSON.stringify(appState.bookmarks) === JSON.stringify(bookmarks)) return;
  appState.bookmarks = bookmarks;
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  if (pushToCloud && isAuthenticated()) {
    saveBookmarksCloud(bookmarks);
  }
}

export async function loadBookmarksFromStorage(): Promise<Bookmark[]> {
  if (isAuthenticated()) {
    const cloud = await loadBookmarksCloud();
    if (cloud) {
      setBookmarks(cloud, false);
      return cloud;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
  let localBookmarks: Bookmark[] = [];
  if (saved) { try { localBookmarks = JSON.parse(saved); } catch { localBookmarks = []; } }
  return localBookmarks;
}

export async function saveBookmarksToStorage(bookmarks: Bookmark[]): Promise<void> {
  setBookmarks(bookmarks);
}

// --- Timer Functions (Pure DB — localStorage-free) ---

/**
 * DB-FIRST LOAD: Single source of truth is Supabase.
 * No localStorage fallback. If offline or not authenticated, returns null.
 */
export async function loadTimerStateFromStorage(): Promise<ActiveTimer | null> {
  const syncId = getCurrentUserId();
  if (!syncId) return null; // Not authenticated — no timer state

  try {
    const cloud = await loadTimerStateCloud();
    if (!cloud) return null;
    return cloud;
  } catch (err) {
    console.warn('⚠️ DB timer fetch failed (offline?):', err);
    return null;
  }
}

/**
 * DB-FIRST SAVE: Writes exclusively to Supabase.
 * The in-memory appState.activeTimer is the working buffer between saves.
 */
export async function saveTimerStateToStorage(state: ActiveTimer): Promise<void> {
  if (!isAuthenticated()) return; // Silent no-op when logged out
  try {
    await saveTimerStateCloud(state);
  } catch (err) {
    console.warn('⚠️ DB timer save failed (offline?):', err);
  }
}

/**
 * DB-FIRST CLEAR: Explicitly zeros the timer record in Supabase.
 * Used by terminateTimer() to guarantee the DB is cleared before the page can refresh.
 */
export async function clearTimerStateDB(): Promise<void> {
  if (!isAuthenticated()) return;
  const blankState: ActiveTimer = {
    isRunning: false, elapsedAcc: 0, startTime: null,
    category: null, colName: '', sessionStartClock: null
  };
  try {
    await saveTimerStateCloud(blankState);
  } catch (err) {
    console.warn('⚠️ DB timer clear failed (offline?):', err);
  }
}

// --- Reset Functions ---

function setRoutineReset(reset: string, pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.ROUTINE_RESET, reset);
  if (pushToCloud && isAuthenticated()) {
    saveRoutineResetCloud(reset);
  }
}

export async function loadRoutineResetFromStorage(): Promise<string | null> {
  const local = localStorage.getItem(STORAGE_KEYS.ROUTINE_RESET);
  if (isAuthenticated()) {
    const cloud = await loadRoutineResetCloud();
    if (cloud) { setRoutineReset(cloud, false); return cloud; }
  }
  return local;
}

export async function saveRoutineResetToStorage(reset: string): Promise<void> {
  setRoutineReset(reset);
}

// --- Task Functions ---

function setTasks(tasks: StudyTask[], pushToCloud = true): void {
  if (JSON.stringify(appState.tasks) === JSON.stringify(tasks)) return;
  appState.tasks = tasks;
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  if (pushToCloud && isAuthenticated()) {
    saveTasksCloud(tasks);
  }
}

export async function loadTasksFromStorage(): Promise<StudyTask[]> {
  if (isAuthenticated()) {
    const cloud = await loadTasksCloud();
    if (cloud) {
      setTasks(cloud, false);
      return cloud;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
  let localTasks: StudyTask[] = [];
  if (saved) { try { localTasks = JSON.parse(saved); } catch { localTasks = []; } }
  return localTasks;
}

export async function saveTasksToStorage(tasks: StudyTask[]): Promise<void> {
  setTasks(tasks);
}

// --- Logout/Clear Functions ---

export function clearLocalData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// --- Cloud Sync Logic ---

export async function syncDataOnLogin(): Promise<void> {
  console.log('Initiating data sync...');
  updateSyncStatus('syncing');

  try {
    const [cloudTracker, cloudSettings, cloudRoutines, cloudHistory, cloudBookmarks, cloudTasks, cloudTimer] = await Promise.all([
      loadTrackerDataCloud(),
      loadSettingsCloud(),
      loadRoutinesCloud(),
      loadRoutineHistoryCloud(),
      loadBookmarksCloud(),
      loadTasksCloud(),
      loadTimerStateCloud(),
    ]);

    // 🛡️ SYNC PROTECTION (e07f5d0 era robustness):
    // Only allow cloud to overwrite local if cloud actually has data.
    // If cloud is empty but local has progress, sync local TO cloud to heal the vault.
    if (cloudTracker && cloudTracker.length > 0) {
      setTrackerData(cloudTracker, false);
    } else if (appState.trackerData.length > 0) {
      console.warn('🛡️ SYNC PROTECTION: Cloud empty, healing vault from local tracker state...');
      saveTrackerDataCloud(appState.trackerData);
    }

    if (cloudSettings) {
      setSettings(cloudSettings, false);
    } else if (Object.keys(appState.settings).length > 0) {
      saveSettingsCloud(appState.settings);
    }

    if (cloudRoutines && cloudRoutines.length > 0) {
      setRoutines(cloudRoutines, false);
    } else if (appState.routines.length > 0) {
      saveRoutinesCloud(appState.routines);
    }

    if (cloudHistory && Object.keys(cloudHistory).length > 0) {
      setRoutineHistory(cloudHistory, false);
    } else if (Object.keys(appState.routineHistory).length > 0) {
      saveRoutineHistoryCloud(appState.routineHistory);
    }

    if (cloudBookmarks && cloudBookmarks.length > 0) {
      setBookmarks(cloudBookmarks, false);
    } else if (appState.bookmarks.length > 0) {
      saveBookmarksCloud(appState.bookmarks);
    }

    if (cloudTasks && cloudTasks.length > 0) {
      setTasks(cloudTasks, false);
    } else if (appState.tasks.length > 0) {
      saveTasksCloud(appState.tasks);
    }

    if (cloudTimer) {
      Object.assign(appState.activeTimer, cloudTimer);
    }

    const cloudReset = await loadRoutineResetCloud();
    if (cloudReset) setRoutineReset(cloudReset, false);

    // 5. Restore User Profile & Identity (Modular Registry V2)
    const cloudProfile = await loadUserProfileCloud();
    if (cloudProfile) {
      const userProfile = {
        displayName: cloudProfile.display_name,
        realName: cloudProfile.User_name || '',
        dob: cloudProfile.dob || '',
        nation: cloudProfile.nation || 'Global',
        avatar: cloudProfile.avatar || '👨‍🚀',
        phoneNumber: cloudProfile.phone_number || '',
        email: cloudProfile.email || '',
        isFocusPublic: cloudProfile.is_focus_public !== false
      };
      setSecureLocalProfileString(JSON.stringify(userProfile));
      localStorage.setItem('tracker_username', userProfile.displayName);
      console.log(`✅ IDENTITY SYNCED: Re-established @${userProfile.displayName} in local vault.`);
    }

    console.log('Sync complete.');

    // Refresh the app state and UI
    await refreshAppAfterSync();

    updateSyncStatus('synced');
  } catch (err) {
    console.error('Critical sync failure:', err);
    updateSyncStatus('error');
  }
}

/** 
 * Background Sync — Fetches all cloud data silently and updates 
 * the app if there are any changes.
 */
export async function performBackgroundSync(): Promise<void> {
  if (!isAuthenticated()) return;
  
  try {
    const [cloudTracker, cloudSettings, cloudRoutines, cloudHistory, cloudBookmarks, cloudTasks, cloudTimer] = await Promise.all([
      loadTrackerDataCloud(),
      loadSettingsCloud(),
      loadRoutinesCloud(),
      loadRoutineHistoryCloud(),
      loadBookmarksCloud(),
      loadTasksCloud(),
      loadTimerStateCloud(),
    ]);

    let changed = false;

    // 🛡️ SYNC GUARD: Only update and refresh if cloud data differs from local state
    const hasChanged = (localKey: string, cloudData: any) => {
      if (!cloudData) return false;
      const local = localStorage.getItem(localKey);
      return JSON.stringify(cloudData) !== local;
    };

    if (hasChanged(STORAGE_KEYS.TRACKER_DATA, cloudTracker)) { setTrackerData(cloudTracker!, false); changed = true; }
    if (hasChanged(STORAGE_KEYS.SETTINGS, cloudSettings)) { setSettings(cloudSettings!, false); changed = true; }
    if (cloudRoutines && JSON.stringify(cloudRoutines) !== localStorage.getItem(STORAGE_KEYS.ROUTINES)) { setRoutines(cloudRoutines, false); changed = true; }
    if (cloudHistory && JSON.stringify(cloudHistory) !== localStorage.getItem(STORAGE_KEYS.ROUTINE_HISTORY)) { setRoutineHistory(cloudHistory, false); changed = true; }
    if (cloudBookmarks && JSON.stringify(cloudBookmarks) !== localStorage.getItem(STORAGE_KEYS.BOOKMARKS)) { setBookmarks(cloudBookmarks, false); changed = true; }
    if (cloudTasks && JSON.stringify(cloudTasks) !== localStorage.getItem(STORAGE_KEYS.TASKS)) { setTasks(cloudTasks, false); changed = true; }
    if (cloudTimer && JSON.stringify(cloudTimer) !== JSON.stringify(appState.activeTimer)) {
      Object.assign(appState.activeTimer, cloudTimer); // DB → memory, no localStorage
      changed = true;
    }

    if (changed) {
      console.log('🔄 SYNC UPDATE: Cloud changes detected. Refreshing UI...');
      await refreshAppAfterSync();
    } else {
      console.log('✅ SYNC COMPLETE: All systems identical.');
    }
  } catch (err) {
    console.warn('Background sync failed:', err);
  }
}

/** Updates the UI after the cloud data is finished downloading */
async function refreshAppAfterSync(): Promise<void> {
  // Reimport dynamically to avoid circular deps at startup
  const { refreshApplicationUI } = await import('@/main');
  await refreshApplicationUI();
}

/**
 * ⚡ REAL-TIME DATA PROCESSOR
 * Handles incoming WebSocket payloads from Supabase and patches 
 * the local appState immediately.
 */
export async function handleUserDataSync(payload: any): Promise<void> {
  const { table, new: newData, eventType } = payload;
  if (!newData || eventType === 'DELETE') return;

  const cloudData = newData.data;
  if (!cloudData) return;

  console.log(`📡 REALTIME PATCH: ${table.toUpperCase()} update received.`);

  switch (table) {
    case 'tracker_data':    setTrackerData(cloudData, false); break;
    case 'settings':        setSettings(cloudData, false); break;
    case 'routines':        setRoutines(cloudData, false); break;
    case 'bookmarks':       setBookmarks(cloudData, false); break;
    case 'routine_history': setRoutineHistory(cloudData, false); break;
    case 'tasks':           setTasks(cloudData, false); break;
    case 'timer_state':
      if (JSON.stringify(appState.activeTimer) !== JSON.stringify(cloudData)) {
        Object.assign(appState.activeTimer, cloudData);
      }
      break;
    case 'routine_reset':
      localStorage.setItem(STORAGE_KEYS.ROUTINE_RESET, cloudData);
      break;
  }

  // Trigger UI update
  await refreshAppAfterSync();
}
