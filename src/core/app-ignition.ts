import { appState, calculateDates, initializeData, applyThemeToDOM, applyTimerStyleToDOM, ensureTimelineIntegrity, migrateDataFormat } from "@/state/app-state";
import { log } from "@/utils/logger.utils";
import {
  loadTrackerDataFromStorage,
  loadSettingsFromStorage,
  loadRoutinesFromStorage,
  loadRoutineHistoryFromStorage,
  loadBookmarksFromStorage,
  loadTasksFromStorage,
  loadTimerStateFromStorage,
  performBackgroundSync
} from "@/services/data-bridge";
import { initUI } from "@/components/ui-registry";
import { shell } from "@/features/layout/Shell";
import { initSyncAuth, setupHeaderScroll } from "@/services/auth.service";
import { generateTable, setupTableSearch } from "@/features/tracker/tracker";
import { updateDashboard } from "@/features/dashboard/dashboard";
import { renderRoutine, setupRoutineListeners, checkDailyRoutineReset } from "@/features/routines/routines";
import { renderBookmarks, setupBookmarkListeners } from "@/features/bookmarks/bookmarks";
import { setupFocusListeners, resumeTimerIfNeeded } from "@/features/timer/timer";
import { renderPerformanceCurve, setupChartFilters } from "@/features/routines/performance-chart";
import { renderRadarStats } from "@/features/routines/radar-stats";
import { renderBadges, checkBadges } from "@/features/dashboard/badges";
import { initTasks } from "@/features/tasks/tasks";
import { setupKeyboardShortcuts } from "@/features/shortcuts/shortcuts";
import { initWorldStage } from "@/features/dashboard/leaderboard";
import { initAtmosphericProtocol } from "@/features/dashboard/particles";
import { checkProfileIdentity } from "@/features/profile/profile.manager";
import { setupEventListeners } from "./command-center";
import { startMissionPulse } from "./mission-pulse";

/**
 * APP IGNITION
 * 
 * The main boot sequence that powers up the AllTracker ecosystem.
 */

export async function igniteApp(): Promise<void> {
  try {
    // 1. Initial UI Structure
    shell.init('app-root');
    await initUI();
    shell.setupTabNavigation();

    // 2. Load Local State (Zero-Latency)
    const [settings, trackerData, routines, history, bookmarks, savedTimer, tasks] = await Promise.all([
      loadSettingsFromStorage(),
      loadTrackerDataFromStorage(),
      loadRoutinesFromStorage(),
      loadRoutineHistoryFromStorage(),
      loadBookmarksFromStorage(),
      loadTimerStateFromStorage(),
      loadTasksFromStorage(),
    ]);

    // 3. State Preparation
    if (settings) appState.settings = { ...appState.settings, ...settings };
    applyThemeToDOM(appState.settings.theme);
    applyTimerStyleToDOM(appState.settings.timerStyle);
    migrateDataFormat();

    appState.trackerData = (trackerData && trackerData.length > 0) ? trackerData : initializeData();
    ensureTimelineIntegrity();
    calculateDates();

    appState.routines = routines;
    appState.routineHistory = history;
    appState.bookmarks = bookmarks;
    appState.tasks = tasks;
    if (savedTimer) Object.assign(appState.activeTimer, savedTimer);

    // 4. Initial Render (Show user data IMMEDIATELY)
    generateTable();
    updateDashboard();
    renderRoutine();
    renderBookmarks();

    // 5. User Input Activation
    setupEventListeners();
    setupTableSearch();
    setupKeyboardShortcuts();
    setupRoutineListeners();
    setupBookmarkListeners();
    setupFocusListeners();
    startMissionPulse();

    // 6. Background Verification
    await checkDailyRoutineReset();

    // 7. Background Auth & Sync (Non-blocking for UI)
    initSyncAuth().catch(err => log.error("Background Auth Init Failed", err));
    setupHeaderScroll();
    
    // 8. Background Feature Load

    // 6. Background Feature Load
    setTimeout(async () => {
      renderPerformanceCurve();
      renderRadarStats();
      setupChartFilters();
      renderBadges();
      checkBadges();

      initTasks();

      await (await import('@/services/data-bridge')).startLiveSync();

      const [
        { initManualLogic },
        { initNotifications },
        { initIntegrityService },
        { loadMaamuSessionsIntoState },
        { hydrateSessionCache }
      ] = await Promise.all([
        import('@/features/manual/manual'),
        import('@/features/notifications/notifications'),
        import('@/services/integrity'),
        import('@/features/intelligence/intelligence.service'),
        import('@/services/vault.service')
      ]);

      await hydrateSessionCache();
      await loadMaamuSessionsIntoState();
      initManualLogic();
      initNotifications();
      initIntegrityService();
      initAtmosphericProtocol();
      
      await initWorldStage();
      await checkProfileIdentity();
      resumeTimerIfNeeded();
      performBackgroundSync();

      setInterval(() => void checkDailyRoutineReset(), 60000);
    }, 300);

    // 7. Goal Recovery
    const goalInput = document.getElementById("sessionGoalInput") as HTMLInputElement;
    if (goalInput && appState.settings.sessionGoal) goalInput.value = appState.settings.sessionGoal;

  } catch (error) {
    log.error("IGNITION FAILURE: Reverting to local mirror.", error);
    calculateDates();
    generateTable();
    updateDashboard();
  } finally {
    await completeBootVisuals();
  }
}

async function completeBootVisuals(): Promise<void> {
  const loader = document.getElementById('app-bootstrap-loader');
  if (!loader) return;
  const loaderText = document.querySelector('.loader-text');
  
  setTimeout(() => { if (loaderText) loaderText.textContent = "Welcome back."; }, 300);
  setTimeout(() => {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 600);
  }, 800);
}
