/**
 * Handles Keyboard Shortcuts (Hotkeys).
 * 
 * It allows you to use keys like 'Ctrl+K' for Quick Entry, 
 * 'Ctrl+T' to jump to Today, and 'Esc' to close popups.
 */


import { openSettingsModal } from '@/features/settings/settings';
import { renderHeatmapModal } from '@/features/heatmap/heatmap';
import { CATEGORY_COLORS } from '@/config/constants';

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
          if ((h || 0) > 0) {
            const name = dayCols[ci]?.name || `Subject ${ci + 1}`;
            catMap.set(name, (catMap.get(name) || 0) + (h || 0));
            totalHours += (h || 0);
          }
        });
      }
    });

    // Collect unique display columns from ALL days in the week
    const colNameSet = new Set<string>();
    const displayCols: any[] = [];
    week.forEach(day => {
      const dayCols = getColumnsForDay(day.day);
      dayCols.forEach((col: any) => {
        if (!colNameSet.has(col.name)) {
          colNameSet.add(col.name);
          displayCols.push(col);
        }
      });
      
      // Ensure we have a column for any logged hours that lost their category mapping
      if (Array.isArray(day.studyHours)) {
        day.studyHours.forEach((h, ci) => {
          if ((h || 0) > 0 && !dayCols[ci]) {
             const fallbackName = `Subject ${ci + 1}`;
             if (!colNameSet.has(fallbackName)) {
               colNameSet.add(fallbackName);
               displayCols.push({ name: fallbackName, color: 'var(--text-secondary)' });
             }
          }
        });
      }
    });

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
  // Apply user's accent color directly on the modal to override theme defaults
  const accentColor = appState.settings.accentColor;
  if (accentColor && modal) {
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    modal.style.setProperty('--wm-accent', accentColor);
    modal.style.setProperty('--wm-accent-rgb', `${r}, ${g}, ${b}`);
  }
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

  const lastWeekData = currentWeekIndex > 0 ? cachedWeekData[currentWeekIndex - 1] : null;
  const lastWeekTotalHours = lastWeekData ? lastWeekData.totalHours : 0;
  
  const diffHours = totalHours - lastWeekTotalHours;
  const diffHoursAbs = Math.abs(diffHours);
  const diffH = Math.floor(diffHoursAbs);
  const diffM = Math.round((diffHoursAbs - diffH) * 60);
  const hoursTrendText = lastWeekTotalHours === 0 ? "No previous data" : (diffHours >= 0 ? `+${diffH}h ${diffM}m vs last week` : `-${diffH}h ${diffM}m vs last week`);
  

  const lastWeekAvg = lastWeekTotalHours / 7;
  const diffAvg = weeklyAvg - lastWeekAvg;
  const diffAvgAbs = Math.abs(diffAvg);
  const diffAvgH = Math.floor(diffAvgAbs);
  const diffAvgM = Math.round((diffAvgAbs - diffAvgH) * 60);
  const avgTrendText = lastWeekTotalHours === 0 ? "No previous data" : (diffAvg >= 0 ? `+${diffAvgH}h ${diffAvgM}m vs last week` : `-${diffAvgH}h ${diffAvgM}m vs last week`);
  
  const focusScore = Math.min(100, Math.round((completed / 7 * 50) + (Math.min(totalHours, 40) / 40 * 50)));
  const focusMsg = focusScore >= 80 ? 'Great consistency!' : (focusScore >= 50 ? 'Good effort!' : 'Needs more focus!');

  const formatHM = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m < 10 ? '0' + m : m}m`;
  };

  let titleText = `WEEK ${wi + 1}`;
  const ranges = appState.settings.customRanges;
  if (ranges && ranges.length > 0) {
    const firstDayStr = week[0].date;
    const activeRange = ranges.find(r => firstDayStr >= r.startDate && firstDayStr <= r.endDate);
    if (activeRange) {
      const phaseName = activeRange.name || 'PHASE';
      const phaseStartWeekIndex = cachedWeekData.findIndex(w => w.week.some((d: any) => d.date >= activeRange.startDate && d.date <= activeRange.endDate));
      if (phaseStartWeekIndex !== -1) {
        titleText = `${phaseName.toUpperCase()} — WEEK ${(wi - phaseStartWeekIndex) + 1}`;
      }
    }
  }

  let totalBreakMinutes = 0;
  const sessionCounts: Record<string, Record<string, number>> = {};
  
  try {
    const localSaved = localStorage.getItem('all_tracker_history');
    if (localSaved) {
      const history: any[] = JSON.parse(localSaved);
      const weekStartStr = week[0].date;
      const weekEndStr = week[week.length - 1].date;
      
      history.forEach(session => {
        const sessionDate = session.log_date || (session.start_at ? session.start_at.split('T')[0] : null);
        if (sessionDate && sessionDate >= weekStartStr && sessionDate <= weekEndStr) {
          const subName = session.subject || 'General';
          if (!sessionCounts[sessionDate]) sessionCounts[sessionDate] = {};
          sessionCounts[sessionDate][subName] = (sessionCounts[sessionDate][subName] || 0) + 1;
          if (session.note) {
            const breakMatch = session.note.match(/\[Breaks:\s*(.*?)\]/);
            if (breakMatch && breakMatch[1]) {
              const minMatches = breakMatch[1].match(/(\d+)m/g);
              if (minMatches) {
                minMatches.forEach((m: string) => {
                  totalBreakMinutes += parseInt(m.replace('m', ''));
                });
              }
            }
          }
        }
      });
    }
  } catch(e) { console.error(e); }

  const formatM = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  content.innerHTML = `
    <div class="wm-nav">
      <button class="wm-nav-btn" id="prevWeekBtn" ${currentWeekIndex === 0 ? 'disabled' : ''}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="wm-nav-title">
        <div class="wm-nav-week">${titleText}</div>
        <div class="wm-nav-dates"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; margin-bottom:-1px; opacity:0.7;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDate(new Date(week[0].date))} – ${formatDate(new Date(week[week.length - 1].date))}</div>
      </div>
      <button class="wm-nav-btn" id="nextWeekBtn" ${currentWeekIndex === cachedWeekData.length - 1 ? 'disabled' : ''}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>

    <div class="wm-hero-grid">
      <div class="wm-hero-card">
        <div class="wm-hc-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="wm-hc-info">
          <div class="wm-hc-lbl">Total Hours</div>
          <div class="wm-hc-val">${formatHM(totalHours)}</div>
          <div class="wm-hc-trend">${hoursTrendText}</div>
        </div>
      </div>
      <div class="wm-hero-card">
        <div class="wm-hc-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg></div>
        <div class="wm-hc-info">
          <div class="wm-hc-lbl">Active Days</div>
          <div class="wm-hc-val">${completed} <span style="font-size:0.5em; opacity:0.6;">/ 7</span></div>
          <div class="wm-hc-trend">Days Active</div>
        </div>
      </div>
      <div class="wm-hero-card">
        <div class="wm-hc-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
        <div class="wm-hc-info">
          <div class="wm-hc-lbl">Daily Avg</div>
          <div class="wm-hc-val">${formatHM(weeklyAvg)} <span style="font-size:0.5em; opacity:0.6;">/day</span></div>
          <div class="wm-hc-trend">${avgTrendText}</div>
        </div>
      </div>
      <div class="wm-hero-card wm-hero-card--wide">
        <div class="wm-hc-icon" style="color: var(--wm-accent);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
        <div class="wm-hc-info">
          <div class="wm-hc-lbl">Focus Score</div>
          <div class="wm-hc-val" style="color: var(--wm-accent);">${focusScore} <span style="font-size:0.5em; opacity:0.6;">/100</span></div>
          <div class="wm-hc-trend">${focusMsg}</div>
        </div>
      </div>
      <div class="wm-hero-card wm-hero-card--wide">
        <div class="wm-hc-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>
        <div class="wm-hc-info">
          <div class="wm-hc-lbl">Break Time</div>
          <div class="wm-hc-val">${formatM(totalBreakMinutes)}</div>
          <div class="wm-hc-trend">Total Rest Taken</div>
        </div>
      </div>
    </div>

    <div class="wm-heatmap-card">
      <div class="wm-cons-header">
        <span class="wm-cons-title">Activity Heatmap</span>
        <div class="wm-hm-legend">
          <span style="font-size:0.75rem; color:var(--wm-text-muted);">Less</span>
          <div class="wm-hm-legend-cell" style="background:rgba(var(--wm-accent-rgb), 0.2); border-color:rgba(var(--wm-accent-rgb), 0.3);"></div>
          <div class="wm-hm-legend-cell" style="background:rgba(var(--wm-accent-rgb), 0.4); border-color:rgba(var(--wm-accent-rgb), 0.5);"></div>
          <div class="wm-hm-legend-cell" style="background:rgba(var(--wm-accent-rgb), 0.6); border-color:rgba(var(--wm-accent-rgb), 0.7);"></div>
          <div class="wm-hm-legend-cell" style="background:rgba(var(--wm-accent-rgb), 0.8); border-color:rgba(var(--wm-accent-rgb), 0.9);"></div>
          <div class="wm-hm-legend-cell" style="background:var(--wm-accent); border-color:var(--wm-accent);"></div>
          <span style="font-size:0.75rem; color:var(--wm-text-muted);">More</span>
        </div>
      </div>
      <div class="wm-heatmap-grid">
        <div class="wm-hm-row header">
          <div class="wm-hm-label empty-label"></div>
          ${week.map((d: any) => {
            const isToday = new Date(d.date).toDateString() === new Date().toDateString();
            return `<div class="wm-hm-day ${isToday ? 'is-today' : ''}">
              ${isToday ? '<div class="wm-hm-today-badge">TODAY</div>' : ''}
              ${new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </div>`;
          }).join('')}
        </div>
        ${displayCols.map((col: any, ci: number) => {
          const color = CATEGORY_COLORS[ci % CATEGORY_COLORS.length];
          let activeDays = 0;
          week.forEach((d: any) => { if ((d.studyHours && d.studyHours[ci]) > 0) activeDays++; });
          const pct = Math.round((activeDays / 7) * 100);
          
          const iconPath = (() => {
            const n = col.name.toLowerCase();
            if (n.includes('c++') || n.includes('code') || n.includes('dev')) return `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`;
            if (n.includes('dsa') || n.includes('brain')) return `<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>`;
            if (n.includes('web') || n.includes('net')) return `<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>`;
            if (n.includes('project') || n.includes('app')) return `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`;
            if (n.includes('os') || n.includes('sys')) return `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`;
            if (n.includes('clg') || n.includes('col') || n.includes('uni')) return `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`;
            if (n.includes('read') || n.includes('book')) return `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>`;
            return `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>`;
          })();
          const svg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;

          return `
          <div class="wm-hm-row">
            <div class="wm-hm-label rich-label">
              <div class="hl-icon" style="background: ${color}15; border: 1px solid ${color}40;">
                ${svg}
              </div>
              <div class="hl-info">
                <div class="hl-title">${col.name}</div>
                <div class="hl-stats">
                  <span>${activeDays} / 7</span>
                  <span>${pct}%</span>
                </div>
                <div class="hl-progress-track">
                  <div class="hl-progress-fill" style="width: ${pct}%; background: ${color};"></div>
                </div>
              </div>
            </div>
            ${week.map((d: any) => {
              const hours = (d.studyHours && d.studyHours[ci]) || 0;
              const isToday = new Date(d.date).toDateString() === new Date().toDateString();
              let intensity = 0;
              if (hours > 0) intensity = 0.2;
              if (hours >= 1) intensity = 0.4;
              if (hours >= 2) intensity = 0.6;
              if (hours >= 3) intensity = 0.8;
              if (hours >= 4) intensity = 1.0;
              
              const style = hours > 0 ? `background: rgba(var(--wm-accent-rgb), ${intensity}); border-color: rgba(var(--wm-accent-rgb), ${Math.min(1, intensity + 0.3)});` : '';
              
              const dayStr = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
              const actualSessions = sessionCounts[d.date]?.[col.name] || 0;
              
              return `
              <div class="wm-hm-cell-wrapper ${isToday ? 'is-today-col' : ''}">
                <div class="wm-hm-cell" style="${style}">
                  <div class="wm-hm-tooltip">
                    <div class="tt-header">${col.name} &bull; ${dayStr}</div>
                    <div class="tt-stat">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <div><strong>${hours > 0 ? formatHM(hours) : '0h 0m'}</strong> <span class="tt-muted">Focus Time</span></div>
                    </div>
                    <div class="tt-stat">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      <div><strong>${actualSessions}</strong> <span class="tt-muted">Sessions</span></div>
                    </div>
                    <div class="tt-footer">View details <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        `}).join('')}
      </div>
      <div class="wm-hm-footer">
        <div class="wm-hm-tip">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          Tip: Hover over any activity to see details
        </div>
        <div class="wm-hm-link">
          View full analytics <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>

    <div class="wm-subjects">
      <div class="wm-subjects-header">
        <div class="wm-subjects-title">Subject Breakdown</div>
        <div class="wm-subjects-total">Total: ${formatHM(totalHours)}</div>
      </div>
      <div class="wm-bars-container">
        ${displayCols.map((col: any, ci: number) => {
          const val = catMap.get(col.name) || 0;
          const overallPct = totalHours > 0 ? (val / totalHours) * 100 : 0;
          const color = CATEGORY_COLORS[ci % CATEGORY_COLORS.length];
          
          const iconPath = (() => {
            const n = col.name.toLowerCase();
            if (n.includes('c++') || n.includes('code') || n.includes('dev')) return `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`;
            if (n.includes('dsa') || n.includes('brain')) return `<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>`;
            if (n.includes('web') || n.includes('net')) return `<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>`;
            if (n.includes('project') || n.includes('app')) return `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`;
            if (n.includes('os') || n.includes('sys')) return `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`;
            if (n.includes('clg') || n.includes('col') || n.includes('uni')) return `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`;
            if (n.includes('read') || n.includes('book')) return `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>`;
            return `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>`;
          })();
          const svg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;

          return `
            <div class="wm-bar-row" style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
              <div class="wm-bar-icon" style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ${color}15; border: 1px solid ${color}40;">
                ${svg}
              </div>
              <div class="wm-bar-name" style="width: 100px; font-weight: 700;">${col.name}</div>
              <div style="flex-grow: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.8rem; font-weight: 600;">
                  <span style="color: var(--wm-text);">${formatHM(val)}</span>
                  <span style="color: var(--wm-text-muted);">${Math.round(overallPct)}%</span>
                </div>
                <div class="wm-bar-track" style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; width: 100%;">
                  <div class="wm-bar-fill" style="width: ${overallPct}%; height: 100%; background: ${color}; border-radius: 2px;"></div>
                </div>
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
    localStorage.removeItem('at_session_data');
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
