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
  drainOfflineSessionQueue,
} from '@/services/vault.service';
import { appState, ensureTimelineIntegrity, syncTrackerTimelineWithSettings } from '@/state/app-state';
import { 
  saveLocal, loadLocal, 
  saveSecuredSettings, loadSecuredSettings, 
  updateLocalTimestamp, getLocalTimestamp
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
  // Also persist into the settings blob so it syncs to cloud
  if (appState.settings.lastRoutineReset !== reset) {
    appState.settings.lastRoutineReset = reset;
    saveSettingsToStorage({ lastRoutineReset: reset });
  }
}

export async function loadRoutineResetFromStorage(): Promise<string | null> {
  // Prefer local key, fall back to what came from cloud via settings
  return localStorage.getItem(STORAGE_KEYS.ROUTINE_RESET) ||
    (appState.settings.lastRoutineReset as string | undefined) ||
    null;
}

// --- Settings ---
export async function saveSettingsToStorage(settings: any): Promise<void> {
  appState.settings = { ...appState.settings, ...settings };
  saveSecuredSettings(appState.settings);
  updateLocalTimestamp(STORAGE_KEYS.SETTINGS);
  if (isAuthenticated()) saveSettingsCloud(appState.settings);
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
  return loadLocal<any>(STORAGE_KEYS.TIMER);
}

export async function saveTimerStateToStorage(state: any): Promise<void> {
  saveLocal(STORAGE_KEYS.TIMER, state);
  updateLocalTimestamp(STORAGE_KEYS.TIMER);
  if (isAuthenticated()) saveTimerStateCloud(state).catch(() => {});
}

export async function clearTimerStateDB(): Promise<void> {
  const idleState = { isRunning: false, elapsedAcc: 0, startTime: null, category: null, colName: '', sessionStartClock: null, activeBreak: null, completedBreaks: [], lastUpdatedAt: Date.now() };
  saveLocal(STORAGE_KEYS.TIMER, idleState);
  updateLocalTimestamp(STORAGE_KEYS.TIMER);
  
  if (isAuthenticated()) {
    // Retry up to 3 times to ensure the cloud is cleaned
    let attempts = 0;
    const tryWipe = async () => {
      try {
        await saveTimerStateCloud(idleState);
        log.info('Cloud Wipe: Timer state cleared successfully.');
      } catch (err) {
        if (attempts < 3) {
          attempts++;
          setTimeout(tryWipe, 2000 * attempts);
        }
      }
    };
    await tryWipe();
  }
}

// --- Cloud Sync Orchestration ---
export async function syncDataOnLogin(forceCloudPull = false): Promise<void> {
  updateSyncStatus('syncing');
  try {
    const results = await Promise.all([
      loadTrackerDataCloud(), loadSettingsCloud(), loadRoutinesCloud(),
      loadRoutineHistoryCloud(), loadBookmarksCloud(), loadTasksCloud(), loadTimerStateCloud()
    ]);

    const [cloudTracker, cloudSettings, cloudRoutines, _cloudHistory, cloudBookmarks, cloudTasks, cloudTimer] = results;
    const force = forceCloudPull || isLocalEmpty(appState.trackerData);

    const sync = (key: string, cloud: any, local: any, setter: Function, cloudSaver: Function) => {
      const isNewer = isCloudNewer(key, cloud?.updatedAt);
      const isDiff = cloud && isDifferent(local, cloud.data);
      const isCloudDataEmpty = cloud && isLocalEmpty(cloud.data);
      
      if (cloud && force) {
        setter(cloud.data, false);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
      } else if (cloud && isNewer && !isCloudDataEmpty) {
        // Cloud is newer and HAS DATA: Overwrite local
        setter(cloud.data, false);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
      } else if (isDiff && !isLocalEmpty(local)) {
        // Local is newer, OR cloud is newer but empty: Push local to cloud
        cloudSaver(local);
      } else if (!cloud && !isLocalEmpty(local)) {
        // Cloud is empty/missing but local has data: Push to cloud
        cloudSaver(local);
      }
    };

    sync(STORAGE_KEYS.TRACKER_DATA, cloudTracker, appState.trackerData, (d: any) => { appState.trackerData = d; syncTrackerTimelineWithSettings(); ensureTimelineIntegrity(); saveLocal(STORAGE_KEYS.TRACKER_DATA, appState.trackerData); }, saveTrackerDataCloud);
    sync(STORAGE_KEYS.SETTINGS, cloudSettings, appState.settings, (d: any) => { appState.settings = { ...appState.settings, ...d }; saveSecuredSettings(d); }, saveSettingsCloud);
    sync(STORAGE_KEYS.ROUTINES, cloudRoutines, appState.routines, (d: any) => { appState.routines = d; saveLocal(STORAGE_KEYS.ROUTINES, d); }, saveRoutinesCloud);
    sync(STORAGE_KEYS.TASKS, cloudTasks, appState.tasks, (d: any) => { appState.tasks = d; saveLocal(STORAGE_KEYS.TASKS, d); }, saveTasksCloud);
    sync(STORAGE_KEYS.BOOKMARKS, cloudBookmarks, appState.bookmarks, (d: any) => { appState.bookmarks = d; saveLocal(STORAGE_KEYS.BOOKMARKS, d); }, saveBookmarksCloud);

    // If cloud timer is >24h old and running, it's a ghost session. Clear it.
    if (cloudTimer?.data?.isRunning && cloudTimer?.data?.startTime) {
      const elapsed = Date.now() - cloudTimer.data.startTime;
      if (elapsed > 86400000) { // 24 Hours
        log.warn('Ghost session detected: Clearing impossible cloud session.');
        await clearTimerStateDB();
      } else {
        Object.assign(appState.activeTimer, cloudTimer.data);
      }
    } else if (cloudTimer?.data) {
      Object.assign(appState.activeTimer, cloudTimer.data);
    }

    // Profile Restore
    const profile = await loadUserProfileCloud();
    if (profile) {
      const user = { displayName: profile.display_name, avatar: profile.avatar || '👨', email: profile.email || '' };
      setSecureLocalProfileString(JSON.stringify(user));
      localStorage.setItem('tracker_username', user.displayName);
    }

    await refreshAppAfterSync();
    updateSyncStatus('synced');

    // Re-verify sessions vs tracker after sync
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
    // Drain any queued offline sessions first
    await drainOfflineSessionQueue();

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

    const check = (key: string, cloud: any, _local: any, setter: Function) => {
      if (cloud && isCloudNewer(key, cloud.updatedAt)) {
        setter(cloud.data);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
        changed = true;
      }
    };

    check(STORAGE_KEYS.TRACKER_DATA, cloud[0], appState.trackerData, (d: any) => { appState.trackerData = d; syncTrackerTimelineWithSettings(); ensureTimelineIntegrity(); saveLocal(STORAGE_KEYS.TRACKER_DATA, appState.trackerData); });
    check(STORAGE_KEYS.SETTINGS, cloud[1], appState.settings, (d: any) => { appState.settings = { ...appState.settings, ...d }; saveSecuredSettings(d); });
    check(STORAGE_KEYS.ROUTINES, cloud[2], appState.routines, (d: any) => { appState.routines = d; saveLocal(STORAGE_KEYS.ROUTINES, d); });
    check(STORAGE_KEYS.TASKS, cloud[3], appState.tasks, (d: any) => { appState.tasks = d; saveLocal(STORAGE_KEYS.TASKS, d); });
    check(STORAGE_KEYS.ROUTINE_HISTORY, cloud[4], appState.routineHistory, (d: any) => { appState.routineHistory = d; saveLocal(STORAGE_KEYS.ROUTINE_HISTORY, d); });
    check(STORAGE_KEYS.BOOKMARKS, cloud[5], appState.bookmarks, (d: any) => { appState.bookmarks = d; saveLocal(STORAGE_KEYS.BOOKMARKS, d); });
    
    // Adopt cloud timer if newer
    if (cloud[6]?.data) {
      const cloudTs = cloud[6].updatedAt ? new Date(cloud[6].updatedAt).getTime() : 0;
      const localTs = getLocalTimestamp(STORAGE_KEYS.TIMER);
      if (cloudTs > localTs) {
        Object.assign(appState.activeTimer, cloud[6].data);
        saveLocal(STORAGE_KEYS.TIMER, cloud[6].data);
        updateLocalTimestamp(STORAGE_KEYS.TIMER, cloud[6].updatedAt ?? undefined);
        changed = true;
      }
    }

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
