/**
 * Tracker table feature
 *
 * Generates the main data table and handles inline editing of each row.
 */

import { appState, getAllHourColumnLabels, getPhase } from '@/state/app-state';
import { NUMBER_FIELD_MAP } from '@/config/constants';
import { formatDate } from '@/utils/date.utils';
import { showToast } from '@/utils/dom.utils';
import { saveTrackerDataToStorage } from '@/services/data-bridge';
import type { TrackerDay } from '@/types/tracker.types';

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

// ─── Table Generation ────────────────────────────────────────

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
    const dayDate = new Date(day.date);
    const phase = getPhase(day.day);
    const isToday = dayDate.setHours(0, 0, 0, 0) === today.getTime();
    const totalHours = getTotalHours(day);
    const dayLabels = getAllHourColumnLabels(day.day);

    let rowClass = phase;
    if (day.completed) rowClass += ' completed';
    if (isToday) rowClass += ' today';

    html += `
      <tr class="${rowClass}" data-day="${i}">
        <td class="day-cell">
          <span class="day-number">${day.day}</span>
        </td>
        <td class="date-cell">${formatDate(new Date(day.date))}</td>
        ${dayLabels.length > 0 
          ? dayLabels.map((label, ci) => {
              const v = getHourAt(day, ci);
              return `<td><input type="number" class="cell-input hour-input" data-col="${ci}" value="${v}" min="0" step="0.5" title="${label}"></td>`;
            }).join('') 
          : `<td colspan="1" class="no-cat-warning">No Categories Define (Check Settings)</td>`
        }
        <td><input type="number" class="cell-input topics-solved" value="${day.problemsSolved}" min="0" step="1"></td>
        <td>
          <div class="topics-cell">
            <textarea class="cell-input topics-input" rows="1">${day.topics || ''}</textarea>
          </div>
        </td>
        <td>
          <div class="topics-cell">
            <textarea class="cell-input project-input" rows="1">${day.project || ''}</textarea>
          </div>
        </td>
        <td>
          <label class="checkbox-container">
            <input type="checkbox" class="completed-check" ${day.completed ? 'checked' : ''}>
            <span class="checkmark"></span>
          </label>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html;

  // Attach listeners
  attachInputListeners();

  // Attach listeners
  attachInputListeners();
}

// ─── Input Listeners ─────────────────────────────────────────

function attachInputListeners(): void {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  // Number inputs (hours + problems)
  tbody.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach((input) => {
    input.addEventListener('change', handleNumberInput);
  });

  // Text inputs (topics)
  tbody.querySelectorAll<HTMLTextAreaElement>('.topics-input, .project-input').forEach((input) => {
    input.addEventListener('change', handleTextInput);
  });

  // Checkbox inputs (completed)
  tbody.querySelectorAll<HTMLInputElement>('.completed-check').forEach((input) => {
    input.addEventListener('change', handleCheckboxInput);
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

  // Dynamic hour columns
  const colIdxStr = input.getAttribute('data-col');
  if (colIdxStr !== null) {
    const colIdx = parseInt(colIdxStr);
    if (!isNaN(colIdx)) {
      setHourAt(appState.trackerData[idx], colIdx, parseFloat(input.value) || 0);
      saveTrackerDataToStorage(appState.trackerData);
      return;
    }
  }

  // Determine which field to update based on input class
  for (const [className, field] of Object.entries(NUMBER_FIELD_MAP)) {
    if (input.classList.contains(className)) {
      (appState.trackerData[idx] as unknown as Record<string, number>)[field] = parseFloat(input.value) || 0;
      break;
    }
  }

  saveTrackerDataToStorage(appState.trackerData);
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

  // Update row styling
  const row = input.closest('tr');
  if (row) {
    row.classList.toggle('completed', input.checked);
  }
}

// ─── Table Search & Filter ───────────────────────────────────

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
