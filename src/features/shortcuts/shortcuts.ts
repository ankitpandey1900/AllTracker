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
let currentWeekIndex = 0;
let cachedWeekData: any[] = [];

export function showWeeklySummary(): void {
  const modal = document.getElementById('weeklyModal');
  const content = document.getElementById('weeklySummaryContent');
  if (!modal || !content) return;

  const weeks = [];
  for (let i = 0; i < appState.trackerData.length; i += 7) {
    weeks.push(appState.trackerData.slice(i, i + 7));
  }

  cachedWeekData = weeks.map((week, wi) => {
    const catMap = new Map<string, number>();
    let completed = 0;
    let totalHours = 0;

    week.forEach(day => {
      if (day.completed) completed++;
      const dayCols = getColumnsForDay(day.day);
      if (Array.isArray(day.studyHours)) {
        day.studyHours.forEach((h, ci) => {
          const name = dayCols[ci]?.name;
          if (name && (h || 0) > 0) {
            catMap.set(name, (catMap.get(name) || 0) + (h || 0));
            totalHours += (h || 0);
          }
        });
      }
    });
    
    const displayCols = getColumnsForDay(week[0].day);
    return { week, wi, displayCols, catMap, completed, totalHours };
  });

  // Default to the week containing "today"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  currentWeekIndex = cachedWeekData.findIndex(w => 
    w.week.some((d: any) => {
      const dt = new Date(d.date);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime() === today.getTime();
    })
  );
  if (currentWeekIndex === -1) currentWeekIndex = cachedWeekData.length - 1;

  renderSingleWeek();
  modal.classList.add('active');
}

function renderSingleWeek(): void {
  const content = document.getElementById('weeklySummaryContent');
  if (!content || !cachedWeekData[currentWeekIndex]) return;

  const { week, wi, displayCols, catMap, completed, totalHours } = cachedWeekData[currentWeekIndex];
  const weeklyAvg = totalHours / 7;

  let maxCatHours = 0;
  displayCols.forEach((col: any) => {
    const val = catMap.get(col.name) || 0;
    if (val > maxCatHours) maxCatHours = val;
  });

  content.innerHTML = `
    <div class="wm-nav">
      <button class="wm-nav-btn" id="prevWeekBtn" ${currentWeekIndex === 0 ? 'disabled' : ''}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="wm-nav-title">
        <div class="wm-nav-week">WEEK ${wi + 1}</div>
        <div class="wm-nav-dates">${formatDate(new Date(week[0].date))} → ${formatDate(new Date(week[week.length - 1].date))}</div>
      </div>
      <button class="wm-nav-btn" id="nextWeekBtn" ${currentWeekIndex === cachedWeekData.length - 1 ? 'disabled' : ''}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>

    <div class="wm-hero">
      <div class="wm-hero-stat">
        <div class="wm-hero-val">${totalHours.toFixed(1)}<span class="wm-hero-unit">h</span></div>
        <div class="wm-hero-lbl">Total Hours</div>
      </div>
      <div class="wm-hero-divider"></div>
      <div class="wm-hero-stat highlight">
        <div class="wm-hero-val">${weeklyAvg.toFixed(1)}<span class="wm-hero-unit">h/d</span></div>
        <div class="wm-hero-lbl">Weekly Avg</div>
      </div>
    </div>

    <div class="wm-heatmap-card">
      <div class="wm-cons-header">
        <span class="wm-cons-title">Activity Heatmap</span>
        <span class="wm-cons-val">${completed}<span class="wm-cons-total">/7 Days Active</span></span>
      </div>
      <div class="wm-heatmap-grid">
        <div class="wm-hm-row header">
          <div class="wm-hm-label"></div>
          ${week.map((d: any) => `<div class="wm-hm-day">${new Date(d.date).toLocaleDateString('en-US', { weekday: 'narrow' })}</div>`).join('')}
        </div>
        ${displayCols.map((col: any, ci: number) => `
          <div class="wm-hm-row">
            <div class="wm-hm-label" title="${col.name}">${col.name}</div>
            ${week.map((d: any) => {
              const hours = (d.studyHours && d.studyHours[ci]) || 0;
              let intensity = 0;
              if (hours > 0) intensity = 0.2;
              if (hours >= 1) intensity = 0.4;
              if (hours >= 2) intensity = 0.6;
              if (hours >= 3) intensity = 0.8;
              if (hours >= 4) intensity = 1.0;
              
              const style = hours > 0 ? `background: rgba(var(--wm-accent-rgb), ${intensity}); border-color: rgba(var(--wm-accent-rgb), ${Math.min(1, intensity + 0.3)});` : '';
              return `<div class="wm-hm-cell" style="${style}" title="${col.name} on ${formatDate(new Date(d.date))}: ${hours.toFixed(1)}h"></div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="wm-subjects">
      <div class="wm-subjects-title">Subject Breakdown</div>
      <div class="wm-bars-container">
        ${displayCols.map((col: any) => {
          const val = catMap.get(col.name) || 0;
          const pct = maxCatHours > 0 ? (val / maxCatHours) * 100 : 0;
          return `
            <div class="wm-bar-row">
              <div class="wm-bar-header">
                <span class="wm-bar-name">${col.name}</span>
                <span class="wm-bar-val">${val.toFixed(1)}h</span>
              </div>
              <div class="wm-bar-track">
                <div class="wm-bar-fill" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
    if (currentWeekIndex > 0) { currentWeekIndex--; renderSingleWeek(); }
  });
  document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
    if (currentWeekIndex < cachedWeekData.length - 1) { currentWeekIndex++; renderSingleWeek(); }
  });
}



export function handleReset(): void {
  if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
    localStorage.removeItem('programmingTrackerData');
    appState.trackerData = initializeData();
    saveTrackerDataToStorage(appState.trackerData);

    // Split heavy renders across frames to keep the page responsive
    setTimeout(() => {
      generateTable();
      setTimeout(() => {
        updateDashboard();
        renderHeatmap();
        setTimeout(() => {
          renderPerformanceCurve();
          showToast('All data has been reset.', 'success');
        }, 60);
      }, 60);
    }, 60);
  }
}
