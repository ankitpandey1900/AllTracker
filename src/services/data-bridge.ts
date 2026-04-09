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
import { applyThemeToDOM } from '@/state/app-state';


// --- Auth Check ---

function isAuthenticated(): boolean {
  return getCurrentUserId() !== null;
}

// --- Tracker Data Functions ---

function setTrackerData(data: TrackerDay[], pushToCloud = true): void {
  const current = localStorage.getItem(STORAGE_KEYS.TRACKER_DATA);
  const next = JSON.stringify(data);
  if (current === next) return; // Prevent redundant local saves

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
  
  // 🛡️ AUTH WALL: Prevent saving sensitive API keys if not authenticated
  if (!syncId && settings.groqApiKey) {
    console.warn('🔒 SECURITY BLOCKED: Cannot save API keys without an active Mission Profile.');
    settings.groqApiKey = ''; 
  }

  // 🔐 IDENTITY-LINKED VAULT (V3): Mask the AI key using user ID as a salt
  const securedSettings = { 
    ...settings, 
    groqApiKey: settings.groqApiKey ? obfuscate(settings.groqApiKey, syncId) : '' 
  };
  
  const current = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  const next = JSON.stringify(securedSettings);
  if (current === next) return;

  localStorage.setItem(STORAGE_KEYS.SETTINGS, next);
  
  if (pushToCloud && isAuthenticated()) {
    saveSettingsCloud(settings); // Cloud gets the raw key for processing
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

// --- Timer Functions ---

function setTimerState(state: ActiveTimer, pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(state));
  if (pushToCloud && isAuthenticated()) {
    saveTimerStateCloud(state);
  }
}

export async function loadTimerStateFromStorage(): Promise<ActiveTimer | null> {
  const syncId = getCurrentUserId();
  
  if (syncId) {
    try {
      const cloud = await loadTimerStateCloud();
      if (cloud) {
        // Only accept cloud if it's running or has actual elapsed time
        if (cloud.isRunning || cloud.elapsedAcc > 0) {
          localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(cloud));
          return cloud;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch timer state from cloud:', err);
    }
  }

  const saved = localStorage.getItem(STORAGE_KEYS.TIMER);
  let local: ActiveTimer | null = null;
  if (saved) { try { local = JSON.parse(saved); } catch { /* noop */ } }
  return local;
}

export async function saveTimerStateToStorage(state: ActiveTimer): Promise<void> {
  setTimerState(state);
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

    // Cloud wins if it exists
    if (cloudTracker) setTrackerData(cloudTracker, false);
    if (cloudSettings) setSettings(cloudSettings, false);
    if (cloudRoutines) setRoutines(cloudRoutines, false);
    if (cloudHistory) setRoutineHistory(cloudHistory, false);
    if (cloudBookmarks) setBookmarks(cloudBookmarks, false);
    if (cloudTasks) setTasks(cloudTasks, false);
    if (cloudTimer) setTimerState(cloudTimer, false);

    const cloudReset = await loadRoutineResetCloud();
    if (cloudReset) setRoutineReset(cloudReset, false);

    // 5. Restore User Profile & Identity
    const cloudProfile = await loadUserProfileCloud();
    if (cloudProfile) {
      const userProfile = {
        displayName: cloudProfile.display_name,
        age: cloudProfile.age,
        nation: cloudProfile.nation,
        avatar: cloudProfile.avatar
      };
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
      localStorage.setItem('tracker_username', userProfile.displayName);
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
    if (cloudTimer && JSON.stringify(cloudTimer) !== localStorage.getItem(STORAGE_KEYS.TIMER)) { setTimerState(cloudTimer, false); changed = true; }

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
