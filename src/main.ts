/**
 * Application entry point
 *
 * Bootstraps the entire app: loads data, initializes UI features, and
 * wires up all event listeners. This replaces the init() function and
 * DOMContentLoaded handler from the old monolithic script.js.
 */

// ─── Styles ──────────────────────────────────────────────────
import "./styles/main.css";
import "./styles/components/leaderboard.css";
import "./styles/components/intelligence.css";
import "./styles/components/manual.css";
import "./styles/features/maamu.css";

// ─── Core ────────────────────────────────────────────────────
import { appState, calculateDates, initializeData } from "@/state/app-state";
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
} from "@/services/data-bridge";
import { initSyncAuth, setupHeaderScroll } from "@/services/auth.service";
import { initUI } from "@/components/ui-registry";

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
  openQuickEntryModal,
  openTodayEntry,
  saveQuickEntry,
  saveBulkEntry,
  jumpToDay,
  showWeeklySummary,
  handleReset,
  renderQuickEntryFields,
  renderBulkEntryFields,
  scrollToToday,
} from "@/features/shortcuts/shortcuts";
import { initWorldStage, checkProfileIdentity, syncProfileBroadcast } from "@/features/dashboard/leaderboard";

// ─── Initialize ──────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 All Tracker v2.0 — TypeScript Edition");
  
  // 0. Initialize Modular UI Layer
  await initUI();
  const { initManualLogic } = await import('@/features/manual/manual');
  initManualLogic();

  // 1. Load settings first (date range controls everything)
  const savedSettings = await loadSettingsFromStorage();
  if (savedSettings) {
    appState.settings = { ...appState.settings, ...savedSettings };
  }

  // 2. Load tracker data
  const savedData = await loadTrackerDataFromStorage();
  if (savedData && savedData.length > 0) {
    appState.trackerData = savedData;
  } else {
    appState.trackerData = initializeData();
    saveTrackerDataToStorage(appState.trackerData);
  }

  // 3. Load other data
  const [routines, history, bookmarks, savedTimer] = await Promise.all([
    loadRoutinesFromStorage(),
    loadRoutineHistoryFromStorage(),
    loadBookmarksFromStorage(),
    loadTimerStateFromStorage(),
  ]);
  appState.routines = routines;
  appState.routineHistory = history;
  appState.bookmarks = bookmarks;

  // 4. Load timer state
  if (savedTimer) {
    Object.assign(appState.activeTimer, savedTimer);
  }

  // 5. Bootstrap UI
  generateTable();
  updateDashboard();
  renderPerformanceCurve();
  renderRadarStats();
  renderRoutine();
  renderBookmarks();
  renderBadges();
  checkBadges();

  // 6. Set up event listeners
  setupEventListeners();
  setupTableSearch();
  setupKeyboardShortcuts();
  setupRoutineListeners();
  setupBookmarkListeners();
  setupFocusListeners();
  setupChartFilters();

  // 7. Auth & header
  initSyncAuth();
  setupHeaderScroll();
  initTasks();

  // 8. Mutations & Integrations
  await checkDailyRoutineReset();
  const { initNotifications } = await import('@/features/notifications/notifications');
  initNotifications();
  
  const { initIntegrityService } = await import('@/services/integrity');
  initIntegrityService();

  // 9. Restore timer if it was running
  resumeTimerIfNeeded();

  // 10. Session goal ring init
  const savedGoal = localStorage.getItem(STORAGE_KEYS.SESSION_GOAL);
  const goalInput = document.getElementById(
    "sessionGoalInput",
  ) as HTMLInputElement;
  if (savedGoal && goalInput) goalInput.value = savedGoal;

  // 11. World Stage Leaderboard
  await initWorldStage();
  checkProfileIdentity();

  console.log("✅ App initialized successfully.");
});

// ─── Event Listeners ─────────────────────────────────────────

function setupEventListeners(): void {
  // Universal Navigation (Desktop Tabs + Mobile Bottom Nav)
  const navItems = document.querySelectorAll(".nav-item[data-target], .mobile-nav-item[data-target]");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");
      if (!target) return;

      // 1. Update All Nav States
      document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((n) => {
        n.classList.remove("active");
        if (n.getAttribute("data-target") === target) n.classList.add("active");
      });

      // 2. Switch View Panes
      document.querySelectorAll(".view-pane").forEach((p) => p.classList.remove("active"));
      const targetPane = document.getElementById(target);
      if (targetPane) {
        targetPane.classList.add("active");
        if (target === "tasksPane") renderTasks();
        if (target === "intelligencePane") renderIntelligenceBriefing();
        if (target === "routinePane") renderRoutine();
      }

      // 3. Scroll to top on view change
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Mobile More Menu Toggle
  const moreBtn = document.getElementById("headerMoreBtn");
  const desktopActions = document.getElementById("headerDesktopActions");
  if (moreBtn && desktopActions) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      desktopActions.classList.toggle("mobile-menu-overlay");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (desktopActions && !desktopActions.contains(e.target as Node)) {
          desktopActions.classList.remove("mobile-menu-overlay");
        }
      }
    });
  }

  // Excalidraw Toggle
  const excalidrawBtn = document.getElementById("excalidrawToggle");
  const drawSection = document.getElementById("drawSection");

  excalidrawBtn?.addEventListener("click", () => {
    if (!drawSection) return;
    const isHidden = drawSection.style.display === "none" || drawSection.style.display === "";
    
    if (isHidden) {
      drawSection.style.display = "block";
      excalidrawBtn.classList.add("active");
      excalidrawBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg> Hide Canvas`;
    } else {
      drawSection.style.display = "none";
      excalidrawBtn.classList.remove("active");
      excalidrawBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Canvas`;
    }
  });

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
  bindClick("openQuickEntryBtn", openQuickEntryModal);
  bindClick("quickEntryBtn", openTodayEntry);
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
      localStorage.setItem(STORAGE_KEYS.SESSION_GOAL, goalInput.value);
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
  bindClick("enableNotificationsBtn", () => {
    import('@/features/notifications/notifications').then(m => m.requestNotificationPermission());
  });

  bindClick("addCustomRangeBtn", addCustomRange);
  bindClick("closeSettingsModal", () =>
    document.getElementById("settingsModal")?.classList.remove("active"),
  );

  // Quick entry
  bindClick("quickEntryDay", renderQuickEntryFields);
  bindClick("bulkStartDay", renderBulkEntryFields);
  bindClick("saveQuickEntryBtn", saveQuickEntry);
  bindClick("saveBulkEntryBtn", saveBulkEntry);
  bindClick("jumpToDayBtn", jumpToDay);
  bindClick("closeQuickEntryModal", () =>
    document.getElementById("quickEntryModal")?.classList.remove("active"),
  );

  // Quick entry label updates
  document
    .getElementById("quickEntryDay")
    ?.addEventListener("input", renderQuickEntryFields);
  document
    .getElementById("bulkStartDay")
    ?.addEventListener("input", renderBulkEntryFields);

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

  const historyDateFilter = document.getElementById("historyDateFilter") as HTMLInputElement;
  if (historyDateFilter) {
    historyDateFilter.addEventListener("change", () => renderSessionHistory());
  }

  bindClick("clearHistoryFilter", () => {
    if (historyDateFilter) historyDateFilter.value = "";
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

// ─── Refresh (used by data-bridge after sync) ────────────────

export async function refreshApplicationUI(): Promise<void> {
  console.log("Refreshing UI after sync...");
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

    console.log("UI Refresh complete.");
  } catch (error) {
    console.error("Error during UI refresh:", error);
  }
}
