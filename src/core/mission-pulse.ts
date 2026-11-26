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
    const [settings, trackerData, routines, history, bookmarks, tasks, timer] = await Promise.all([
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
    
    if (trackerData && trackerData.length > 0) {
      appState.trackerData = trackerData;
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

  // 2. Interactive Backdrop Pulse (rAF-throttled to avoid per-pixel style recalcs)
  let mouseRafId: number | null = null;
  let lastMouseX = 0;
  let lastMouseY = 0;
  document.addEventListener("mousemove", (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (mouseRafId !== null) return;
    mouseRafId = requestAnimationFrame(() => {
      mouseRafId = null;
      document.documentElement.style.setProperty("--mouse-x", `${lastMouseX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${lastMouseY}px`);
    });
  }, { passive: true });

  // 3. PWA Service Worker (Shield Protocol)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const hadController = !!navigator.serviceWorker.controller;
      let isRefreshing = false;

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

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !isRefreshing) {
          isRefreshing = true;
          window.location.reload();
        }
      });
    });
  }
}
