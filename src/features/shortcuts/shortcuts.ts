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
import { appState, getColumnNames, initializeData } from '@/state/app-state';
import { formatDate } from '@/utils/date.utils';
import { showToast, jumpToDayInTable } from '@/utils/dom.utils';
import { saveTrackerDataToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';

// ─── Quick Entry ─────────────────────────────────────────────

export function openQuickEntryModal(): void {
  updateQuickEntryLabels();
  updateBulkEntryLabels();
  document.getElementById('quickEntryModal')?.classList.add('active');
}

export function updateQuickEntryLabels(): void {
  const day = parseInt((document.getElementById('quickEntryDay') as HTMLInputElement)?.value);
  const cols = getColumnNames(day && day >= 1 ? day : 1);
  const ids = ['quickCol1Label', 'quickCol2Label', 'quickCol3Label', 'quickCol4Label'];
  const names = [cols.col1, cols.col2, cols.col3, cols.col4];
  ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = `${names[i]} Hours:`; });
}

export function updateBulkEntryLabels(): void {
  const startDay = parseInt((document.getElementById('bulkStartDay') as HTMLInputElement)?.value);
  const cols = getColumnNames(startDay && startDay >= 1 ? startDay : 1);
  const ids = ['bulkCol1Label', 'bulkCol2Label', 'bulkCol3Label', 'bulkCol4Label'];
  const names = [cols.col1, cols.col2, cols.col3, cols.col4];
  ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = `${names[i]} Hours (per day):`; });
}

export function saveQuickEntry(): void {
  const day = parseInt((document.getElementById('quickEntryDay') as HTMLInputElement).value);
  if (!day || day < 1 || day > appState.totalDays) { showToast(`Please enter a valid day number (1-${appState.totalDays})`, 'error'); return; }

  const idx = day - 1;
  const col1 = parseFloat((document.getElementById('quickCol1') as HTMLInputElement).value) || 0;
  const col2 = parseFloat((document.getElementById('quickCol2') as HTMLInputElement).value) || 0;
  const col3 = parseFloat((document.getElementById('quickCol3') as HTMLInputElement).value) || 0;
  const col4 = parseFloat((document.getElementById('quickCol4') as HTMLInputElement).value) || 0;
  const topics = (document.getElementById('quickTopics') as HTMLTextAreaElement).value.trim();
  const problems = parseInt((document.getElementById('quickProblems') as HTMLInputElement).value) || 0;
  const project = (document.getElementById('quickProject') as HTMLInputElement).value.trim();
  const completed = (document.getElementById('quickCompleted') as HTMLInputElement).checked;

  if (completed && col1 === 0 && col2 === 0 && col3 === 0 && col4 === 0) { showToast('Please enter at least some study hours before marking as completed.', 'warning'); return; }

  Object.assign(appState.trackerData[idx], { pythonHours: col1, dsaHours: col2, projectHours: col3, col4Hours: col4, topics, dsaProblems: problems, project, completed });
  saveTrackerDataToStorage(appState.trackerData);
  generateTable(); updateDashboard(); renderHeatmap(); renderPerformanceCurve();
  jumpToDayInTable(day);

  ['quickEntryDay', 'quickCol1', 'quickCol2', 'quickCol3', 'quickCol4', 'quickTopics', 'quickProblems', 'quickProject'].forEach((id) => { (document.getElementById(id) as HTMLInputElement).value = ''; });
  (document.getElementById('quickCompleted') as HTMLInputElement).checked = false;
  showToast(`Day ${day} updated successfully!`, 'success');
}

export function saveBulkEntry(): void {
  const startDay = parseInt((document.getElementById('bulkStartDay') as HTMLInputElement).value);
  const endDay = parseInt((document.getElementById('bulkEndDay') as HTMLInputElement).value);
  if (!startDay || !endDay || startDay < 1 || endDay > appState.totalDays || startDay > endDay) { showToast(`Please enter a valid day range (1-${appState.totalDays})`, 'error'); return; }

  const col1 = parseFloat((document.getElementById('bulkCol1') as HTMLInputElement).value) || 0;
  const col2 = parseFloat((document.getElementById('bulkCol2') as HTMLInputElement).value) || 0;
  const col3 = parseFloat((document.getElementById('bulkCol3') as HTMLInputElement).value) || 0;
  const col4 = parseFloat((document.getElementById('bulkCol4') as HTMLInputElement).value) || 0;
  const completed = (document.getElementById('bulkCompleted') as HTMLInputElement).checked;

  if (completed && col1 === 0 && col2 === 0 && col3 === 0 && col4 === 0) { showToast('Please enter at least some study hours.', 'warning'); return; }

  for (let d = startDay; d <= endDay; d++) {
    const i = d - 1;
    appState.trackerData[i].pythonHours = col1;
    appState.trackerData[i].dsaHours = col2;
    appState.trackerData[i].projectHours = col3;
    appState.trackerData[i].col4Hours = col4;
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
  (document.getElementById('quickCol1') as HTMLInputElement).value = String(dayData.pythonHours || '');
  (document.getElementById('quickCol2') as HTMLInputElement).value = String(dayData.dsaHours || '');
  (document.getElementById('quickCol3') as HTMLInputElement).value = String(dayData.projectHours || '');
  (document.getElementById('quickCol4') as HTMLInputElement).value = String(dayData.col4Hours || '');
  (document.getElementById('quickTopics') as HTMLTextAreaElement).value = dayData.topics || '';
  (document.getElementById('quickProblems') as HTMLInputElement).value = String(dayData.dsaProblems || '');
  (document.getElementById('quickProject') as HTMLInputElement).value = dayData.project || '';
  (document.getElementById('quickCompleted') as HTMLInputElement).checked = dayData.completed || false;

  updateQuickEntryLabels();
  document.getElementById('quickEntryModal')?.classList.add('active');
  setTimeout(() => jumpToDayInTable(todayDay!), 100);
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
    const cols = getColumnNames(week[0].day);
    const stats = {
      completed: week.filter((d) => d.completed).length,
      totalHours: week.reduce((s, d) => s + d.pythonHours + d.dsaHours + d.projectHours + d.col4Hours + (Array.isArray(d.extraHours) ? d.extraHours.reduce((x, n) => x + (n || 0), 0) : 0), 0),
      col1: week.reduce((s, d) => s + d.pythonHours, 0),
      col2: week.reduce((s, d) => s + d.dsaHours, 0),
      col3: week.reduce((s, d) => s + d.projectHours, 0),
      col4: week.reduce((s, d) => s + d.col4Hours, 0),
    };
    return `
      <section class="weekly-card">
        <header class="weekly-card-header">
          <div class="weekly-title">WEEK ${wi + 1}</div>
          <div class="weekly-range">${formatDate(new Date(week[0].date))} → ${formatDate(new Date(week[week.length - 1].date))}</div>
        </header>

        <div class="weekly-grid">
          <div class="weekly-metric">
            <div class="weekly-label">Days Completed</div>
            <div class="weekly-value">${stats.completed}<span class="weekly-sub">/${week.length}</span></div>
          </div>
          <div class="weekly-metric">
            <div class="weekly-label">Total Hours</div>
            <div class="weekly-value">${stats.totalHours.toFixed(1)}<span class="weekly-sub">h</span></div>
          </div>
          <div class="weekly-metric">
            <div class="weekly-label">${cols.col1}</div>
            <div class="weekly-value">${stats.col1.toFixed(1)}<span class="weekly-sub">h</span></div>
          </div>
          <div class="weekly-metric">
            <div class="weekly-label">${cols.col2}</div>
            <div class="weekly-value">${stats.col2.toFixed(1)}<span class="weekly-sub">h</span></div>
          </div>
          <div class="weekly-metric">
            <div class="weekly-label">${cols.col3}</div>
            <div class="weekly-value">${stats.col3.toFixed(1)}<span class="weekly-sub">h</span></div>
          </div>
          <div class="weekly-metric">
            <div class="weekly-label">${cols.col4}</div>
            <div class="weekly-value">${stats.col4.toFixed(1)}<span class="weekly-sub">h</span></div>
          </div>
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
