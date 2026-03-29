/**
 * Keyboard shortcuts
 *
 * Global keyboard shortcuts for quick navigation.
 */

import { openTimerModal } from '@/features/timer/timer';
import { openSettingsModal } from '@/features/settings/settings';
import { renderHeatmapModal } from '@/features/heatmap/heatmap';

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in inputs
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

    const mod = e.ctrlKey || e.metaKey;

    // Ctrl+K: Quick Entry
    if (mod && e.key === 'k') { e.preventDefault(); openQuickEntryModal(); }
    // Ctrl+T: Today
    if (mod && e.key === 't') { e.preventDefault(); openTodayEntry(); }
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

// ─── Quick Entry ─────────────────────────────────────────────

export function openQuickEntryModal(): void {
  renderQuickEntryFields();
  renderBulkEntryFields();
  document.getElementById('quickEntryModal')?.classList.add('active');
}

export function renderQuickEntryFields(): void {
  const container = document.getElementById('quickEntryHoursGrid');
  if (!container) return;

  const day = parseInt((document.getElementById('quickEntryDay') as HTMLInputElement)?.value);
  const cols = getColumnsForDay(day && day >= 1 ? day : 1);

  container.innerHTML = cols.map((col, i) => `
    <div class="row-between" style="border-bottom: 1px solid var(--border-color); padding: 5px 0;">
      <label>${col.name}:</label>
      <input type="number" class="input small quick-hour-input" data-idx="${i}" step="0.5" min="0" placeholder="0">
    </div>
  `).join('');
}

export function renderBulkEntryFields(): void {
  const container = document.getElementById('bulkEntryHoursGrid');
  if (!container) return;

  const startDay = parseInt((document.getElementById('bulkStartDay') as HTMLInputElement)?.value);
  const cols = getColumnsForDay(startDay && startDay >= 1 ? startDay : 1);

  container.innerHTML = cols.map((col, i) => `
    <div class="row-between" style="border-bottom: 1px solid var(--border-color); padding: 5px 0;">
      <label>${col.name} (per day):</label>
      <input type="number" class="input small bulk-hour-input" data-idx="${i}" step="0.5" min="0" placeholder="0">
    </div>
  `).join('');
}

export function saveQuickEntry(): void {
  const day = parseInt((document.getElementById('quickEntryDay') as HTMLInputElement).value);
  if (!day || day < 1 || day > appState.totalDays) {
    showToast(`Please enter a valid day number (1-${appState.totalDays})`, 'error');
    return;
  }

  const idx = day - 1;
  const hourInputs = document.querySelectorAll<HTMLInputElement>('.quick-hour-input');
  const studyHours: number[] = [];
  hourInputs.forEach(input => {
    const colIdx = parseInt(input.getAttribute('data-idx') || '0');
    studyHours[colIdx] = parseFloat(input.value) || 0;
  });

  const topics = (document.getElementById('quickTopics') as HTMLTextAreaElement).value.trim();
  const problems = parseInt((document.getElementById('quickProblems') as HTMLInputElement).value) || 0;
  const project = (document.getElementById('quickProject') as HTMLInputElement).value.trim();
  const completed = (document.getElementById('quickCompleted') as HTMLInputElement).checked;

  const totalHrs = studyHours.reduce((s, h) => s + h, 0);
  if (completed && totalHrs === 0) {
    showToast('Please enter at least some study hours before marking as completed.', 'warning');
    return;
  }

  Object.assign(appState.trackerData[idx], {
    studyHours,
    topics,
    problemsSolved: problems,
    project,
    completed
  });

  saveTrackerDataToStorage(appState.trackerData);
  generateTable(); updateDashboard(); renderHeatmap(); renderPerformanceCurve();
  jumpToDayInTable(day);

  // Reset fields
  ['quickEntryDay', 'quickProblems', 'quickProject', 'quickTopics'].forEach(id => {
    (document.getElementById(id) as HTMLInputElement).value = '';
  });
  (document.getElementById('quickCompleted') as HTMLInputElement).checked = false;
  document.querySelectorAll('.quick-hour-input').forEach(inp => (inp as HTMLInputElement).value = '');
  
  showToast(`Day ${day} updated successfully!`, 'success');
}

export function saveBulkEntry(): void {
  const startDay = parseInt((document.getElementById('bulkStartDay') as HTMLInputElement).value);
  const endDay = parseInt((document.getElementById('bulkEndDay') as HTMLInputElement).value);
  if (!startDay || !endDay || startDay < 1 || endDay > appState.totalDays || startDay > endDay) {
    showToast(`Please enter a valid day range (1-${appState.totalDays})`, 'error');
    return;
  }

  const hourInputs = document.querySelectorAll<HTMLInputElement>('.bulk-hour-input');
  const studyHours: number[] = [];
  hourInputs.forEach(input => {
    const colIdx = parseInt(input.getAttribute('data-idx') || '0');
    studyHours[colIdx] = parseFloat(input.value) || 0;
  });

  const completed = (document.getElementById('bulkCompleted') as HTMLInputElement).checked;
  const totalHrs = studyHours.reduce((s, h) => s + h, 0);

  if (completed && totalHrs === 0) {
    showToast('Please enter at least some study hours.', 'warning');
    return;
  }

  for (let d = startDay; d <= endDay; d++) {
    const i = d - 1;
    appState.trackerData[i].studyHours = [...studyHours];
    if (completed) appState.trackerData[i].completed = true;
  }

  saveTrackerDataToStorage(appState.trackerData);
  generateTable(); updateDashboard(); renderHeatmap(); renderPerformanceCurve();
  jumpToDayInTable(startDay);
  showToast(`Updated ${endDay - startDay + 1} days (${startDay}-${endDay}) successfully!`, 'success');
}

export function openTodayEntry(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayDay: number | null = null;
  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) { todayDay = appState.trackerData[i].day; break; }
  }

  if (todayDay === null) { showToast('Today is not within the tracking range.', 'warning'); return; }

  const dayData = appState.trackerData[todayDay - 1];
  (document.getElementById('quickEntryDay') as HTMLInputElement).value = String(todayDay);
  (document.getElementById('quickTopics') as HTMLTextAreaElement).value = dayData.topics || '';
  (document.getElementById('quickProblems') as HTMLInputElement).value = String(dayData.problemsSolved || '');
  (document.getElementById('quickProject') as HTMLInputElement).value = dayData.project || '';
  (document.getElementById('quickCompleted') as HTMLInputElement).checked = dayData.completed || false;

  renderQuickEntryFields();
  
  // Fill hours
  const inputs = document.querySelectorAll<HTMLInputElement>('.quick-hour-input');
  inputs.forEach(inp => {
    const idx = parseInt(inp.getAttribute('data-idx') || '0');
    inp.value = String(dayData.studyHours[idx] || '');
  });

  document.getElementById('quickEntryModal')?.classList.add('active');
  setTimeout(() => jumpToDayInTable(todayDay!), 100);
}

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

// ─── Weekly Summary ──────────────────────────────────────────

export function showWeeklySummary(): void {
  const modal = document.getElementById('weeklyModal');
  const content = document.getElementById('weeklySummaryContent');
  if (!modal || !content) return;

  const weeks = [];
  for (let i = 0; i < appState.trackerData.length; i += 7) {
    weeks.push(appState.trackerData.slice(i, i + 7));
  }

  content.innerHTML = weeks.map((week, wi) => {
    const cols = getColumnsForDay(week[0].day);
    const completed = week.filter((d) => d.completed).length;
    const totalHours = week.reduce((s, d) => s + (Array.isArray(d.studyHours) ? d.studyHours.reduce((x, n) => x + (n || 0), 0) : 0), 0);
    
    // Calculate totals per category
    const categoryTotals = cols.map((col, ci) => {
      return week.reduce((s, d) => s + (d.studyHours?.[ci] || 0), 0);
    });

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

export function jumpToDay(): void {
  const day = parseInt((document.getElementById('jumpToDay') as HTMLInputElement).value);
  if (!day || day < 1 || day > appState.totalDays) { showToast(`Please enter a valid day number (1-${appState.totalDays})`, 'error'); return; }
  jumpToDayInTable(day);
  document.getElementById('quickEntryModal')?.classList.remove('active');
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
