/**
 * Handles Keyboard Shortcuts (Hotkeys).
 * 
 * It allows you to use keys like 'Ctrl+K' for Quick Entry, 
 * 'Ctrl+T' to jump to Today, and 'Esc' to close popups.
 */


import { openSettingsModal } from '@/features/settings/settings';
import { renderHeatmapModal } from '@/features/heatmap/heatmap';

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in inputs
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

    const mod = e.ctrlKey || e.metaKey;

    // Ctrl+T: Today
    if (mod && e.key === 't') { e.preventDefault(); scrollToToday(); }
    // Ctrl+H: Heatmap
    if (mod && e.key === 'h') { e.preventDefault(); document.getElementById('heatmapModal')?.classList.add('active'); renderHeatmapModal(); }
    // Ctrl+W: Weekly
    if (mod && e.key === 'w') { e.preventDefault(); showWeeklySummary(); }
    // Ctrl+,: Settings
    if (mod && e.key === ',') { e.preventDefault(); openSettingsModal(); }
    // Ctrl+F: Search
    if (mod && e.key === 'f') { e.preventDefault(); document.getElementById('tableSearch')?.focus(); }
    // Escape: Close modals
    if (e.key === 'Escape') { document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active')); }
  });
}

// These are imported dynamically by main.ts and need to be importable
import { appState, getColumnsForDay, initializeData } from '@/state/app-state';
import { formatDate } from '@/utils/date.utils';
import { showToast, jumpToDayInTable } from '@/utils/dom.utils';
import { saveTrackerDataToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';
import { syncProfileBroadcast } from '@/features/profile/profile.manager';

// --- Navigation Helpers ---

export function scrollToToday(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayDay: number | null = null;
  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) { todayDay = appState.trackerData[i].day; break; }
  }

  if (todayDay !== null) {
    jumpToDayInTable(todayDay);
  } else {
    showToast('Today is not within the tracking range.', 'warning');
  }
}

// --- Weekly Progress Summary ---

export function showWeeklySummary(): void {
  const modal = document.getElementById('weeklyModal');
  const content = document.getElementById('weeklySummaryContent');
  if (!modal || !content) return;

  const weeks = [];
  for (let i = 0; i < appState.trackerData.length; i += 7) {
    weeks.push(appState.trackerData.slice(i, i + 7));
  }

  const weekData = weeks.map((week, wi) => {
    const cols = getColumnsForDay(week[0].day);
    const completed = week.filter((d) => d.completed).length;
    const totalHours = week.reduce((s, d) => s + (Array.isArray(d.studyHours) ? d.studyHours.reduce((x, n) => x + (n || 0), 0) : 0), 0);
    const categoryTotals = cols.map((_, ci) => week.reduce((s, d) => s + (d.studyHours?.[ci] || 0), 0));
    
    return { week, wi, cols, completed, totalHours, categoryTotals };
  });

  content.innerHTML = weekData.map(({ week, wi, cols, completed, totalHours, categoryTotals }) => {
    const weeklyAvg = totalHours / 7;

    return `
      <section class="weekly-card">
        <header class="weekly-card-header">
          <div class="weekly-title">WEEK ${wi + 1}</div>
          <div class="weekly-range">${formatDate(new Date(week[0].date))} → ${formatDate(new Date(week[week.length - 1].date))}</div>
        </header>

        <div class="weekly-grid">
          <div class="weekly-metric">
            <div class="weekly-label">Days Completed</div>
            <div class="weekly-value">${completed}<span class="weekly-sub">/${week.length}</span></div>
          </div>
          <div class="weekly-metric">
            <div class="weekly-label">Total Hours</div>
            <div class="weekly-value">${totalHours.toFixed(1)}<span class="weekly-sub">h</span></div>
          </div>
          <div class="weekly-metric" style="background: rgba(100, 150, 255, 0.05); border-color: rgba(100, 150, 255, 0.2);">
            <div class="weekly-label" style="color: #60a5fa;">Weekly Avg</div>
            <div class="weekly-value">${weeklyAvg.toFixed(1)}<span class="weekly-sub">h/d</span></div>
          </div>
          ${cols.map((col, ci) => `
            <div class="weekly-metric">
              <div class="weekly-label">${col.name}</div>
              <div class="weekly-value">${categoryTotals[ci].toFixed(1)}<span class="weekly-sub">h</span></div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');

  modal.classList.add('active');
}



export function handleReset(): void {
  if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
    localStorage.removeItem('programmingTrackerData');
    appState.trackerData = initializeData();
    saveTrackerDataToStorage(appState.trackerData);
    generateTable(); updateDashboard(); renderHeatmap(); renderPerformanceCurve();
    showToast('All data has been reset.', 'success');
  }
}
