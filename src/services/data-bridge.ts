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
  saveTasksCloud, loadTasksCloud, deleteTaskCloud,
  upsertPhaseCloud, deletePhaseCloud,
  loadUserProfileCloud,
  updateSyncStatus,
  subscribeToUserDataSync,
  drainOfflineSessionQueue,
  saveRoadmapCloud, loadRoadmapCloud,
} from '@/services/vault.service';
import { appState, ensureTimelineIntegrity, syncTrackerTimelineWithSettings, calculateDates } from '@/state/app-state';
import { 
  saveLocal, loadLocal,
  updateLocalTimestamp, getLocalTimestamp
} from './data.storage';
import { isCloudNewer, isDifferent, isLocalEmpty } from './data.sync';

// --- Auth Helpers ---
function isAuthenticated(): boolean { return getCurrentUserId() !== null; }

// Vault writes replace whole collections. Keep one ordered write stream per
// collection so rapid edits cannot let an older snapshot finish last.
const pendingVaultWrites = new Map<string, Promise<void>>();

function snapshotForSync<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

function queueVaultWrite(key: string, write: () => Promise<void>): void {
  if (!isAuthenticated()) return;

  const previous = pendingVaultWrites.get(key) || Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(write)
    .catch((error) => {
      log.error(`Vault save failed for ${key}; local cache retained.`, error);
    });

  pendingVaultWrites.set(key, next);
  void next.finally(() => {
    if (pendingVaultWrites.get(key) === next) pendingVaultWrites.delete(key);
  });
}

// --- Tracker ---
export async function saveTrackerDataToStorage(data: any[]): Promise<void> {
  appState.trackerData = data;
  ensureTimelineIntegrity();
  const snapshot = snapshotForSync(appState.trackerData);
  saveLocal(STORAGE_KEYS.TRACKER_DATA, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.TRACKER_DATA);
  queueVaultWrite(STORAGE_KEYS.TRACKER_DATA, () => saveTrackerDataCloud(snapshot));
}

export async function loadTrackerDataFromStorage(): Promise<any[]> {
  return loadLocal<any[]>(STORAGE_KEYS.TRACKER_DATA) || [];
}

// --- History ---
export async function saveRoutineHistoryToStorage(history: any): Promise<void> {
  appState.routineHistory = history;
  const snapshot = snapshotForSync(history);
  saveLocal(STORAGE_KEYS.ROUTINE_HISTORY, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.ROUTINE_HISTORY);
  queueVaultWrite(STORAGE_KEYS.ROUTINE_HISTORY, () => saveRoutineHistoryCloud(snapshot));
}

export async function loadRoutineHistoryFromStorage(): Promise<any> {
  return loadLocal<any>(STORAGE_KEYS.ROUTINE_HISTORY) || {};
}

// --- Bookmarks ---
export async function saveBookmarksToStorage(bookmarks: any[]): Promise<void> {
  appState.bookmarks = bookmarks;
  const snapshot = snapshotForSync(bookmarks);
  saveLocal(STORAGE_KEYS.BOOKMARKS, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.BOOKMARKS);
  queueVaultWrite(STORAGE_KEYS.BOOKMARKS, () => saveBookmarksCloud(snapshot));
}

export async function loadBookmarksFromStorage(): Promise<any[]> {
  return loadLocal<any[]>(STORAGE_KEYS.BOOKMARKS) || [];
}

// --- Roadmap ---
export async function saveRoadmapToStorage(roadmap: any): Promise<void> {
  appState.roadmap = roadmap;
  const snapshot = snapshotForSync(roadmap);
  saveLocal(STORAGE_KEYS.ROADMAP, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.ROADMAP);
  queueVaultWrite(STORAGE_KEYS.ROADMAP, () => saveRoadmapCloud(snapshot));
}

export async function loadRoadmapFromStorage(): Promise<any> {
  return loadLocal<any>(STORAGE_KEYS.ROADMAP) || { columns: [], rows: [] };
}

// --- Routine Reset ---
export async function saveRoutineResetToStorage(reset: string): Promise<void> {
  // Persist into the settings blob, but skip cloud push to avoid timestamp races on boot
  if (appState.settings.lastRoutineReset !== reset) {
    appState.settings.lastRoutineReset = reset;
    saveSettingsToStorage({ lastRoutineReset: reset }, true);
  }
}

export async function loadRoutineResetFromStorage(): Promise<string | null> {
  return (appState.settings.lastRoutineReset as string | undefined) || null;
}

// --- Settings ---
//
// Settings are one row shared by every device. Many features save the whole
// settings object (finishing a session, Beast mode, badges...), so a device
// that hasn't pulled the latest copy used to push its stale values back and
// undo changes made elsewhere: change the accent on the laptop, finish a
// session on the phone, and the laptop's accent was gone.
//
// Now each device remembers which fields *it* changed ("pending"), and every
// push merges only those onto the current cloud copy. Fields this device did
// not touch always come from the cloud. Device clocks are never compared.

const PENDING_SETTINGS_KEY = 'at_settings_pending';

/** field -> local edit counter, so an edit made mid-push isn't marked as sent */
const pendingSettings = new Map<string, number>(
  (loadLocal<string[]>(PENDING_SETTINGS_KEY) || []).map((k) => [k, 1]),
);

function persistPendingSettings(): void {
  saveLocal(PENDING_SETTINGS_KEY, [...pendingSettings.keys()]);
}

function applySettingsToDOM(d: any): void {
  import('@/state/app-state').then(m => {
    if (d.theme) m.applyThemeToDOM(d.theme);
    if (d.accentColor) m.applyAccentColorToDOM(d.accentColor);
    if (d.timerStyle) m.applyTimerStyleToDOM(d.timerStyle);
    if (d.timerFont) m.applyTimerFontToDOM(d.timerFont);
    if (d.uiFont) m.applyUiFontToDOM(d.uiFont);
  });
}

/** Cloud copy, with this device's pending edits on top. */
function mergeSettings(cloudData: any, local: any): any {
  const merged = { ...local };
  for (const [key, value] of Object.entries(cloudData || {})) {
    // Unset columns come back as null; never let them erase a local value.
    if (value === null || value === undefined) continue;
    if (pendingSettings.has(key)) continue;
    merged[key] = value;
  }
  // Badges only ever unlock, so keep the union of both sides.
  const badges = new Set<string>([...(local?.unlockedBadges || []), ...(cloudData?.unlockedBadges || [])]);
  merged.unlockedBadges = [...badges];
  // The routine-reset marker only moves forward; an older cloud value would re-run the reset.
  if (local?.lastRoutineReset && cloudData?.lastRoutineReset) {
    merged.lastRoutineReset = local.lastRoutineReset > cloudData.lastRoutineReset
      ? local.lastRoutineReset
      : cloudData.lastRoutineReset;
  }
  return merged;
}

/** Adopts the cloud settings (keeping pending local edits). Returns true if anything changed. */
function reconcileSettingsFromCloud(cloud: { data: any; updatedAt: string | null } | null | undefined): boolean {
  // No updatedAt means the account has no saved settings row yet; the server
  // still returns empty phases/badges, which must not wipe this device's copy.
  if (!cloud || !cloud.updatedAt || isLocalEmpty(cloud.data)) return false;
  const merged = mergeSettings(cloud.data, appState.settings);
  if (cloud.updatedAt) updateLocalTimestamp(STORAGE_KEYS.SETTINGS, cloud.updatedAt);
  if (!isDifferent(merged, appState.settings)) return false;

  appState.settings = merged;
  calculateDates();
  saveLocal(STORAGE_KEYS.SETTINGS, appState.settings);
  applySettingsToDOM(merged);
  return true;
}

/** Pushes this device's pending setting edits, merged onto the latest cloud copy. */
async function pushPendingSettings(): Promise<void> {
  if (pendingSettings.size === 0) return;
  const sent = new Map(pendingSettings);

  const cloud = await loadSettingsCloud();
  if (reconcileSettingsFromCloud(cloud)) {
    void refreshAppAfterSync();
  }

  const outgoing = snapshotForSync(appState.settings);
  const updatedAt = await saveSettingsCloud(outgoing);

  for (const [key, version] of sent) {
    if (pendingSettings.get(key) === version) pendingSettings.delete(key);
  }
  persistPendingSettings();
  // Track the server's clock, not this device's.
  if (updatedAt) updateLocalTimestamp(STORAGE_KEYS.SETTINGS, updatedAt);
}

export async function saveSettingsToStorage(settings: any, skipSync: boolean = false): Promise<void> {
  const baseline = loadLocal<any>(STORAGE_KEYS.SETTINGS);
  const before = baseline || {};
  const isWholeObject = settings === appState.settings;
  const previous = before.customRanges || [];
  appState.settings = { ...appState.settings, ...settings };
  const snapshot = snapshotForSync(appState.settings);
  saveLocal(STORAGE_KEYS.SETTINGS, snapshot);

  if (!skipSync) {
    // Only fields that really changed on this device become pending. With no
    // saved copy to compare against (a fresh browser), a whole-object save
    // can't tell what changed, so it claims nothing and the cloud stays the
    // authority; a partial save still claims the fields it was given.
    const next = snapshot as unknown as Record<string, unknown>;
    const changed = baseline
      ? Object.keys(next).filter((key) => isDifferent(before[key], next[key]))
      : isWholeObject ? [] : Object.keys(settings || {});
    for (const key of changed) {
      pendingSettings.set(key, (pendingSettings.get(key) || 0) + 1);
    }
    persistPendingSettings();
    updateLocalTimestamp(STORAGE_KEYS.SETTINGS);
    queueVaultWrite(STORAGE_KEYS.SETTINGS, pushPendingSettings);
  }

  const previousById = new Map(previous.filter((phase: any) => phase.id).map((phase: any) => [phase.id, phase]));
  const nextIds = new Set(snapshot.customRanges.filter((phase: any) => phase.id).map((phase: any) => phase.id));
  for (const phase of snapshot.customRanges) {
    // Legacy cached phases have no server identity. They are read safely but
    // are never allowed to create duplicate rows during an unrelated setting save.
    if (!phase.id) continue;
    const oldPhase = previousById.get(phase.id);
    if (!oldPhase || JSON.stringify(oldPhase) !== JSON.stringify(phase)) {
      queueVaultWrite(`phase:${phase.id}`, () => upsertPhaseCloud(phase));
    }
  }
  for (const phase of previous) {
    if (phase.id && !nextIds.has(phase.id)) {
      queueVaultWrite(`phase:${phase.id}`, () => deletePhaseCloud(phase.id));
    }
  }
}

export async function loadSettingsFromStorage(): Promise<any | null> {
  return loadLocal<any>(STORAGE_KEYS.SETTINGS);
}

// --- Routines & Tasks (Generic Logic) ---
export async function saveRoutinesToStorage(data: any[]): Promise<void> {
  appState.routines = data;
  const snapshot = snapshotForSync(data);
  saveLocal(STORAGE_KEYS.ROUTINES, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.ROUTINES);
  queueVaultWrite(STORAGE_KEYS.ROUTINES, () => saveRoutinesCloud(snapshot));
}

export async function loadRoutinesFromStorage(): Promise<any[]> { return loadLocal<any[]>(STORAGE_KEYS.ROUTINES) || []; }

export async function saveTasksToStorage(data: any[]): Promise<void> {
  appState.tasks = data;
  const snapshot = snapshotForSync(data);
  saveLocal(STORAGE_KEYS.TASKS, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.TASKS);
  queueVaultWrite(STORAGE_KEYS.TASKS, () => saveTasksCloud(snapshot));
}

export async function deleteTaskFromStorage(taskId: string): Promise<void> {
  if (taskId) {
    try {
      await deleteTaskCloud(taskId);
    } catch (err) {
      log.warn(`Direct cloud delete failed, will reconcile via snapshot: ${String(err)}`);
    }
  }
  await saveTasksToStorage(appState.tasks);
}

export async function loadTasksFromStorage(): Promise<any[]> { return loadLocal<any[]>(STORAGE_KEYS.TASKS) || []; }

// --- Timer (Pure Sync) ---
export async function loadTimerStateFromStorage(): Promise<any | null> {
  return loadLocal<any>(STORAGE_KEYS.TIMER);
}

export async function saveTimerStateToStorage(state: any): Promise<void> {
  const snapshot = snapshotForSync(state);
  saveLocal(STORAGE_KEYS.TIMER, snapshot);
  updateLocalTimestamp(STORAGE_KEYS.TIMER);
  queueVaultWrite(STORAGE_KEYS.TIMER, () => saveTimerStateCloud(snapshot));
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
      loadRoutineHistoryCloud(), loadBookmarksCloud(), loadTasksCloud(), loadTimerStateCloud(), loadRoadmapCloud()
    ]);

    const [cloudTracker, cloudSettings, cloudRoutines, _cloudHistory, cloudBookmarks, cloudTasks, cloudTimer, cloudRoadmap] = results;
    const force = forceCloudPull || isLocalEmpty(appState.trackerData);

    const sync = (key: string, cloud: any, local: any, setter: Function, cloudSaver: Function) => {
      const isNewer = isCloudNewer(key, cloud?.updatedAt);
      const isDiff = cloud && isDifferent(local, cloud.data);
      const isCloudDataEmpty = !cloud || isLocalEmpty(cloud.data);
      const isLocalDataEmpty = isLocalEmpty(local);
      const hasLocalSave = getLocalTimestamp(key) > 0;
      
      if (cloud && force) {
        setter(cloud.data, false);
        saveLocal(key, cloud.data);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
      } else if (cloud && !isCloudDataEmpty && (isNewer || isLocalDataEmpty || !hasLocalSave)) {
        // Cloud has data AND (cloud is newer OR local is currently empty OR no local save on this browser):
        // Always adopt cloud data to avoid wiping out user's data with empty local state
        setter(cloud.data, false);
        saveLocal(key, cloud.data);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
      } else if (isDiff && hasLocalSave && !isLocalDataEmpty) {
        // Local is newer AND was explicitly saved on this browser: Push local to cloud
        cloudSaver(local);
      } else if (!cloud && hasLocalSave && !isLocalDataEmpty) {
        // Cloud is empty/missing but local has explicitly saved data: Push to cloud
        cloudSaver(local);
      } else if (cloud && !hasLocalSave && !isCloudDataEmpty) {
        // Fresh browser with no local save: Always adopt cloud data
        setter(cloud.data, false);
        saveLocal(key, cloud.data);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
      }
    };

    // Settings: the cloud copy wins for every field this device hasn't
    // changed itself; pending local edits are then pushed on top.
    if (cloudSettings?.updatedAt && !isLocalEmpty(cloudSettings.data)) {
      reconcileSettingsFromCloud(cloudSettings);
      if (pendingSettings.size > 0) queueVaultWrite(STORAGE_KEYS.SETTINGS, pushPendingSettings);
    } else if (getLocalTimestamp(STORAGE_KEYS.SETTINGS) > 0 && !isLocalEmpty(appState.settings)) {
      // Nothing in the cloud yet: this device's settings become the first copy.
      Object.keys(appState.settings).forEach((key) => pendingSettings.set(key, 1));
      persistPendingSettings();
      queueVaultWrite(STORAGE_KEYS.SETTINGS, pushPendingSettings);
    }
    sync(STORAGE_KEYS.TRACKER_DATA, cloudTracker, appState.trackerData, (d: any) => { appState.trackerData = d; syncTrackerTimelineWithSettings(); ensureTimelineIntegrity(); }, saveTrackerDataCloud);
    sync(STORAGE_KEYS.ROUTINES, cloudRoutines, appState.routines, (d: any) => { appState.routines = d; }, saveRoutinesCloud);
    sync(STORAGE_KEYS.TASKS, cloudTasks, appState.tasks, (d: any) => {
      appState.tasks = d;
      import('@/features/tasks/tasks').then(m => m.cleanupTasks());
    }, saveTasksCloud);
    sync(STORAGE_KEYS.BOOKMARKS, cloudBookmarks, appState.bookmarks, (d: any) => { 
      appState.bookmarks = d; 
      import('@/features/bookmarks/bookmarks').then(m => m.renderBookmarks());
    }, saveBookmarksCloud);
    sync(STORAGE_KEYS.ROADMAP, cloudRoadmap, appState.roadmap, (d: any) => { appState.roadmap = d; }, saveRoadmapCloud);

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

let isBackgroundSyncRunning = false;

export async function performBackgroundSync(preloadedSnapshot?: Record<string, any> | null): Promise<void> {
  if (!isAuthenticated() || isBackgroundSyncRunning) return;
  isBackgroundSyncRunning = true;
  try {
    // Drain any queued offline sessions first
    await drainOfflineSessionQueue();

    const cloud = preloadedSnapshot
      ? [
          preloadedSnapshot.tracker,
          preloadedSnapshot.settings,
          preloadedSnapshot.routines,
          preloadedSnapshot.tasks,
          preloadedSnapshot.history,
          preloadedSnapshot.bookmarks,
          preloadedSnapshot.timer,
          preloadedSnapshot.roadmap,
        ]
      : await Promise.all([
          loadTrackerDataCloud(), 
          loadSettingsCloud(), 
          loadRoutinesCloud(), 
          loadTasksCloud(),
          loadRoutineHistoryCloud(),
          loadBookmarksCloud(),
          loadTimerStateCloud(),
          loadRoadmapCloud()
        ]);
    let changed = false;

    const check = (key: string, cloud: any, local: any, setter: Function) => {
      const isCloudDataEmpty = !cloud || isLocalEmpty(cloud.data);
      const isLocalDataEmpty = isLocalEmpty(local);
      if (cloud && (isCloudNewer(key, cloud.updatedAt) || (!isCloudDataEmpty && isLocalDataEmpty))) {
        setter(cloud.data);
        saveLocal(key, cloud.data);
        updateLocalTimestamp(key, cloud.updatedAt || undefined);
        changed = true;
      }
    };

    // Settings don't use timestamps: adopt whatever the cloud has for fields
    // this device isn't in the middle of changing.
    if (reconcileSettingsFromCloud(cloud[1])) changed = true;
    check(STORAGE_KEYS.TRACKER_DATA, cloud[0], appState.trackerData, (d: any) => { appState.trackerData = d; syncTrackerTimelineWithSettings(); ensureTimelineIntegrity(); });
    check(STORAGE_KEYS.ROUTINES, cloud[2], appState.routines, (d: any) => { appState.routines = d; });
    check(STORAGE_KEYS.TASKS, cloud[3], appState.tasks, (d: any) => {
      appState.tasks = d;
      import('@/features/tasks/tasks').then(m => m.cleanupTasks());
    });
    check(STORAGE_KEYS.ROUTINE_HISTORY, cloud[4], appState.routineHistory, (d: any) => { appState.routineHistory = d; });
    check(STORAGE_KEYS.BOOKMARKS, cloud[5], appState.bookmarks, (d: any) => { 
      appState.bookmarks = d;
      import('@/features/bookmarks/bookmarks').then(m => m.renderBookmarks());
    });
    check(STORAGE_KEYS.ROADMAP, cloud[7], appState.roadmap, (d: any) => { appState.roadmap = d; });
    
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
  finally {
    isBackgroundSyncRunning = false;
  }
}

async function refreshAppAfterSync(): Promise<void> {
  const { refreshApplicationUI } = await import('@/core/mission-pulse');
  await refreshApplicationUI();
}

let liveSyncRegistered = false;

export async function startLiveSync(): Promise<void> {
  if (!isAuthenticated() || liveSyncRegistered) return;
  liveSyncRegistered = true;
  await subscribeToUserDataSync((payload) => performBackgroundSync(payload?.new?.snapshotMap));
}

export async function handleUserDataSync(payload: any): Promise<void> {
  if (payload) await performBackgroundSync();
}
