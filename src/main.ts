/**
 * Application entry point
 *
 * Bootstraps the entire app: loads data, initializes UI features, and
 * wires up all event listeners. This replaces the init() function and
 * DOMContentLoaded handler from the old monolithic script.js.
 */

// ─── Styles ──────────────────────────────────────────────────
import './styles/main.css';

// ─── Core ────────────────────────────────────────────────────
import { appState, calculateDates, initializeData } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import {
  loadTrackerDataFromStorage,
  loadSettingsFromStorage,
  loadRoutinesFromStorage,
  loadRoutineHistoryFromStorage,
  loadBookmarksFromStorage,
  saveTrackerDataToStorage,
} from '@/services/data-bridge';
import { initSyncAuth, setupHeaderScroll } from '@/services/auth.service';

// ─── Features ────────────────────────────────────────────────
import { updateDashboard, renderSessionHistory, toggleFocusHUD } from '@/features/dashboard/dashboard';
import { checkBadges, renderBadges } from '@/features/dashboard/badges';
import { generateTable, setupTableSearch } from '@/features/tracker/tracker';
import { loadTimerState, startTimer, pauseTimer, stopTimer, openTimerModal, resumeTimerIfNeeded, setupFocusListeners } from '@/features/timer/timer';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderRoutine, setupRoutineListeners, checkDailyRoutineReset } from '@/features/routines/routines';
import { renderPerformanceCurve, setupChartFilters } from '@/features/routines/performance-chart';
import { renderRadarStats } from '@/features/routines/radar-stats';

import { renderBookmarks, setupBookmarkListeners } from '@/features/bookmarks/bookmarks';
import { openSettingsModal, applyDateSettings, applyColumnSettings, addCustomRange, addExtraColumn } from '@/features/settings/settings';
import { exportAllData, exportTrackerDataCSV } from '@/features/export/export';
import { importFromJSON, importFromCSV } from '@/features/import/import';
import {
  setupKeyboardShortcuts, openQuickEntryModal, openTodayEntry,
  saveQuickEntry, saveBulkEntry, jumpToDay, showWeeklySummary,
  handleReset, updateQuickEntryLabels, updateBulkEntryLabels,
} from '@/features/shortcuts/shortcuts';

// ─── Initialize ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 All Tracker v2.0 — TypeScript Edition');

  // 1. Load settings first (date range controls everything)
  const savedSettings = await loadSettingsFromStorage();
  if (savedSettings) {
    appState.settings = { ...appState.settings, ...savedSettings };
  }
  calculateDates();

  // 2. Load tracker data
  const savedData = await loadTrackerDataFromStorage();
  if (savedData && savedData.length > 0) {
    appState.trackerData = savedData;
  } else {
    appState.trackerData = initializeData();
    saveTrackerDataToStorage(appState.trackerData);
  }

  // 3. Load other data
  const [routines, history, bookmarks] = await Promise.all([
    loadRoutinesFromStorage(),
    loadRoutineHistoryFromStorage(),
    loadBookmarksFromStorage(),
  ]);
  appState.routines = routines;
  appState.routineHistory = history;
  appState.bookmarks = bookmarks;

  // 4. Load timer state
  loadTimerState();

  // 5. Bootstrap UI
  generateTable();
  updateDashboard();
  // heatmap and charts are rendered on demand when their modals open
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

  // 8. Innovations
  await checkDailyRoutineReset();

  // 9. Restore timer if it was running
  resumeTimerIfNeeded();

  // 10. Session goal ring init
  const savedGoal = localStorage.getItem(STORAGE_KEYS.SESSION_GOAL);
  const goalInput = document.getElementById('sessionGoalInput') as HTMLInputElement;
  if (savedGoal && goalInput) goalInput.value = savedGoal;

  console.log('✅ App initialized successfully.');
});

// ─── Event Listeners ─────────────────────────────────────────

function setupEventListeners(): void {
  // Zenith Navigation
  document.querySelectorAll('.nav-item[data-target]').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      document.querySelectorAll('.view-pane').forEach((p) => p.classList.remove('active'));

      item.classList.add('active');
      const view = item.getAttribute('data-target');
      if (view) document.getElementById(view)?.classList.add('active');
    });
  });

  // Dashboard buttons
  bindClick('startTimerBtn', openTimerModal);
  bindClick('openQuickEntryBtn', openQuickEntryModal);
  bindClick('quickEntryBtn', openTodayEntry);
  bindClick('exportAllDataBtn', exportAllData);

  // Timer controls
  const timerStartBtn = document.getElementById('confirmStartTimerBtn'); // In modal
  if (timerStartBtn) {
    timerStartBtn.addEventListener('click', () => {
      const select = document.getElementById('timerCategorySelect') as HTMLSelectElement;
      if (select) {
        const cat = select.options[select.selectedIndex].textContent || '';
        startTimer(select.value, cat);
        toggleFocusHUD(true, cat, '00:00:00');
        document.getElementById('timerModal')?.classList.remove('active');
      }
    });
  }
  
  // Nav direct start shortcut
  bindClick('startTimerBtn', openTimerModal);

  bindClick('timerPauseBtn', () => {
    if (appState.activeTimer.isRunning) pauseTimer();
    else startTimer(appState.activeTimer.category || 'col1', appState.activeTimer.colName || '');
  });
  
  bindClick('timerStopBtn', () => {
    stopTimer();
    toggleFocusHUD(false);
  });

  bindClick('manualFocusToggle', () => toggleFocusHUD(false));

  // Session goal
  const goalInput = document.getElementById('sessionGoalInput') as HTMLInputElement;
  if (goalInput) {
    goalInput.addEventListener('change', () => {
      localStorage.setItem(STORAGE_KEYS.SESSION_GOAL, goalInput.value);
    });
  }

  // Settings
  bindClick('settingsBtn', openSettingsModal);
  bindClick('applyDateSettings', applyDateSettings);
  bindClick('applyColumnSettings', applyColumnSettings);
  bindClick('addExtraColumnBtn', addExtraColumn);
  bindClick('addCustomRangeBtn', addCustomRange);
  bindClick('closeSettingsModal', () => document.getElementById('settingsModal')?.classList.remove('active'));

  // Quick entry
  bindClick('saveQuickEntryBtn', saveQuickEntry);
  bindClick('saveBulkEntryBtn', saveBulkEntry);
  bindClick('jumpToDayBtn', jumpToDay);
  bindClick('closeQuickEntryModal', () => document.getElementById('quickEntryModal')?.classList.remove('active'));

  // Quick entry label updates
  document.getElementById('quickEntryDay')?.addEventListener('input', updateQuickEntryLabels);
  document.getElementById('bulkStartDay')?.addEventListener('input', updateBulkEntryLabels);

  // Modals
  bindClick('closeTimerModal', () => document.getElementById('timerModal')?.classList.remove('active'));
  bindClick('weeklyViewBtn', showWeeklySummary);
  bindClick('closeWeeklyModal', () => document.getElementById('weeklyModal')?.classList.remove('active'));
  bindClick('heatmapViewBtn', () => { document.getElementById('heatmapModal')?.classList.add('active'); renderHeatmap(); });
  bindClick('closeHeatmapModal', () => document.getElementById('heatmapModal')?.classList.remove('active'));
  bindClick('analyticsViewBtn', () => {
    document.getElementById('analyticsModal')?.classList.add('active');
    import('@/features/dashboard/study-analytics').then((m) => m.renderStudyAnalytics());
  });
  bindClick('closeAnalyticsModal', () => document.getElementById('analyticsModal')?.classList.remove('active'));
  bindClick('badgesViewBtn', () => { document.getElementById('badgesModal')?.classList.add('active'); renderBadges(); });
  bindClick('closeBadgesModal', () => document.getElementById('badgesModal')?.classList.remove('active'));
  bindClick('historyBtn', () => { document.getElementById('historyModal')?.classList.add('active'); renderSessionHistory(); });
  bindClick('closeHistoryModal', () => document.getElementById('historyModal')?.classList.remove('active'));
  bindClick('userManualBtn', () => document.getElementById('userManualModal')?.classList.add('active'));
  bindClick('closeUserManualModal', () => document.getElementById('userManualModal')?.classList.remove('active'));

  // Import
  bindClick('importBtn', () => document.getElementById('importModal')?.classList.add('active'));
  bindClick('closeImportModal', () => document.getElementById('importModal')?.classList.remove('active'));
  bindClick('importJsonBtn', importFromJSON);
  bindClick('importCsvBtn', importFromCSV);

  // Export
  bindClick('exportCsvBtn', exportTrackerDataCSV);

  // Reset
  bindClick('resetBtn', handleReset);

  // Beast mode
  const beastToggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  if (beastToggle) {
    beastToggle.checked = appState.settings.beastMode || false;
    beastToggle.addEventListener('change', () => {
      appState.settings.beastMode = beastToggle.checked;
      import('@/services/data-bridge').then((m) => m.saveSettingsToStorage(appState.settings));
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
}

// ─── Helper ──────────────────────────────────────────────────

function bindClick(id: string, handler: () => void): void {
  document.getElementById(id)?.addEventListener('click', handler);
}

// ─── Refresh (used by data-bridge after sync) ────────────────

export async function refreshApplicationUI(): Promise<void> {
  console.log('Refreshing UI after sync...');
  try {
    const [settings, data, routines, history, bookmarks] = await Promise.all([
      loadSettingsFromStorage(),
      loadTrackerDataFromStorage(),
      loadRoutinesFromStorage(),
      loadRoutineHistoryFromStorage(),
      loadBookmarksFromStorage(),
    ]);

    if (settings) appState.settings = { ...appState.settings, ...settings };
    if (!Array.isArray(appState.settings.extraColumns)) appState.settings.extraColumns = [];
    if (!Array.isArray(appState.settings.customRanges)) appState.settings.customRanges = [];
    appState.settings.customRanges.forEach((r: any) => {
      if (!Array.isArray(r.extraColumns)) r.extraColumns = [];
    });

    if (data && data.length) appState.trackerData = data;
    // migrate trackerData to include correct extraHours shape
    const extrasCount = appState.settings.extraColumns?.length || 0;
    appState.trackerData.forEach((d: any) => {
      if (!Array.isArray(d.extraHours)) d.extraHours = [];
      if (d.extraHours.length < extrasCount) d.extraHours = [...d.extraHours, ...Array.from({ length: extrasCount - d.extraHours.length }, () => 0)];
      if (d.extraHours.length > extrasCount) d.extraHours = d.extraHours.slice(0, extrasCount);
    });
    appState.routines = routines;
    appState.routineHistory = history;
    appState.bookmarks = bookmarks;

    calculateDates();
    generateTable();
    updateDashboard();
    renderPerformanceCurve();
    renderRoutine();
    renderBookmarks();

    console.log('UI Refresh complete.');
  } catch (error) {
    console.error('Error during UI refresh:', error);
  }
}
