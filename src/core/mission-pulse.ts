import { appState, calculateDates, migrateDataFormat } from "@/state/app-state";
import { DEFAULT_COLUMNS } from "@/config/constants";
import { log } from "@/utils/logger.utils";
import {
  loadTrackerDataFromStorage,
  loadSettingsFromStorage,
  loadRoutinesFromStorage,
  loadRoutineHistoryFromStorage,
  loadBookmarksFromStorage,
  loadTasksFromStorage,
  loadTimerStateFromStorage
} from "@/services/data-bridge";
import { generateTable } from "@/features/tracker/tracker";
import { updateDashboard } from "@/features/dashboard/dashboard";
import { renderPerformanceCurve } from "@/features/routines/performance-chart";
import { renderRoutine, checkDailyRoutineReset } from "@/features/routines/routines";
import { renderBookmarks } from "@/features/bookmarks/bookmarks";
import { renderTasks } from "@/features/tasks/tasks";
import { syncProfileBroadcast } from "@/features/profile/profile.manager";

/**
 * MISSION PULSE
 * 
 * Manages the background health, synchronization, and real-time updates of the application.
 */

export async function refreshApplicationUI(): Promise<void> {
  try {
    const [settings, data, routines, history, bookmarks, tasks, timer] = await Promise.all([
      loadSettingsFromStorage(),
      loadTrackerDataFromStorage(),
      loadRoutinesFromStorage(),
      loadRoutineHistoryFromStorage(),
      loadBookmarksFromStorage(),
      loadTasksFromStorage(),
      loadTimerStateFromStorage(),
    ]);

    if (settings) {
      appState.settings = { ...appState.settings, ...settings };
    }
    
    migrateDataFormat();

    if (!Array.isArray(appState.settings.columns)) appState.settings.columns = [...DEFAULT_COLUMNS];
    if (!Array.isArray(appState.settings.customRanges)) appState.settings.customRanges = [];

    appState.routines = routines;
    appState.routineHistory = history;
    appState.bookmarks = bookmarks;
    appState.tasks = tasks;

    if (timer) Object.assign(appState.activeTimer, timer);

    calculateDates();
    generateTable();
    updateDashboard();
    renderPerformanceCurve();
    renderRoutine();
    renderBookmarks();
    renderTasks();
    
    await checkDailyRoutineReset();

    const { resumeTimerIfNeeded } = await import('@/features/timer/timer');
    resumeTimerIfNeeded();

    syncProfileBroadcast();
  } catch (error) {
    log.error("PULSE FAILURE: UI Refresh loop interrupted.", error);
  }
}

export function startMissionPulse(): void {
  // 1. Reactive Header Sync
  window.addEventListener('all-tracker-identity-sync', (e: any) => {
    const profile = e.detail;
    if (profile && profile.displayName) {
      document.querySelectorAll('.headerUserAlias').forEach(el => {
        el.textContent = profile.displayName;
      });
    }
  });

  // 2. Interactive Backdrop Pulse
  document.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
  });

  // 3. PWA Service Worker (Shield Protocol)
  if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            log.success('Shield Protocol: Service Worker active');
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              newWorker?.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  log.info('System Update: New version available. Deployment triggered.');
                }
              });
            });
          })
          .catch(err => log.error('Shield failure', err));

        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
    }
  }
}
