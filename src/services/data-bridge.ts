/**
 * Data bridge — hybrid cloud + local storage layer
 *
 * Every save/load operation goes through this bridge.
 * If the user is authenticated (has a Sync ID), data syncs to Supabase.
 * Local storage is always used as the primary cache.
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


// ─── Auth Check ──────────────────────────────────────────────

function isAuthenticated(): boolean {
  return getCurrentUserId() !== null;
}

// ─── Tracker Data ────────────────────────────────────────────

function setTrackerData(data: TrackerDay[], pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.TRACKER_DATA, JSON.stringify(data));
  if (pushToCloud && isAuthenticated()) {
    saveTrackerDataCloud(data);
  }
}

export async function loadTrackerDataFromStorage(): Promise<TrackerDay[]> {
  if (isAuthenticated()) {
    const cloud = await loadTrackerDataCloud();
    if (cloud) { setTrackerData(cloud, false); return cloud; }
  }
  const saved = localStorage.getItem(STORAGE_KEYS.TRACKER_DATA);
  if (saved) { try { return JSON.parse(saved); } catch { return []; } }
  return [];
}

export async function saveTrackerDataToStorage(data: TrackerDay[]): Promise<void> {
  setTrackerData(data);
}

// ─── Settings ────────────────────────────────────────────────

import { obfuscate, deobfuscate } from '@/utils/security';

function setSettings(settings: Settings, pushToCloud = true): void {
  // Vault Masking: Obfuscate sensitive keys before saving to local disk
  const securedSettings = { 
    ...settings, 
    groqApiKey: settings.groqApiKey ? obfuscate(settings.groqApiKey) : '' 
  };
  
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(securedSettings));
  
  if (pushToCloud && isAuthenticated()) {
    saveSettingsCloud(settings); // Cloud gets the raw key for processing
  }
}

export async function loadSettingsFromStorage(): Promise<Settings | null> {
  if (isAuthenticated()) {
    const cloud = await loadSettingsCloud();
    if (cloud) { 
      setSettings(cloud, false); 
      if (cloud.theme) applyThemeToDOM(cloud.theme);
      return cloud; 
    }
  }
  
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (saved) { 
    try { 
      const settings = JSON.parse(saved) as Settings;
      // Vault Unmasking: Deobfuscate sensitive keys for runtime use
      if (settings.groqApiKey) {
        settings.groqApiKey = deobfuscate(settings.groqApiKey);
      }
      if (settings.theme) {
        applyThemeToDOM(settings.theme);
      }
      return settings;
    } catch { 
      return null; 
    } 
  }
  return null;
}

export async function saveSettingsToStorage(settings: Settings): Promise<void> {
  setSettings(settings);
}

// ─── Routines ────────────────────────────────────────────────

function setRoutines(routines: RoutineItem[], pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  if (pushToCloud && isAuthenticated()) {
    saveRoutinesCloud(routines);
  }
}

export async function loadRoutinesFromStorage(): Promise<RoutineItem[]> {
  if (isAuthenticated()) {
    const cloud = await loadRoutinesCloud();
    if (cloud) { setRoutines(cloud, false); return cloud; }
  }
  const saved = localStorage.getItem(STORAGE_KEYS.ROUTINES);
  if (saved) { try { return JSON.parse(saved); } catch { return []; } }
  return [];
}

export async function saveRoutinesToStorage(routines: RoutineItem[]): Promise<void> {
  setRoutines(routines);
}



// ─── Routine History ─────────────────────────────────────────

function setRoutineHistory(history: RoutineHistory, pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.ROUTINE_HISTORY, JSON.stringify(history));
  if (pushToCloud && isAuthenticated()) {
    saveRoutineHistoryCloud(history);
  }
}

export async function loadRoutineHistoryFromStorage(): Promise<RoutineHistory> {
  if (isAuthenticated()) {
    const cloud = await loadRoutineHistoryCloud();
    if (cloud) { setRoutineHistory(cloud, false); return cloud; }
  }
  const saved = localStorage.getItem(STORAGE_KEYS.ROUTINE_HISTORY);
  if (saved) { try { return JSON.parse(saved); } catch { return {}; } }
  return {};
}

export async function saveRoutineHistoryToStorage(history: RoutineHistory): Promise<void> {
  setRoutineHistory(history);
}

// ─── Bookmarks ───────────────────────────────────────────────

function setBookmarks(bookmarks: Bookmark[], pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  if (pushToCloud && isAuthenticated()) {
    saveBookmarksCloud(bookmarks);
  }
}

export async function loadBookmarksFromStorage(): Promise<Bookmark[]> {
  if (isAuthenticated()) {
    const cloud = await loadBookmarksCloud();
    if (cloud) { setBookmarks(cloud, false); return cloud; }
  }
  const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
  if (saved) { try { return JSON.parse(saved); } catch { return []; } }
  return [];
}

export async function saveBookmarksToStorage(bookmarks: Bookmark[]): Promise<void> {
  setBookmarks(bookmarks);
}

// ─── Timer State ─────────────────────────────────────────────

function setTimerState(state: ActiveTimer, pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(state));
  if (pushToCloud && isAuthenticated()) {
    saveTimerStateCloud(state);
  }
}

export async function loadTimerStateFromStorage(): Promise<ActiveTimer | null> {
  const saved = localStorage.getItem(STORAGE_KEYS.TIMER);
  let local: ActiveTimer | null = null;
  if (saved) { try { local = JSON.parse(saved); } catch { /* noop */ } }
  if (!local && isAuthenticated()) return await loadTimerStateCloud();
  return local;
}

export async function saveTimerStateToStorage(state: ActiveTimer): Promise<void> {
  setTimerState(state);
}

// ─── Routine Reset ───────────────────────────────────────────

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

// ─── Tasks ───────────────────────────────────────────────────

function setTasks(tasks: StudyTask[], pushToCloud = true): void {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  if (pushToCloud && isAuthenticated()) {
    saveTasksCloud(tasks);
  }
}

export async function loadTasksFromStorage(): Promise<StudyTask[]> {
  if (isAuthenticated()) {
    const cloud = await loadTasksCloud();
    if (cloud) { setTasks(cloud, false); return cloud; }
  }
  const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (saved) { try { return JSON.parse(saved); } catch { return []; } }
  return [];
}

export async function saveTasksToStorage(tasks: StudyTask[]): Promise<void> {
  setTasks(tasks);
}

// ─── Clear All ───────────────────────────────────────────────

export function clearLocalData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// ─── Full Sync (called on login) ────────────────────────────

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

/** Refreshes app state and UI after cloud sync */
async function refreshAppAfterSync(): Promise<void> {
  // Reimport dynamically to avoid circular deps at startup
  const { refreshApplicationUI } = await import('@/main');
  await refreshApplicationUI();
}
