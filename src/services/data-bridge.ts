import { getSecureLocalProfileString, setSecureLocalProfileString } from '@/utils/security';
import { log } from '@/utils/logger.utils';
import { showLoading, hideLoading } from '@/utils/dom.utils';
/**
 * Data Bridge — Handles saving and loading data.
 * 
 * This bridges the browser storage and the cloud.
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
  subscribeToUserDataSync,
} from '@/services/vault.service';
import type { TrackerDay, Settings } from '@/types/tracker.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import type { StudyTask } from '@/types/task.types';
import type { ActiveTimer } from '@/types/timer.types';
import { applyThemeToDOM, applyTimerStyleToDOM, appState } from '@/state/app-state';


// --- Auth & Sync Helpers ---

function isAuthenticated(): boolean {
  return getCurrentUserId() !== null;
}

/** 🛡️ TIMESTAMP REGISTRY: Tracks exactly when local data was last modified */
function updateLocalTimestamp(key: string, timestamp?: string): void {
  const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_METADATA) || '{}');
  meta[key] = timestamp || new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.SYNC_METADATA, JSON.stringify(meta));
}

function getLocalTimestamp(key: string): number {
  const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_METADATA) || '{}');
  const ts = meta[key] || '1970-01-01T00:00:00.000Z';
  return new Date(ts).getTime();
}

/** ⚖️ CONFLICT RESOLVER: Determines if Cloud data is strictly newer than the local version */
function isCloudNewer(key: string, cloudTimestamp: string | null): boolean {
  if (!cloudTimestamp) return false;
  const localTs = getLocalTimestamp(key);
  const cloudTs = new Date(cloudTimestamp).getTime();
  return cloudTs > localTs; // Offset by 1s to allow for network jitter if needed
}

function isDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

// --- Tracker Data Functions ---

function setTrackerData(data: TrackerDay[], pushToCloud = true): void {
  appState.trackerData = data;
  localStorage.setItem(STORAGE_KEYS.TRACKER_DATA, JSON.stringify(data));
  
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.TRACKER_DATA);
    if (isAuthenticated()) {
      saveTrackerDataCloud(data);
    }
  }
}

export async function loadTrackerDataFromStorage(): Promise<TrackerDay[]> {
  const online = navigator.onLine;
  const syncId = getCurrentUserId();

  if (syncId && online) {
    log.info('CLOUD MASTER: Fetching primary Tracker Data from cloud...', '🏛️');
    const cloud = await loadTrackerDataCloud();
    if (cloud && cloud.data) {
      // 🛡️ WIPE PROTECTION: If cloud has data but we are about to return a "fresh" empty local state,
      // we must FORCE the cloud data to take over.
      setTrackerData(cloud.data, false);
      updateLocalTimestamp(STORAGE_KEYS.TRACKER_DATA, cloud.updatedAt || undefined);
      return cloud.data;
    }
  }

  // Fallback to local only if offline or cloud fetch returned nothing
  log.warn('OFFLINE/FALLBACK: Loading Tracker data from local mirror.');
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

  appState.settings = { ...appState.settings, ...settings };
  
  const securedSettings = { 
    ...settings, 
    groqApiKey: settings.groqApiKey ? obfuscate(settings.groqApiKey, syncId) : '' 
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(securedSettings));
  
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.SETTINGS);
    if (isAuthenticated()) {
      saveSettingsCloud(settings);
    }
  }
}

export async function loadSettingsFromStorage(): Promise<Settings | null> {
  const online = navigator.onLine;
  const syncId = getCurrentUserId();

  if (syncId && online) {
    const cloud = await loadSettingsCloud();
    if (cloud && cloud.data) {
      if (cloud.data.theme) {
        applyThemeToDOM(cloud.data.theme);
        applyTimerStyleToDOM(cloud.data.timerStyle);
      }
      setSettings(cloud.data, false);
      updateLocalTimestamp(STORAGE_KEYS.SETTINGS, cloud.updatedAt || undefined);
      return cloud.data;
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
        applyTimerStyleToDOM(localSettings.timerStyle);
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
  appState.routines = routines;
  localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.ROUTINES);
    if (isAuthenticated()) {
      saveRoutinesCloud(routines);
    }
  }
}

export async function loadRoutinesFromStorage(): Promise<RoutineItem[]> {
  const online = navigator.onLine;
  const syncId = getCurrentUserId();

  if (syncId && online) {
    const cloud = await loadRoutinesCloud();
    if (cloud && cloud.data) {
      setRoutines(cloud.data, false);
      updateLocalTimestamp(STORAGE_KEYS.ROUTINES, cloud.updatedAt || undefined);
      return cloud.data;
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
  appState.routineHistory = history;
  localStorage.setItem(STORAGE_KEYS.ROUTINE_HISTORY, JSON.stringify(history));
  
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.ROUTINE_HISTORY);
    if (isAuthenticated()) {
      saveRoutineHistoryCloud(history);
    }
  }
}

export async function loadRoutineHistoryFromStorage(): Promise<RoutineHistory> {
  const online = navigator.onLine;
  const syncId = getCurrentUserId();

  if (syncId && online) {
    const cloud = await loadRoutineHistoryCloud();
    if (cloud && cloud.data) {
      setRoutineHistory(cloud.data, false);
      updateLocalTimestamp(STORAGE_KEYS.ROUTINE_HISTORY, cloud.updatedAt || undefined);
      return cloud.data;
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
  appState.bookmarks = bookmarks;
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.BOOKMARKS);
    if (isAuthenticated()) {
      saveBookmarksCloud(bookmarks);
    }
  }
}

export async function loadBookmarksFromStorage(): Promise<Bookmark[]> {
  const online = navigator.onLine;
  const syncId = getCurrentUserId();

  if (syncId && online) {
    const cloud = await loadBookmarksCloud();
    if (cloud && cloud.data) {
      setBookmarks(cloud.data, false);
      updateLocalTimestamp(STORAGE_KEYS.BOOKMARKS, cloud.updatedAt || undefined);
      return cloud.data;
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
 * DB-FIRST LOAD: Single source of truth is the database.
 * No localStorage fallback. If offline or not authenticated, returns null.
 */
export async function loadTimerStateFromStorage(): Promise<ActiveTimer | null> {
  const syncId = getCurrentUserId();
  
  if (syncId) {
    try {
      const cloud = await loadTimerStateCloud();
      if (cloud && cloud.data) {
        // Only accept cloud if it's running or has actual elapsed time
        if (cloud.data.isRunning || cloud.data.elapsedAcc > 0) {
          localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(cloud.data));
          updateLocalTimestamp(STORAGE_KEYS.TIMER, cloud.updatedAt || undefined);
          return cloud.data;
        }
      }
    } catch (err) {
      log.warn('Failed to fetch timer state from cloud');
    }
  }
  return null;
}

/**
 * DB-FIRST SAVE: Writes exclusively to the cloud.
 * The in-memory appState.activeTimer is the working buffer between saves.
 */
export async function saveTimerStateToStorage(state: ActiveTimer): Promise<void> {
  if (!isAuthenticated()) return; // Silent no-op when logged out
  try {
    await saveTimerStateCloud(state);
  } catch (err) {
    log.warn('DB timer save failed (offline?)');
  }
}

/**
 * DB-FIRST CLEAR: Explicitly zeros the timer record in the cloud.
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
    log.warn('DB timer clear failed (offline?)');
  }
}

// --- Reset Functions ---

function setRoutineReset(reset: string, pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.ROUTINE_RESET, reset);
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.ROUTINE_RESET);
    if (isAuthenticated()) {
      saveRoutineResetCloud(reset);
    }
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
  // Senior Developer Practice: Log state changes for critical data entities
  console.log(`[DataBridge] Syncing Tasks: ${tasks.length} items (Push to Cloud: ${pushToCloud})`);
  
  appState.tasks = tasks;
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  
  if (pushToCloud) {
    updateLocalTimestamp(STORAGE_KEYS.TASKS);
    if (isAuthenticated()) {
      saveTasksCloud(tasks);
    }
  }
}

export async function loadTasksFromStorage(): Promise<StudyTask[]> {
  const online = navigator.onLine;
  const syncId = getCurrentUserId();

  if (syncId && online) {
    const cloud = await loadTasksCloud();
    if (cloud && cloud.data) {
      setTasks(cloud.data, false);
      updateLocalTimestamp(STORAGE_KEYS.TASKS, cloud.updatedAt || undefined);
      return cloud.data;
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

export async function syncDataOnLogin(forceCloudPull = false): Promise<void> {
  log.info('Initiating data sync...', '🔄');
  updateSyncStatus('syncing');

  try {
    const results = await Promise.all([
      loadTrackerDataCloud(),
      loadSettingsCloud(),
      loadRoutinesCloud(),
      loadRoutineHistoryCloud(),
      loadBookmarksCloud(),
      loadTasksCloud(),
      loadTimerStateCloud(),
    ]);

    const [cloudTracker, cloudSettings, cloudRoutines, cloudHistory, cloudBookmarks, cloudTasks, cloudTimer] = results;

    const isLocalEmpty = (data: any) => {
      if (Array.isArray(data)) return data.length === 0;
      if (typeof data === 'object' && data !== null) return Object.keys(data).length === 0;
      return !data;
    };

    const forceRecovery = forceCloudPull || isLocalEmpty(appState.trackerData);

    if (forceRecovery) {
      log.info('CLOUD MASTER: Forcefully restoring from Cloud archives...', '🛡️');
    }

    // --- Tracker Data ---
    if (cloudTracker && (forceRecovery || isDifferent(appState.trackerData, cloudTracker.data) || isCloudNewer(STORAGE_KEYS.TRACKER_DATA, cloudTracker.updatedAt))) {
      setTrackerData(cloudTracker.data, false);
      updateLocalTimestamp(STORAGE_KEYS.TRACKER_DATA, cloudTracker.updatedAt || undefined);
    } else if (appState.trackerData.length > 0) {
      saveTrackerDataCloud(appState.trackerData);
    }

    // --- Settings ---
    if (cloudSettings && (forceRecovery || isDifferent(appState.settings, cloudSettings.data) || isCloudNewer(STORAGE_KEYS.SETTINGS, cloudSettings.updatedAt))) {
      setSettings(cloudSettings.data, false);
      updateLocalTimestamp(STORAGE_KEYS.SETTINGS, cloudSettings.updatedAt || undefined);
    } else if (Object.keys(appState.settings).length > 0) {
      saveSettingsCloud(appState.settings);
    }

    // --- Routines ---
    if (cloudRoutines && (forceRecovery || isDifferent(appState.routines, cloudRoutines.data) || isCloudNewer(STORAGE_KEYS.ROUTINES, cloudRoutines.updatedAt))) {
      setRoutines(cloudRoutines.data, false);
      updateLocalTimestamp(STORAGE_KEYS.ROUTINES, cloudRoutines.updatedAt || undefined);
    } else if (appState.routines.length > 0) {
      saveRoutinesCloud(appState.routines);
    }

    // --- History ---
    if (cloudHistory && (forceRecovery || isDifferent(appState.routineHistory, cloudHistory.data) || isCloudNewer(STORAGE_KEYS.ROUTINE_HISTORY, cloudHistory.updatedAt))) {
      setRoutineHistory(cloudHistory.data, false);
      updateLocalTimestamp(STORAGE_KEYS.ROUTINE_HISTORY, cloudHistory.updatedAt || undefined);
    } else if (Object.keys(appState.routineHistory).length > 0) {
      saveRoutineHistoryCloud(appState.routineHistory);
    }

    // --- Bookmarks ---
    if (cloudBookmarks && (forceRecovery || isDifferent(appState.bookmarks, cloudBookmarks.data) || isCloudNewer(STORAGE_KEYS.BOOKMARKS, cloudBookmarks.updatedAt))) {
      setBookmarks(cloudBookmarks.data, false);
      updateLocalTimestamp(STORAGE_KEYS.BOOKMARKS, cloudBookmarks.updatedAt || undefined);
    } else if (appState.bookmarks.length > 0) {
      saveBookmarksCloud(appState.bookmarks);
    }

    // --- Tasks ---
    if (cloudTasks && (forceRecovery || isDifferent(appState.tasks, cloudTasks.data) || isCloudNewer(STORAGE_KEYS.TASKS, cloudTasks.updatedAt))) {
      setTasks(cloudTasks.data, false);
      updateLocalTimestamp(STORAGE_KEYS.TASKS, cloudTasks.updatedAt || undefined);
    } else if (appState.tasks.length > 0) {
      saveTasksCloud(appState.tasks);
    }

    if (cloudTimer && (isDifferent(appState.activeTimer, cloudTimer.data) || isCloudNewer(STORAGE_KEYS.TIMER, cloudTimer.updatedAt))) {
      Object.assign(appState.activeTimer, cloudTimer.data);
      updateLocalTimestamp(STORAGE_KEYS.TIMER, cloudTimer.updatedAt || undefined);
    }

    const cloudResetRaw = await loadRoutineResetCloud();
    if (cloudResetRaw) setRoutineReset(cloudResetRaw, false);

    // 5. Restore User Profile & Identity (Modular Registry V2)
    const cloudProfile = await loadUserProfileCloud();
    if (cloudProfile) {
      const userProfile = {
        displayName: cloudProfile.display_name,
        realName: cloudProfile.User_name || '',
        dob: cloudProfile.dob || '',
        nation: cloudProfile.nation || 'Global',
        avatar: cloudProfile.avatar || '👨',
        phoneNumber: cloudProfile.phone_number || '',
        email: cloudProfile.email || '',
        isFocusPublic: cloudProfile.is_focus_public !== false
      };
      setSecureLocalProfileString(JSON.stringify(userProfile));
      localStorage.setItem('tracker_username', userProfile.displayName);
      log.success('IDENTITY SYNCED: Profile re-established from secure vault.');
    }

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

    if (cloudTracker && (isDifferent(appState.trackerData, cloudTracker.data) || isCloudNewer(STORAGE_KEYS.TRACKER_DATA, cloudTracker.updatedAt))) { 
      setTrackerData(cloudTracker.data, false); 
      updateLocalTimestamp(STORAGE_KEYS.TRACKER_DATA, cloudTracker.updatedAt || undefined);
      changed = true; 
    }
    if (cloudSettings && (isDifferent(appState.settings, cloudSettings.data) || isCloudNewer(STORAGE_KEYS.SETTINGS, cloudSettings.updatedAt))) { 
      setSettings(cloudSettings.data, false); 
      updateLocalTimestamp(STORAGE_KEYS.SETTINGS, cloudSettings.updatedAt || undefined);
      changed = true; 
    }
    if (cloudRoutines && (isDifferent(appState.routines, cloudRoutines.data) || isCloudNewer(STORAGE_KEYS.ROUTINES, cloudRoutines.updatedAt))) { 
      setRoutines(cloudRoutines.data, false); 
      updateLocalTimestamp(STORAGE_KEYS.ROUTINES, cloudRoutines.updatedAt || undefined);
      changed = true; 
    }
    if (cloudHistory && (isDifferent(appState.routineHistory, cloudHistory.data) || isCloudNewer(STORAGE_KEYS.ROUTINE_HISTORY, cloudHistory.updatedAt))) { 
      setRoutineHistory(cloudHistory.data, false); 
      updateLocalTimestamp(STORAGE_KEYS.ROUTINE_HISTORY, cloudHistory.updatedAt || undefined);
      changed = true; 
    }
    if (cloudBookmarks && (isDifferent(appState.bookmarks, cloudBookmarks.data) || isCloudNewer(STORAGE_KEYS.BOOKMARKS, cloudBookmarks.updatedAt))) { 
      setBookmarks(cloudBookmarks.data, false); 
      updateLocalTimestamp(STORAGE_KEYS.BOOKMARKS, cloudBookmarks.updatedAt || undefined);
      changed = true; 
    }
    if (cloudTasks && (isDifferent(appState.tasks, cloudTasks.data) || isCloudNewer(STORAGE_KEYS.TASKS, cloudTasks.updatedAt))) { 
      setTasks(cloudTasks.data, false); 
      updateLocalTimestamp(STORAGE_KEYS.TASKS, cloudTasks.updatedAt || undefined);
      changed = true; 
    }
    if (cloudTimer && (isDifferent(appState.activeTimer, cloudTimer.data) || isCloudNewer(STORAGE_KEYS.TIMER, cloudTimer.updatedAt))) { 
      Object.assign(appState.activeTimer, cloudTimer.data); 
      updateLocalTimestamp(STORAGE_KEYS.TIMER, cloudTimer.updatedAt || undefined);
      changed = true; 
    }

    if (changed) {
      await refreshAppAfterSync();
    }
  } catch (err) {
    log.warn('Background sync failed silent fallback.');
  }
}

/** Updates the UI after the cloud data is finished downloading */
async function refreshAppAfterSync(): Promise<void> {
  // Reimport dynamically to avoid circular deps at startup
  const { refreshApplicationUI } = await import('@/main');
  await refreshApplicationUI();
}

/** 
 * 🚀 INITIALIZE TACTICAL LIVE SYNC
 * Subscribes to the personal vault after the first successful login.
 */
export async function startLiveSync(): Promise<void> {
  if (!isAuthenticated()) return;
  log.info('LIVE SYNC: Activating identity-locked cloud listeners...', '🚀');
  await subscribeToUserDataSync(() => {
    void performBackgroundSync();
  });
}

/**
 * ⚡ REAL-TIME DATA PROCESSOR
 * Handles incoming WebSocket payloads and patches the local appState immediately.
 */
export async function handleUserDataSync(payload: any): Promise<void> {
  if (!payload) return;
  await performBackgroundSync();
}
