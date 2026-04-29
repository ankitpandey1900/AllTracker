import { appState } from "@/state/app-state";
import { openTimerModal, startTimer, stopTimer, resumeFromBreak, startBreak } from "@/features/timer/timer";
import { toggleFocusHUD } from "@/features/dashboard/dashboard";
import { renderSessionHistory } from "@/features/dashboard/session-history";
import { scrollToToday, setupKeyboardShortcuts, showWeeklySummary, handleReset } from "@/features/shortcuts/shortcuts";
import { exportAllData, exportTrackerDataCSV } from "@/features/export/export";
import { openSettingsModal, applyDateSettings, applyColumnSettings, addCustomRange } from "@/features/settings/settings";
import { renderBadges } from "@/features/dashboard/badges";
import { renderPerformanceCurve } from "@/features/routines/performance-chart";
import { renderRadarStats } from "@/features/routines/radar-stats";
import { importFromJSON, importFromCSV } from "@/features/import/import";
import { requestNotificationPermission } from "@/features/notifications/notifications";

/**
 * COMMAND CENTER
 * 
 * Handles all user interactions, button clicks, and navigation bindings.
 */

export function setupEventListeners(): void {
  // Dashboard buttons
  bindClick("toggleKpiBtn", () => {
    const container = document.getElementById("kpiContainer");
    const btn = document.getElementById("toggleKpiBtn");
    if (container && btn) {
      const isExpanded = container.classList.toggle("expanded");
      container.style.display = isExpanded ? "block" : "none";
      btn.textContent = isExpanded ? "HIDE DETAILS" : "SHOW DETAILS";
    }
  });

  bindClick("mainMissionStartBtn", openTimerModal);

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
  bindClick("shareQuoteBtn", () => {
    import('@/features/dashboard/share-quote-card').then(m => m.generateQuoteShareCard());
  });

  // Timer controls
  const timerStartBtn = document.getElementById("confirmStartTimerBtn");
  if (timerStartBtn) {
    timerStartBtn.addEventListener("click", () => {
      const select = document.getElementById("timerCategorySelect") as HTMLSelectElement;
      if (select) {
        const cat = select.options[select.selectedIndex].textContent || "";
        startTimer(parseInt(select.value, 10) || 0, cat);
        toggleFocusHUD(true, cat, "00:00:00");
        document.getElementById("timerModal")?.classList.remove("active");
      }
    });
  }

  bindClick("mobileNavStartTimerBtn", openTimerModal);

  bindClick("timerPauseBtn", () => {
    if (appState.activeTimer.isRunning) {
      document.getElementById('breakModal')?.classList.add('active');
    } else if (appState.activeTimer.activeBreak) {
      resumeFromBreak();
    } else {
      startTimer(parseInt(appState.activeTimer.category || "0", 10), appState.activeTimer.colName || "");
    }
  });

  bindClick("closeBreakModal", () => {
    document.getElementById('breakModal')?.classList.remove('active');
  });

  bindClick("startBreakBtn", () => {
    const customReason = (document.getElementById('breakReasonInput') as HTMLInputElement)?.value.trim() || 'Custom Break';
    document.getElementById('breakModal')?.classList.remove('active');
    startBreak(customReason);
  });

  const breakTags = document.querySelectorAll('.break-tag-btn');
  breakTags.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reason = (e.target as HTMLElement).dataset.reason;
      if (reason) {
        document.getElementById('breakModal')?.classList.remove('active');
        startBreak(reason);
      }
    });
  });

  bindClick("timerStopBtn", () => {
    stopTimer();
    toggleFocusHUD(false);
  });

  // Session goal
  const goalInput = document.getElementById("sessionGoalInput") as HTMLInputElement;
  if (goalInput) {
    goalInput.addEventListener("input", () => {
      appState.settings.sessionGoal = goalInput.value;
      import('@/services/data-bridge').then(({ saveSettingsToStorage }) => {
        saveSettingsToStorage(appState.settings);
      });
    });
  }

  // Settings & Navigation
  bindClick("settingsBtn", openSettingsModal);
  bindClick("userManualBtn", () => document.getElementById("userManualModal")?.classList.add("active"));
  bindClick("closeUserManualModal", () => document.getElementById("userManualModal")?.classList.remove("active"));
  bindClick("applyDateSettings", applyDateSettings);
  bindClick("applyColumnSettings", applyColumnSettings);
  bindClick("applyThemeBtn", () => {
    import('@/features/settings/settings').then(m => m.applyThemeSettings());
  });
  bindClick("enableNotificationsBtn", requestNotificationPermission);
  bindClick("addCustomRangeBtn", addCustomRange);
  bindClick("closeSettingsModal", () => document.getElementById("settingsModal")?.classList.remove("active"));

  // Modals
  bindClick("closeTimerModal", () => document.getElementById("timerModal")?.classList.remove("active"));
  bindClick("weeklyViewBtn", showWeeklySummary);
  bindClick("closeWeeklyModal", () => document.getElementById("weeklyModal")?.classList.remove("active"));
  bindClick("closeHeatmapModal", () => document.getElementById("heatmapModal")?.classList.remove("active"));

  const heatmapYearSelect = document.getElementById("heatmapYearSelect") as HTMLSelectElement;
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

  bindClick("closeAnalyticsModal", () => document.getElementById("analyticsModal")?.classList.remove("active"));
  bindClick("badgesViewBtn", () => {
    document.getElementById("badgesModal")?.classList.add("active");
    renderBadges();
  });
  bindClick("closeBadgesModal", () => document.getElementById("badgesModal")?.classList.remove("active"));
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

  bindClick("closeHistoryModal", () => document.getElementById("historyModal")?.classList.remove("active"));

  // Data Actions
  bindClick("importBtn", () => document.getElementById("importModal")?.classList.add("active"));
  bindClick("closeImportModal", () => document.getElementById("importModal")?.classList.remove("active"));
  bindClick("importJsonBtn", importFromJSON);
  bindClick("importCsvBtn", importFromCSV);
  bindClick("exportCsvBtn", exportTrackerDataCSV);
  bindClick("resetBtn", handleReset);

  // Backdrop Close
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  });
}

function bindClick(id: string, handler: () => void): void {
  document.getElementById(id)?.addEventListener("click", handler);
}
