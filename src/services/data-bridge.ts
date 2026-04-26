import { STORAGE_KEYS } from '@/config/constants';
import { getCurrentUserId } from '@/services/auth.service';
import { log } from '@/utils/logger.utils';
import { setSecureLocalProfileString } from '@/utils/security';
import {
  saveTrackerDataCloud, loadTrackerDataCloud,
  saveSettingsCloud, loadSettingsCloud,
  saveRoutinesCloud, loadRoutinesCloud,
  saveBookmarksCloud, loadBookmarksCloud,
  saveRoutineHistoryCloud, loadRoutineHistoryCloud,
  saveTimerStateCloud, loadTimerStateCloud,
  saveTasksCloud, loadTasksCloud,
  loadUserProfileCloud,
  updateSyncStatus,
  subscribeToUserDataSync,
} from '@/services/vault.service';
import { appState, ensureTimelineIntegrity } from '@/state/app-state';
import { 
  saveLocal, loadLocal, removeLocal, 
  saveSecuredSettings, loadSecuredSettings, 
  updateLocalTimestamp 
} from './data.storage';
import { isCloudNewer, isDifferent, isLocalEmpty } from './data.sync';

// --- Auth Helpers ---
function isAuthenticated(): boolean { return getCurrentUserId() !== null; }

// --- Tracker ---
export async function saveTrackerDataToStorage(data: any[]): Promise<void> {
  appState.trackerData = data;
  ensureTimelineIntegrity();
  saveLocal(STORAGE_KEYS.TRACKER_DATA, appState.trackerData);
  updateLocalTimestamp(STORAGE_KEYS.TRACKER_DATA);
  if (isAuthenticated()) saveTrackerDataCloud(data);
}

export async function loadTrackerDataFromStorage(): Promise<any[]> {
  return loadLocal<any[]>(STORAGE_KEYS.TRACKER_DATA) || [];
}

// --- History ---
export async function saveRoutineHistoryToStorage(history: any): Promise<void> {
  appState.routineHistory = history;
  saveLocal(STORAGE_KEYS.ROUTINE_HISTORY, history);
  updateLocalTimestamp(STORAGE_KEYS.ROUTINE_HISTORY);
  if (isAuthenticated()) saveRoutineHistoryCloud(history);
}

export async function loadRoutineHistoryFromStorage(): Promise<any> {
  return loadLocal<any>(STORAGE_KEYS.ROUTINE_HISTORY) || {};
}

// --- Bookmarks ---
export async function saveBookmarksToStorage(bookmarks: any[]): Promise<void> {
  appState.bookmarks = bookmarks;
  saveLocal(STORAGE_KEYS.BOOKMARKS, bookmarks);
  updateLocalTimestamp(STORAGE_KEYS.BOOKMARKS);
  if (isAuthenticated()) saveBookmarksCloud(bookmarks);
}

export async function loadBookmarksFromStorage(): Promise<any[]> {
  return loadLocal<any[]>(STORAGE_KEYS.BOOKMARKS) || [];
}

// --- Routine Reset ---
export async function saveRoutineResetToStorage(reset: string): Promise<void> {
  saveLocal(STORAGE_KEYS.ROUTINE_RESET, reset);
  updateLocalTimestamp(STORAGE_KEYS.ROUTINE_RESET);
}

export async function loadRoutineResetFromStorage(): Promise<string | null> {
  return localStorage.getItem(STORAGE_KEYS.ROUTINE_RESET);
}

// --- Settings ---
export async function saveSettingsToStorage(settings: any): Promise<void> {
  appState.settings = { ...appState.settings, ...settings };
  saveSecuredSettings(settings);
  updateLocalTimestamp(STORAGE_KEYS.SETTINGS);
  if (isAuthenticated()) saveSettingsCloud(settings);
}

export async function loadSettingsFromStorage(): Promise<any | null> {
  return loadSecuredSettings();
}

// --- Routines & Tasks (Generic Logic) ---
export async function saveRoutinesToStorage(data: any[]): Promise<void> {
  appState.routines = data;
  saveLocal(STORAGE_KEYS.ROUTINES, data);
  updateLocalTimestamp(STORAGE_KEYS.ROUTINES);
  if (isAuthenticated()) saveRoutinesCloud(data);
}

export async function loadRoutinesFromStorage(): Promise<any[]> { return loadLocal<any[]>(STORAGE_KEYS.ROUTINES) || []; }

export async function saveTasksToStorage(data: any[]): Promise<void> {
  appState.tasks = data;
  saveLocal(STORAGE_KEYS.TASKS, data);
  updateLocalTimestamp(STORAGE_KEYS.TASKS);
  if (isAuthenticated()) saveTasksCloud(data);
}

export async function loadTasksFromStorage(): Promise<any[]> { return loadLocal<any[]>(STORAGE_KEYS.TASKS) || []; }

// --- Timer (Pure Sync) ---
export async function loadTimerStateFromStorage(): Promise<any | null> {
  const local = loadLocal<any>(STORAGE_KEYS.TIMER);
  if (isAuthenticated()) {
    loadTimerStateCloud().then(cloud => {
      if (cloud?.data && (cloud.data.isRunning || cloud.data.elapsedAcc > 0)) {
        saveLocal(STORAGE_KEYS.TIMER, cloud.data);
        updateLocalTimestamp(STORAGE_KEYS.TIMER, cloud.updatedAt || undefined);
      }
    }).catch(() => {});
  }
  return local;
}

export async function saveTimerStateToStorage(state: any): Promise<void> {
  saveLocal(STORAGE_KEYS.TIMER, state);
  updateLocalTimestamp(STORAGE_KEYS.TIMER);
  if (isAuthenticated()) saveTimerStateCloud(state).catch(() => {});
}

export async function clearTimerStateDB(): Promise<void> {
  removeLocal(STORAGE_KEYS.TIMER);
  if (isAuthenticated()) saveTimerStateCloud({ isRunning: false, elapsedAcc: 0, startTime: null, category: null, colName: '', sessionStartClock: null }).catch(() => {});
}

// --- Cloud Sync Orchestration ---
export async function syncDataOnLogin(forceCloudPull = false): Promise<void> {
  updateSyncStatus('syncing');
  try {
    const results = await Promise.all([
      loadTrackerDataCloud(), loadSettingsCloud(), loadRoutinesCloud(),
      loadRoutineHistoryCloud(), loadBookmarksCloud(), loadTasksCloud(), loadTimerStateCloud()
    ]);

    const [cloudTracker, cloudSettings, cloudRoutines, cloudHistory, cloudBookmarks, cloudTasks, cloudTimer] = results;
    const force = forceCloudPull || isLocalEmpty(appState.trackerData);

    const sync = (key: string, cloud: any, local: any, setter: Function, cloudSaver: Function) => {
      if (cloud && (force || isDifferent(local, cloud.data) || isCloudNewer(key, cloud.updatedAt))) {
        setter(cloud.data, false);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
      } else if (!isLocalEmpty(local)) {
        cloudSaver(local);
      }
    };

    sync(STORAGE_KEYS.TRACKER_DATA, cloudTracker, appState.trackerData, (d: any) => { appState.trackerData = d; ensureTimelineIntegrity(); saveLocal(STORAGE_KEYS.TRACKER_DATA, d); }, saveTrackerDataCloud);
    sync(STORAGE_KEYS.SETTINGS, cloudSettings, appState.settings, (d: any) => saveSecuredSettings(d), saveSettingsCloud);
    sync(STORAGE_KEYS.ROUTINES, cloudRoutines, appState.routines, (d: any) => { appState.routines = d; saveLocal(STORAGE_KEYS.ROUTINES, d); }, saveRoutinesCloud);
    sync(STORAGE_KEYS.TASKS, cloudTasks, appState.tasks, (d: any) => { appState.tasks = d; saveLocal(STORAGE_KEYS.TASKS, d); }, saveTasksCloud);
    sync(STORAGE_KEYS.BOOKMARKS, cloudBookmarks, appState.bookmarks, (d: any) => { appState.bookmarks = d; saveLocal(STORAGE_KEYS.BOOKMARKS, d); }, saveBookmarksCloud);

    // Profile Restore
    const profile = await loadUserProfileCloud();
    if (profile) {
      const user = { displayName: profile.display_name, avatar: profile.avatar || '👨', email: profile.email || '' };
      setSecureLocalProfileString(JSON.stringify(user));
      localStorage.setItem('tracker_username', user.displayName);
    }

    await refreshAppAfterSync();
    updateSyncStatus('synced');

    // 🛡️ FINAL INTEGRITY CHECK: Re-verify sessions vs tracker after sync
    import('@/features/profile/profile.manager').then(m => {
      m.checkProfileIdentity();
    });
  } catch (err) {
    log.error('Sync failure:', err);
    updateSyncStatus('error');
  }
}

export async function performBackgroundSync(): Promise<void> {
  if (!isAuthenticated()) return;
  try {
    const cloud = await Promise.all([
      loadTrackerDataCloud(), 
      loadSettingsCloud(), 
      loadRoutinesCloud(), 
      loadTasksCloud(),
      loadRoutineHistoryCloud(),
      loadBookmarksCloud(),
      loadTimerStateCloud()
    ]);
    let changed = false;

    const check = (key: string, cloud: any, local: any, setter: Function) => {
      if (cloud && (isDifferent(local, cloud.data) || isCloudNewer(key, cloud.updatedAt))) {
        setter(cloud.data);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
        changed = true;
      }
    };

    check(STORAGE_KEYS.TRACKER_DATA, cloud[0], appState.trackerData, (d: any) => { appState.trackerData = d; ensureTimelineIntegrity(); saveLocal(STORAGE_KEYS.TRACKER_DATA, d); });
    check(STORAGE_KEYS.SETTINGS, cloud[1], appState.settings, (d: any) => saveSecuredSettings(d));
    check(STORAGE_KEYS.ROUTINES, cloud[2], appState.routines, (d: any) => { appState.routines = d; saveLocal(STORAGE_KEYS.ROUTINES, d); });
    check(STORAGE_KEYS.TASKS, cloud[3], appState.tasks, (d: any) => { appState.tasks = d; saveLocal(STORAGE_KEYS.TASKS, d); });
    check(STORAGE_KEYS.ROUTINE_HISTORY, cloud[4], appState.routineHistory, (d: any) => { appState.routineHistory = d; saveLocal(STORAGE_KEYS.ROUTINE_HISTORY, d); });
    check(STORAGE_KEYS.BOOKMARKS, cloud[5], appState.bookmarks, (d: any) => { appState.bookmarks = d; saveLocal(STORAGE_KEYS.BOOKMARKS, d); });

    // Timer sync is handled separately via the 'Live' subscription in timer.ts for instant HUD response.

    if (changed) await refreshAppAfterSync();
  } catch (err) { /* silent */ }
}

async function refreshAppAfterSync(): Promise<void> {
  const { refreshApplicationUI } = await import('@/core/mission-pulse');
  await refreshApplicationUI();
}

export async function startLiveSync(): Promise<void> {
  if (isAuthenticated()) await subscribeToUserDataSync(() => performBackgroundSync());
}

export async function handleUserDataSync(payload: any): Promise<void> {
  if (payload) await performBackgroundSync();
}
