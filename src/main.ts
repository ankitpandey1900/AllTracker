/**
 * Main App Setup
 * 
 * This is where everything starts. We load the data, setup the UI, 
 * and add all the click listeners for buttons. Replaces the old monolithic script.js.
 */

// --- Styles ---
import "./styles/main.css";
import "./styles/components/leaderboard.css";
import "./styles/components/intelligence.css";
import "./styles/components/manual.css";
import "./styles/features/maamu.css";
import "./styles/themes/default.css";
import "./styles/themes/chanakya-strategy.css";
import "./styles/themes/ayodhya.css";
import "./styles/themes/kamala-grace.css";
// --- Core Setup ---
import { appState, calculateDates, initializeData, applyThemeToDOM } from "@/state/app-state";
import {
  DEFAULT_COLUMNS,
  STORAGE_KEYS,
} from "@/config/constants";
import {
  loadTrackerDataFromStorage,
  loadSettingsFromStorage,
  loadRoutinesFromStorage,
  loadRoutineHistoryFromStorage,
  loadBookmarksFromStorage,
  loadTasksFromStorage,
  loadTimerStateFromStorage,
  saveTrackerDataToStorage,
  performBackgroundSync,
  handleUserDataSync
} from "@/services/data-bridge";
import { initSyncAuth, setupHeaderScroll } from "@/services/auth.service";
import { subscribeToUserDataSync } from "@/services/supabase.service";
import { initUI } from "@/components/ui-registry";
import { shell } from "@/features/layout/Shell";

// ─── Study Categories ────────────────────────────────────────────────
import {
  updateDashboard,
  renderSessionHistory,
  toggleFocusHUD,
} from "@/features/dashboard/dashboard";
import { checkBadges, renderBadges } from "@/features/dashboard/badges";

import { generateTable, setupTableSearch } from "@/features/tracker/tracker";
import {
  startTimer,
  pauseTimer,
  stopTimer,
  openTimerModal,
  resumeTimerIfNeeded,
  setupFocusListeners,
} from "@/features/timer/timer";
import {
  renderRoutine,
  setupRoutineListeners,
  checkDailyRoutineReset,
} from "@/features/routines/routines";
import {
  renderPerformanceCurve,
  setupChartFilters,
} from "@/features/routines/performance-chart";
import { renderRadarStats } from "@/features/routines/radar-stats";

import {
  renderBookmarks,
  setupBookmarkListeners,
} from "@/features/bookmarks/bookmarks";
import { initTasks, renderTasks } from "@/features/tasks/tasks";
import {
  openSettingsModal,
  applyDateSettings,
  applyColumnSettings,
  addCustomRange,
} from "@/features/settings/settings";
import { renderIntelligenceBriefing } from "@/features/intelligence/intelligence";
import { exportAllData, exportTrackerDataCSV } from "@/features/export/export";
import { importFromJSON, importFromCSV } from "@/features/import/import";
import {
  setupKeyboardShortcuts,
  showWeeklySummary,
  handleReset,
  scrollToToday,
} from "@/features/shortcuts/shortcuts";
import { initWorldStage } from "@/features/dashboard/leaderboard";
import { checkProfileIdentity, syncProfileBroadcast } from "@/features/profile/profile.manager";
import { requestNotificationPermission } from "@/features/notifications/notifications";

// --- App Start ---

document.addEventListener("DOMContentLoaded", async () => {
  // 0. Setup the UI Shell & Architecture (Critical)
  shell.init('app-root');
  await initUI();
  
  // Rebind navigation now that mobile-nav has been async injected by initUI
  shell.setupTabNavigation();

  // 1. Parallel Data Loading (Local-First)
  // We load everything from storage in parallel. data-bridge will return local data immediately.
  const [settings, trackerData, routines, history, bookmarks, savedTimer] = await Promise.all([
    loadSettingsFromStorage(),
    loadTrackerDataFromStorage(),
    loadRoutinesFromStorage(),
    loadRoutineHistoryFromStorage(),
    loadBookmarksFromStorage(),
    loadTimerStateFromStorage(),
  ]);

  if (settings) {
    appState.settings = { ...appState.settings, ...settings };
  }
  
  // ⚡ CRITICAL: Ensure theme is applied to DOM even for first-time users
  applyThemeToDOM(appState.settings.theme);
  // ⚡ CRITICAL: Calculate dates immediately so dashboard isn't 0/0
  calculateDates();
  if (trackerData && trackerData.length > 0) {
    appState.trackerData = trackerData;
  } else {
    appState.trackerData = initializeData();
    saveTrackerDataToStorage(appState.trackerData);
  }
  appState.routines = routines;
  appState.routineHistory = history;
  appState.bookmarks = bookmarks;
  if (savedTimer) Object.assign(appState.activeTimer, savedTimer);

  // 3. High-Priority UI Bootstrap (Visible above the fold)
  generateTable();
  updateDashboard();
  renderRoutine();
  renderBookmarks();
  
  // 4. Secondary UI & Event Listeners
  setupEventListeners();
  setupTableSearch();
  setupKeyboardShortcuts();
  setupRoutineListeners();
  setupBookmarkListeners();
  setupFocusListeners();
  
  // 5. Background / Deferred Initializations
  // These don't need to block the first paint
  setTimeout(async () => {
    // Analytics & Charts (Deferred)
    renderPerformanceCurve();
    renderRadarStats();
    setupChartFilters();
    renderBadges();
    checkBadges();

    // Features & Services
    initSyncAuth();
    setupHeaderScroll();
    initTasks();
    await checkDailyRoutineReset();

    // ⚡ REAL-TIME SYNC BOOT: Listen for remote changes on other devices
    await (await import('@/services/data-bridge')).startLiveSync();

    const [
      { initManualLogic },
      { initNotifications },
      { initIntegrityService }
    ] = await Promise.all([
      import('@/features/manual/manual'),
      import('@/features/notifications/notifications'),
      import('@/services/integrity')
    ]);

    initManualLogic();
    initNotifications();
    initIntegrityService();
    
    // 🏁 WORLD STAGE BOOT: Only once data is established
    await initWorldStage();
    await checkProfileIdentity();
    resumeTimerIfNeeded();
    
    // 🔄 BACKGROUND SYNC: Silently update and refresh if cloud differs
    performBackgroundSync();
  }, 300);

  // 6. Session goal recovery
  const goalInput = document.getElementById("sessionGoalInput") as HTMLInputElement;
  if (goalInput && appState.settings.sessionGoal) {
    goalInput.value = appState.settings.sessionGoal;
  }

  // 7. Elite Interactive Mouse Tracking
  document.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
  });

  // 🏁 8. Finalize Boot: Graceful Reveal
  const runBootSequence = async () => {
    const loader = document.getElementById('app-bootstrap-loader');
    const loaderText = document.querySelector('.loader-text');
    if (!loader) return;
    
    // Quick aesthetic text change 
    setTimeout(() => {
      if (loaderText) loaderText.textContent = "Welcome back.";
    }, 300);

    // Final Fade
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }, 800);
  };

  // Immediate initiation
  runBootSequence();

  // 📡 REACTIVE HEADER SYNC: Update username in header instantly
  window.addEventListener('all-tracker-identity-sync', (e: any) => {
    const profile = e.detail;
    if (profile && profile.displayName) {
      document.querySelectorAll('.headerUserAlias').forEach(el => {
        el.textContent = profile.displayName;
      });
    }
  });
});


// --- Logic for Buttons and Navigation ---

function setupEventListeners(): void {
  // Navigation is now handled by Shell.ts
  
  // Mobile More Menu Toggle (Header Actions)
  // Logic now handled by Shell.ts

  // Dashboard buttons
  bindClick("toggleKpiBtn", () => {
    const container = document.getElementById("kpiContainer");
    const btn = document.getElementById("toggleKpiBtn");
    if (container && btn) {
      const isExpanded = container.classList.toggle("expanded");
      btn.textContent = isExpanded ? "Hide" : "Show";
    }
  });

  bindClick("toggleCategoryBtn", () => {
    const container = document.getElementById("categoryCardsContainer");
    const btn = document.getElementById("toggleCategoryBtn");
    if (container && btn) {
      const isExpanded = container.classList.toggle("expanded");
      btn.textContent = isExpanded ? "Hide" : "Show";
    }
  });

  bindClick("startTimerBtn", openTimerModal);
  bindClick("mobileStartTimerBtn", openTimerModal);
  bindClick("jumpToTodayBtn", scrollToToday);
  bindClick("exportAllDataBtn", exportAllData);
  bindClick("shareStatsBtn", () => {
    import('@/features/dashboard/share-card').then(m => m.generateShareCard());
  });

  // Timer controls
  const timerStartBtn = document.getElementById("confirmStartTimerBtn"); // In modal
  if (timerStartBtn) {
    timerStartBtn.addEventListener("click", () => {
      const select = document.getElementById(
        "timerCategorySelect",
      ) as HTMLSelectElement;
      if (select) {
        const cat = select.options[select.selectedIndex].textContent || "";
        startTimer(parseInt(select.value, 10) || 0, cat);
        toggleFocusHUD(true, cat, "00:00:00");
        document.getElementById("timerModal")?.classList.remove("active");
      }
    });
  }

  // Nav direct start shortcut
  bindClick("startTimerBtn", openTimerModal);
  bindClick("mobileNavStartTimerBtn", openTimerModal);

  bindClick("timerPauseBtn", () => {
    if (appState.activeTimer.isRunning) pauseTimer();
    else
      startTimer(
        parseInt(appState.activeTimer.category || "0", 10),
        appState.activeTimer.colName || "",
      );
  });

  bindClick("timerStopBtn", () => {
    stopTimer();
    toggleFocusHUD(false);
  });

  // Session goal
  const goalInput = document.getElementById(
    "sessionGoalInput",
  ) as HTMLInputElement;
  if (goalInput) {
    goalInput.addEventListener("input", () => {
      appState.settings.sessionGoal = goalInput.value;
      import('@/services/data-bridge').then(({ saveSettingsToStorage }) => {
        saveSettingsToStorage(appState.settings);
      });
    });
  }

  // Settings
  bindClick("settingsBtn", openSettingsModal);
  bindClick("userManualBtn", () =>
    document.getElementById("userManualModal")?.classList.add("active"),
  );
  bindClick("closeUserManualModal", () =>
    document.getElementById("userManualModal")?.classList.remove("active"),
  );
  bindClick("applyDateSettings", applyDateSettings);
  bindClick("applyColumnSettings", applyColumnSettings);
  bindClick("applyThemeBtn", () => {
    import('@/features/settings/settings').then(m => m.applyThemeSettings());
  });
  bindClick("enableNotificationsBtn", requestNotificationPermission);

  bindClick("addCustomRangeBtn", addCustomRange);
  bindClick("closeSettingsModal", () =>
    document.getElementById("settingsModal")?.classList.remove("active"),
  );


  // Modals
  bindClick("closeTimerModal", () =>
    document.getElementById("timerModal")?.classList.remove("active"),
  );
  bindClick("weeklyViewBtn", showWeeklySummary);
  bindClick("closeWeeklyModal", () =>
    document.getElementById("weeklyModal")?.classList.remove("active"),
  );
  bindClick("closeHeatmapModal", () =>
    document.getElementById("heatmapModal")?.classList.remove("active"),
  );

  const heatmapYearSelect = document.getElementById(
    "heatmapYearSelect",
  ) as HTMLSelectElement;
  if (heatmapYearSelect) {
    heatmapYearSelect.addEventListener("change", () => {
      import("@/features/heatmap/heatmap").then((m) => m.renderHeatmapModal());
    });
  }

  bindClick("heatmapViewBtn", () => {
    document.getElementById("heatmapModal")?.classList.add("active");
    import("@/features/heatmap/heatmap").then((m) => {
      m.renderHeatmap();
      m.renderHeatmapModal();
    });
  });

  bindClick("analyticsViewBtn", () => {
    document.getElementById("analyticsModal")?.classList.add("active");
    renderPerformanceCurve();
    renderRadarStats();
  });

  bindClick("closeAnalyticsModal", () =>
    document.getElementById("analyticsModal")?.classList.remove("active"),
  );
  bindClick("badgesViewBtn", () => {
    document.getElementById("badgesModal")?.classList.add("active");
    renderBadges();
  });
  bindClick("closeBadgesModal", () =>
    document.getElementById("badgesModal")?.classList.remove("active"),
  );
  bindClick("historyBtn", () => {
    document.getElementById("historyModal")?.classList.add("active");
    renderSessionHistory();
  });

  const shFromDate = document.getElementById("sh-from-date") as HTMLInputElement;
  const shToDate = document.getElementById("sh-to-date") as HTMLInputElement;
  if (shFromDate) shFromDate.addEventListener("change", () => renderSessionHistory());
  if (shToDate) shToDate.addEventListener("change", () => renderSessionHistory());

  bindClick("clearHistoryFilter", () => {
    if (shFromDate) shFromDate.value = "";
    if (shToDate) shToDate.value = "";
    renderSessionHistory();
  });

  bindClick("closeHistoryModal", () =>
    document.getElementById("historyModal")?.classList.remove("active"),
  );

  // Import
  bindClick("importBtn", () =>
    document.getElementById("importModal")?.classList.add("active"),
  );
  bindClick("closeImportModal", () =>
    document.getElementById("importModal")?.classList.remove("active"),
  );
  bindClick("importJsonBtn", importFromJSON);
  bindClick("importCsvBtn", importFromCSV);

  // Export
  bindClick("exportCsvBtn", exportTrackerDataCSV);

  // Reset
  bindClick("resetBtn", handleReset);

  // Close modals on backdrop click
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  });
}

// ─── Helper ──────────────────────────────────────────────────

function bindClick(id: string, handler: () => void): void {
  document.getElementById(id)?.addEventListener("click", handler);
}

// --- Refresh (used by data-bridge after sync) ────────────────

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

    // Ensure essential arrays exist
    if (!Array.isArray(appState.settings.columns))
      appState.settings.columns = [...DEFAULT_COLUMNS];
    if (!Array.isArray(appState.settings.customRanges))
      appState.settings.customRanges = [];

    if (data && data.length) {
      appState.trackerData = data;
    }

    // 4. Migrate data format if necessary (Architectural Shift)
    const { migrateDataFormat } = await import("@/state/app-state");
    migrateDataFormat();

    appState.routines = routines;
    appState.routineHistory = history;
    appState.bookmarks = bookmarks;
    appState.tasks = tasks;

    if (timer) {
      Object.assign(appState.activeTimer, timer);
    }

    calculateDates();
    generateTable();
    updateDashboard();
    renderPerformanceCurve();
    renderRoutine();
    renderBookmarks();
    renderTasks();
    
    // Resume timer UI if it was restored
    const { resumeTimerIfNeeded } = await import('@/features/timer/timer');
    resumeTimerIfNeeded();

    // 5. Broadcast stats after sync to ensure leaderboard is fresh
    syncProfileBroadcast();
  } catch (error) {
    console.error("Error during UI refresh:", error);
  }
}

// ─── PWA Service Worker Registration ──────────────────────────
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Only register caching Service Worker in Production completely
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered', reg);
          
          // Detect manual or automatic SW updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available! Refreshing...');
              }
            });
          });
        })
        .catch(err => console.error('Service Worker registration failed', err));

      // Handle automatic reload when the new Service Worker takes over
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Controller changed. Reloading page for latest version.');
        window.location.reload();
      });
    });
  } else {
    // In local development, unregister any existing service worker so it doesn't break Hot Reloading
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('Dev Mode: Unregistered rogue Service Worker to prevent caching.');
        });
      }
    });
  }
}
