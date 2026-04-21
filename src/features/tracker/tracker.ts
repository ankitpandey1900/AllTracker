// Logic for the main Tracker table - handling study hours, topics, and problem counts.

import { appState, getAllHourColumnLabels, getPhase, getColumnsForDay } from '@/state/app-state';
import { NUMBER_FIELD_MAP } from '@/config/constants';
import { formatDate, formatDuration } from '@/utils/date.utils';
import { showToast } from '@/utils/dom.utils';
import { saveTrackerDataToStorage } from '@/services/data-bridge';
import type { TrackerDay, StudyCategory } from '@/types/tracker.types';
import { isRowEditable } from '@/services/integrity';
import { syncProfileBroadcast } from '@/features/profile/profile.manager';
import { escapeHtml } from '@/utils/security';
import { log } from '@/utils/logger.utils';


function getHourAt(day: TrackerDay, idx: number): number {
  return (day.studyHours?.[idx] ?? 0) as number;
}

function setHourAt(day: TrackerDay, idx: number, value: number): void {
  if (!Array.isArray(day.studyHours)) day.studyHours = [];
  day.studyHours[idx] = value;
}

function getTotalHours(day: TrackerDay): number {
  return Array.isArray(day.studyHours) ? day.studyHours.reduce((s, n) => s + (n || 0), 0) : 0;
}

// --- Building the Table ---

export function generateTable(): void {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  const data = appState.trackerData;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build dynamic header
  const labels = getAllHourColumnLabels(1);
  const theadRow = document.querySelector('#trackerTable thead tr');
  if (theadRow) {
    theadRow.innerHTML = `
      <th>Day</th>
      <th>Date</th>
      ${labels.map((l) => `<th>${l} Hrs</th>`).join('')}
      <th>Problems Solved</th>
      <th>Topics</th>
      <th>Project Work</th>
      <th>Done</th>
    `;
  }

  // Build rows
  let html = '';
  for (let i = 0; i < data.length; i++) {
    const day = data[i];
    const phase = getPhase(day.day);
    const isToday = new Date(day.date).setHours(0, 0, 0, 0) === today.getTime();
    const editable = isRowEditable(day.date);
    const dayLabels = getAllHourColumnLabels(day.day);

    let rowClass = phase;
    if (day.completed) rowClass += ' completed';
    if (day.restDay) rowClass += ' rest-day';
    if (isToday) rowClass += ' today';
    if (!editable) rowClass += ' locked-row';

    html += `
      <tr class="${rowClass}" data-day="${i}">
        <td class="day-cell">
          <span class="day-number">${day.day}</span>
          ${!editable ? '<span class="lock-icon" title="Locked by Iron-Gate Integrity Engine">🔒</span>' : ''}
        </td>
        <td class="date-cell">${formatDate(new Date(day.date))}</td>
        ${dayLabels.length > 0
        ? dayLabels.map((label: string, ci: number) => {
          const v = getHourAt(day, ci);
          const displayVal = formatDuration(v);
          // Professional approach: keep numeric entry for speed, but show human hint for clarity
          return `
            <td>
              <div class="hour-cell-wrapper">
                <input type="number" class="cell-input hour-input" data-col="${ci}" value="${v}" min="0" max="24" step="any" placeholder="0.0" ${!editable ? 'disabled' : ''}>
                <span class="duration-hint">${displayVal}</span>
              </div>
            </td>`;
        }).join('')
        : `<td colspan="1" class="no-cat-warning">No Categories Defined (Check Settings)</td>`
      }
        <td><input type="number" class="cell-input topics-solved" value="${day.problemsSolved}" min="0" step="1" ${!editable ? 'disabled' : ''}></td>
        <td>
          <div class="topics-cell">
            <textarea class="cell-input topics-input" rows="1" ${!editable ? 'readonly' : ''}>${escapeHtml(day.topics || '')}</textarea>
          </div>
        </td>
        <td>
          <div class="topics-cell">
            <textarea class="cell-input project-input" rows="1" ${!editable ? 'readonly' : ''}>${escapeHtml(day.project || '')}</textarea>
          </div>
        </td>
        <td class="action-cell">
          <div class="row-actions">
            <label class="checkbox-container" title="Mark as Completed">
              <input type="checkbox" class="completed-check" ${day.completed ? 'checked' : ''} ${!editable ? 'disabled' : ''}>
              <span class="checkmark"></span>
            </label>
            <button class="btn-rest-day ${day.restDay ? 'active' : ''} ${!editable ? 'disabled-btn' : ''}" data-day="${i}" title="${!editable ? 'Locked' : 'Streak Freeze / Rest Day'}" ${!editable ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8.1V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v3.1a5 5 0 0 0-2 9.48V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.42z"/><circle cx="12" cy="13" r="2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  if (data.length === 0) {
    const colCount = document.querySelectorAll('#trackerTable thead th').length || 10;
    html = `<tr><td colspan="${colCount}" style="text-align: center; padding: 40px; color: var(--text-secondary); font-style: italic;">No tracker data found. Your daily combat log will appear here.</td></tr>`;
  }

  requestAnimationFrame(() => {
    tbody.innerHTML = html;
    attachInputListeners();
  });
}

// --- Listening for Changes ---

function attachInputListeners(): void {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  // Standard number/duration inputs - keeping it number-based for speed
  tbody.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach((input) => {
    input.addEventListener('change', handleNumberInput);
    // Live hint: show "1h 30m" as they type "1.5" so they know it's working
    input.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      const hint = el.nextElementSibling as HTMLElement;
      if (hint && el.classList.contains('hour-input')) {
        const val = parseFloat(el.value) || 0;
        hint.textContent = formatDuration(val);
      }
    });
  });

  // Text inputs (topics)
  tbody.querySelectorAll<HTMLTextAreaElement>('.topics-input, .project-input').forEach((input) => {
    input.addEventListener('change', handleTextInput);
  });

  // Checkbox inputs (completed)
  tbody.querySelectorAll<HTMLInputElement>('.completed-check').forEach((input) => {
    input.addEventListener('change', handleCheckboxInput);
  });

  // Rest day buttons
  tbody.querySelectorAll<HTMLButtonElement>('.btn-rest-day').forEach((btn) => {
    btn.addEventListener('click', handleRestDayToggle);
  });
}

function getRowIndex(input: HTMLElement): number {
  const row = input.closest('tr');
  return row ? parseInt(row.getAttribute('data-day') || '-1') : -1;
}

function handleNumberInput(e: Event): void {
  const input = e.target as HTMLInputElement;
  const idx = getRowIndex(input);
  if (idx < 0) return;

  const day = appState.trackerData[idx];

  // Study hour logic (handling the multiple columns)
  const colIdxStr = input.getAttribute('data-col');
  if (colIdxStr !== null) {
    const colIdx = parseInt(colIdxStr);
    const newVal = parseFloat(input.value) || 0;
    
    // Day only has 24h - block anything impossible
    const otherHours = (day.studyHours || []).reduce((s, h, i) => s + (i === colIdx ? 0 : (h || 0)), 0);

    if (otherHours + newVal > 24) {
      showToast('Illegal timeline: Total hours for one day cannot exceed 24.', 'error');
      input.value = String(day.studyHours?.[colIdx] || 0);
      return;
    }

    setHourAt(day, colIdx, newVal);
    
    // Update the UI hint immediately
    const hint = input.nextElementSibling as HTMLElement;
    if (hint) hint.textContent = formatDuration(newVal);

    saveTrackerDataToStorage(appState.trackerData);
    syncProfileBroadcast();
    
    // Sync dashboard metrics
    import('@/features/dashboard/dashboard').then(m => m.updateDashboard());
    return;
  }

  // Handle generic fields (Problems Solved, etc)
  for (const [className, field] of Object.entries(NUMBER_FIELD_MAP)) {
    if (input.classList.contains(className)) {
      (appState.trackerData[idx] as any)[field] = parseFloat(input.value) || 0;
      break;
    }
  }

  saveTrackerDataToStorage(appState.trackerData);
  syncProfileBroadcast();
}

function handleTextInput(e: Event): void {
  const input = e.target as HTMLTextAreaElement;
  const idx = getRowIndex(input);
  if (idx < 0) return;

  if (input.classList.contains('topics-input')) {
    appState.trackerData[idx].topics = input.value;
  }
  if (input.classList.contains('project-input')) {
    appState.trackerData[idx].project = input.value;
  }

  saveTrackerDataToStorage(appState.trackerData);
  syncProfileBroadcast();
}

function handleCheckboxInput(e: Event): void {
  const input = e.target as HTMLInputElement;
  const idx = getRowIndex(input);
  if (idx < 0) return;

  const day = appState.trackerData[idx];
  const totalHours = getTotalHours(day);

  if (input.checked && totalHours === 0) {
    showToast('Please enter at least some study hours before marking as completed.', 'warning');
    input.checked = false;
    return;
  }

  day.completed = input.checked;
  saveTrackerDataToStorage(appState.trackerData);
  syncProfileBroadcast();

  // Update row styling
  const row = input.closest('tr');
  if (row) {
    row.classList.toggle('completed', input.checked);
  }
}

function handleRestDayToggle(e: Event): void {
  const target = e.currentTarget as HTMLElement;
  const btn = target.closest('.btn-rest-day') as HTMLButtonElement;
  const idx = parseInt(btn.getAttribute('data-day') || '-1');
  if (idx < 0) return;

  const day = appState.trackerData[idx];

  // Validation: Only 4 rest days allowed in a rolling 30-day window
  if (!day.restDay) {
    const targetDate = new Date(day.date);
    const thirtyDaysAgo = new Date(targetDate);
    thirtyDaysAgo.setDate(targetDate.getDate() - 30);

    const count = appState.trackerData.filter(d => {
      const dDate = new Date(d.date);
      return d.restDay && dDate >= thirtyDaysAgo && dDate <= targetDate;
    }).length;

    if (count >= 4) {
      showToast('Integrity Alert: Maximum 4 legacy freezes allowed per 30-day cycle.', 'error');
      return;
    }
  }

  day.restDay = !day.restDay;

  if (day.restDay) {
    day.completed = false; // Cannot be both completed and rest
  }

  saveTrackerDataToStorage(appState.trackerData);
  generateTable(); // Refresh to update visuals
  syncProfileBroadcast();

  // Also update dashboard to refresh streak
  import('@/features/dashboard/dashboard').then(m => m.updateDashboard());
}

// --- Table Search and Filters ---

export function setupTableSearch(): void {
  const searchInput = document.getElementById('tableSearch');
  const filterCompleted = document.getElementById('filterCompleted');
  const filterWithHours = document.getElementById('filterWithHours');

  if (searchInput) searchInput.addEventListener('input', filterTable);
  if (filterCompleted) filterCompleted.addEventListener('change', filterTable);
  if (filterWithHours) filterWithHours.addEventListener('change', filterTable);
}

function filterTable(): void {
  const searchTerm = (document.getElementById('tableSearch') as HTMLInputElement)?.value.toLowerCase() || '';
  const showCompleted = (document.getElementById('filterCompleted') as HTMLInputElement)?.checked || false;
  const showWithHours = (document.getElementById('filterWithHours') as HTMLInputElement)?.checked || false;

  const rows = document.querySelectorAll('#tableBody tr');
  let visibleCount = 0;

  rows.forEach((row, index) => {
    const dayData = appState.trackerData[index];
    if (!dayData) return;

    let shouldShow = true;

    if (searchTerm) {
      const dayMatch = dayData.day.toString().includes(searchTerm);
      const dateMatch = formatDate(new Date(dayData.date)).toLowerCase().includes(searchTerm);
      const topicsMatch = (dayData.topics || '').toLowerCase().includes(searchTerm);
      const projectMatch = (dayData.project || '').toLowerCase().includes(searchTerm);
      if (!dayMatch && !dateMatch && !topicsMatch && !projectMatch) shouldShow = false;
    }

    if (showCompleted && !dayData.completed) shouldShow = false;
    if (showWithHours) {
      const totalHours = getTotalHours(dayData);
      if (totalHours === 0) shouldShow = false;
    }

    if (shouldShow) {
      (row as HTMLElement).classList.remove('hidden');
      visibleCount++;
    } else {
      (row as HTMLElement).classList.add('hidden');
    }
  });

  // No-results message
  const tbody = document.getElementById('tableBody');
  let noResultsMsg = document.getElementById('noResultsMessage');
  if (visibleCount === 0 && (searchTerm || showCompleted || showWithHours)) {
    if (!noResultsMsg && tbody) {
      noResultsMsg = document.createElement('tr');
      noResultsMsg.id = 'noResultsMessage';
      const colCount = document.querySelectorAll('#trackerTable thead th').length || 10;
      noResultsMsg.innerHTML = `<td colspan="${colCount}" style="text-align:center; padding:40px; color:var(--text-secondary);">No results found. Try adjusting your filters.</td>`;
      tbody.appendChild(noResultsMsg);
    }
  } else if (noResultsMsg) {
    noResultsMsg.remove();
  }
}

/**
 * 🛰️ DATA RECONCILIATION ENGINE
 * 
 * Adjusts the local appState.trackerData when a session is mutated (edit/delete).
 * This ensures that the HUD metrics, XP, and grid always stay in absolute sync 
 * with the cloud session logs.
 */
export async function adjustTrackerDataForSessionDelta(
  dateStr: string,
  subject: string,
  deltaHours: number
): Promise<void> {
  const data = appState.trackerData;
  if (!data || data.length === 0) return;

  // 1. Find the day entry for this date
  const isoDate = dateStr.split('T')[0];
  const day = data.find(d => d.date.startsWith(isoDate));
  if (!day) {
    log.warn(`[Reconciler]: No tracker entry found for date ${isoDate}. Local state might be out of sync.`);
    return;
  }

  // 2. Map subject name to column index for this specific day
  // Senior Implementation: Support Custom Ranges by fetching schema for that specific day
  const dayCols = getColumnsForDay(day.day);
  const colIdx = dayCols.findIndex((c: StudyCategory) => c.name.trim().toLowerCase() === subject.trim().toLowerCase());

  if (colIdx === -1) {
    log.warn(`[Reconciler]: Subject '${subject}' not found in column schema for day ${day.day}. Local adjustment skipped.`);
    return;
  }

  // 3. Apply the delta
  const currentVal = getHourAt(day, colIdx);
  const newVal = Math.max(0, currentVal + deltaHours);
  setHourAt(day, colIdx, newVal);

  // 4. Auto-calculate 'completed' status
  const totalHours = getTotalHours(day);
  const totalTarget = dayCols.reduce((acc: number, c: StudyCategory) => acc + (c.target || 0), 0);
  
  day.completed = totalHours >= totalTarget && totalHours > 0;

  // 5. Persistence
  await saveTrackerDataToStorage(data);
  
  // 6. Broadcast to trigger leaderboard/profile updates in cloud
  syncProfileBroadcast();
  
  log.info(`[Reconciler]: Adjusted ${subject} by ${deltaHours}h for ${isoDate}. New total: ${totalHours}h.`);
}
