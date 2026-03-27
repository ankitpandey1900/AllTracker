/**
 * Settings feature
 *
 * Settings modal, date configuration, column names, and custom ranges.
 */

import { appState, calculateDates, initializeData } from '@/state/app-state';
import { DEFAULT_COLUMNS } from '@/config/constants';
import { showToast } from '@/utils/dom.utils';
import { saveSettingsToStorage, saveTrackerDataToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';

// ─── Open Settings ───────────────────────────────────────────

export function openSettingsModal(): void {
  const s = appState.settings;

  (document.getElementById('startDateInput') as HTMLInputElement).value = s.startDate;
  (document.getElementById('endDateInput') as HTMLInputElement).value = s.endDate;
  (document.getElementById('col1Default') as HTMLInputElement).value = s.defaultColumns.col1 || DEFAULT_COLUMNS.col1;
  (document.getElementById('col2Default') as HTMLInputElement).value = s.defaultColumns.col2 || DEFAULT_COLUMNS.col2;
  (document.getElementById('col3Default') as HTMLInputElement).value = s.defaultColumns.col3 || DEFAULT_COLUMNS.col3;
  (document.getElementById('col4Default') as HTMLInputElement).value = s.defaultColumns.col4 || DEFAULT_COLUMNS.col4;
  (document.getElementById('col1Target') as HTMLInputElement).value = String(s.targets?.col1 || 0);
  (document.getElementById('col2Target') as HTMLInputElement).value = String(s.targets?.col2 || 0);
  (document.getElementById('col3Target') as HTMLInputElement).value = String(s.targets?.col3 || 0);
  (document.getElementById('col4Target') as HTMLInputElement).value = String(s.targets?.col4 || 0);

  renderExtraColumns();
  renderCustomRanges();
  document.getElementById('settingsModal')?.classList.add('active');
}

// ─── Apply Date Settings ─────────────────────────────────────

export function applyDateSettings(): void {
  const startDate = (document.getElementById('startDateInput') as HTMLInputElement).value;
  const endDate = (document.getElementById('endDateInput') as HTMLInputElement).value;

  if (!startDate || !endDate) { showToast('Please select both start and end dates.', 'error'); return; }
  if (new Date(startDate) >= new Date(endDate)) { showToast('End date must be after start date.', 'error'); return; }

  appState.settings.startDate = startDate;
  appState.settings.endDate = endDate;
  saveSettingsToStorage(appState.settings);
  calculateDates();

  const oldData = [...appState.trackerData];
  appState.trackerData = initializeData();

  const newStart = new Date(appState.settings.startDate);
  oldData.forEach((oldDay) => {
    const oldDate = new Date(oldDay.date);
    if (oldDate >= newStart && oldDate <= new Date(appState.settings.endDate)) {
      const dayIndex = Math.floor((oldDate.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < appState.trackerData.length) {
        appState.trackerData[dayIndex] = { ...appState.trackerData[dayIndex], ...oldDay, day: dayIndex + 1 };
      }
    }
  });

  saveTrackerDataToStorage(appState.trackerData);
  generateTable();
  updateDashboard();
  renderHeatmap();
  renderPerformanceCurve();
  showToast('Dates updated successfully!', 'success');
}

// ─── Apply Column Settings ───────────────────────────────────

export function applyColumnSettings(): void {
  appState.settings.defaultColumns = {
    col1: (document.getElementById('col1Default') as HTMLInputElement).value.trim() || DEFAULT_COLUMNS.col1,
    col2: (document.getElementById('col2Default') as HTMLInputElement).value.trim() || DEFAULT_COLUMNS.col2,
    col3: (document.getElementById('col3Default') as HTMLInputElement).value.trim() || DEFAULT_COLUMNS.col3,
    col4: (document.getElementById('col4Default') as HTMLInputElement).value.trim() || DEFAULT_COLUMNS.col4,
  };

  appState.settings.targets = {
    col1: parseFloat((document.getElementById('col1Target') as HTMLInputElement).value) || 0,
    col2: parseFloat((document.getElementById('col2Target') as HTMLInputElement).value) || 0,
    col3: parseFloat((document.getElementById('col3Target') as HTMLInputElement).value) || 0,
    col4: parseFloat((document.getElementById('col4Target') as HTMLInputElement).value) || 0,
  };

  // Extra columns (default)
  appState.settings.extraColumns = [];
  document.querySelectorAll('.extra-column-item').forEach((item) => {
    const name = (item.querySelector('.extra-col-name') as HTMLInputElement)?.value?.trim() || '';
    const target = parseFloat((item.querySelector('.extra-col-target') as HTMLInputElement)?.value) || 0;
    appState.settings.extraColumns!.push({ name: name || 'Extra', target });
  });

  // Gather custom ranges
  appState.settings.customRanges = [];
  document.querySelectorAll('.custom-range-item').forEach((item) => {
    const startDay = parseInt((item.querySelector('.range-start') as HTMLInputElement).value);
    const endDay = parseInt((item.querySelector('.range-end') as HTMLInputElement).value);
    const col1 = (item.querySelector('.range-col1') as HTMLInputElement).value.trim();
    const col2 = (item.querySelector('.range-col2') as HTMLInputElement).value.trim();
    const col3 = (item.querySelector('.range-col3') as HTMLInputElement).value.trim();
    const col4 = (item.querySelector('.range-col4') as HTMLInputElement).value.trim();
    const col1Target = parseFloat((item.querySelector('.range-col1Target') as HTMLInputElement).value) || 0;
    const col2Target = parseFloat((item.querySelector('.range-col2Target') as HTMLInputElement).value) || 0;
    const col3Target = parseFloat((item.querySelector('.range-col3Target') as HTMLInputElement).value) || 0;
    const col4Target = parseFloat((item.querySelector('.range-col4Target') as HTMLInputElement).value) || 0;
    const extraCols: { name: string; target: number }[] = [];
    item.querySelectorAll('.range-extra-column-item').forEach((ex) => {
      const name = (ex.querySelector('.range-extra-col-name') as HTMLInputElement)?.value?.trim() || '';
      const target = parseFloat((ex.querySelector('.range-extra-col-target') as HTMLInputElement)?.value) || 0;
      extraCols.push({ name: name || 'Extra', target });
    });

    if (startDay && endDay && startDay <= endDay) {
      appState.settings.customRanges.push({
        startDay, endDay,
        col1: col1 || DEFAULT_COLUMNS.col1, col2: col2 || DEFAULT_COLUMNS.col2,
        col3: col3 || DEFAULT_COLUMNS.col3, col4: col4 || DEFAULT_COLUMNS.col4,
        col1Target, col2Target, col3Target, col4Target,
        extraColumns: extraCols,
      });
    }
  });

  // Ensure tracker data shape matches extra columns count
  const extrasCount = appState.settings.extraColumns?.length || 0;
  appState.trackerData.forEach((d) => {
    if (!Array.isArray(d.extraHours)) d.extraHours = [];
    if (d.extraHours.length < extrasCount) {
      d.extraHours = [...d.extraHours, ...Array.from({ length: extrasCount - d.extraHours.length }, () => 0)];
    } else if (d.extraHours.length > extrasCount) {
      d.extraHours = d.extraHours.slice(0, extrasCount);
    }
  });

  saveSettingsToStorage(appState.settings);
  saveTrackerDataToStorage(appState.trackerData);
  generateTable();
  showToast('Column names updated successfully!', 'success');
}

import type { CustomRange } from '@/types/tracker.types';

// ─── Custom Ranges ───────────────────────────────────────────

function renderCustomRanges(): void {
  const list = document.getElementById('customRangesList');
  if (!list) return;
  list.innerHTML = '';
  appState.settings.customRanges.forEach((range, index) => addCustomRangeToDOM(range, index));
}

export function addCustomRange(): void {
  addCustomRangeToDOM({}, document.querySelectorAll('.custom-range-item').length);
}

// ─── Extra Columns (Default) ──────────────────────────────────

function renderExtraColumns(): void {
  const list = document.getElementById('extraColumnsList');
  if (!list) return;
  list.innerHTML = '';
  (appState.settings.extraColumns || []).forEach((c, i) => addExtraColumnToDOM(c.name, c.target, i));
}

export function addExtraColumn(): void {
  addExtraColumnToDOM('', 0, document.querySelectorAll('.extra-column-item').length);
}

function addExtraColumnToDOM(name: string, target: number, index: number): void {
  const list = document.getElementById('extraColumnsList');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'settings-card';
  div.style.marginBottom = '12px';
  div.innerHTML = `
    <div class="settings-card-header">
      <h4>Extra Column ${index + 1}</h4>
      <button class="btn-remove-item" title="Remove Column">×</button>
    </div>
    <div class="settings-group-row">
      <div class="settings-group">
        <label>Name:</label>
        <input type="text" class="settings-input extra-col-name" value="${name || ''}" placeholder="e.g., React">
      </div>
      <div class="settings-group">
        <label>Target:</label>
        <input type="number" class="settings-input extra-col-target" value="${target || 0}" min="0">
      </div>
    </div>
  `;
  div.querySelector('.btn-remove-item')?.addEventListener('click', () => {
    div.remove();
    document.querySelectorAll('#extraColumnsList .settings-card h4').forEach((h4, i) => { h4.textContent = `Extra Column ${i + 1}`; });
  });
  list.appendChild(div);
}

function addCustomRangeToDOM(range: Partial<CustomRange>, index: number): void {
  const list = document.getElementById('customRangesList');
  if (!list) return;

  const div = document.createElement('div');
  div.className = 'custom-range-item';
  div.innerHTML = `
    <div class="settings-card-header">
      <h4>Custom Range ${index + 1}</h4>
      <button class="btn-remove-item" title="Remove Range">×</button>
    </div>
    
    <div class="range-grid">
      <div class="settings-group">
        <label>From Day:</label>
        <input type="number" class="settings-input range-start" min="1" value="${range.startDay || ''}" placeholder="e.g., 100">
      </div>
      <div class="settings-group">
        <label>To Day:</label>
        <input type="number" class="settings-input range-end" min="1" value="${range.endDay || ''}" placeholder="e.g., 150">
      </div>
    </div>

    <div class="range-columns-grid">
      <div class="settings-group-row"><div class="settings-group"><label>Column 1 Name:</label><input type="text" class="settings-input range-col1" value="${range.col1 || ''}"></div><div class="settings-group"><label>Target:</label><input type="number" class="settings-input range-col1Target" value="${range.col1Target || 0}" min="0"></div></div>
      <div class="settings-group-row"><div class="settings-group"><label>Column 2 Name:</label><input type="text" class="settings-input range-col2" value="${range.col2 || ''}"></div><div class="settings-group"><label>Target:</label><input type="number" class="settings-input range-col2Target" value="${range.col2Target || 0}" min="0"></div></div>
      <div class="settings-group-row"><div class="settings-group"><label>Column 3 Name:</label><input type="text" class="settings-input range-col3" value="${range.col3 || ''}"></div><div class="settings-group"><label>Target:</label><input type="number" class="settings-input range-col3Target" value="${range.col3Target || 0}" min="0"></div></div>
      <div class="settings-group-row"><div class="settings-group"><label>Column 4 Name:</label><input type="text" class="settings-input range-col4" value="${range.col4 || ''}"></div><div class="settings-group"><label>Target:</label><input type="number" class="settings-input range-col4Target" value="${range.col4Target || 0}" min="0"></div></div>
    </div>

    <div class="row-between" style="margin-top:20px; padding-top:12px; border-top: 1px solid rgba(102,124,181,0.14);">
      <h4 style="margin:0; font-size:0.8rem; color:#7f90b8; text-transform:uppercase;">Extra Columns</h4>
      <button class="btn add-range-extra-col" type="button" style="padding:4px 12px; font-size:0.75rem;">+ Add</button>
    </div>
    <div class="range-extra-columns" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
  `;

  // Render existing extra columns for this range
  const exWrap = div.querySelector('.range-extra-columns') as HTMLElement | null;
  const existing = Array.isArray(range.extraColumns) ? range.extraColumns : [];
  if (exWrap) {
    existing.forEach((c, i) => {
      exWrap.appendChild(buildRangeExtraColumnRow(c.name, c.target, i));
    });
  }

  div.querySelector('.add-range-extra-col')?.addEventListener('click', () => {
    const wrap = div.querySelector('.range-extra-columns');
    if (!wrap) return;
    wrap.appendChild(buildRangeExtraColumnRow('', 0, wrap.querySelectorAll('.range-extra-column-item').length));
  });

  div.querySelector('.btn-remove-item')?.addEventListener('click', () => {
    div.remove();
    document.querySelectorAll('.custom-range-item h4').forEach((h4, i) => { h4.textContent = `Custom Range ${i + 1}`; });
  });

  list.appendChild(div);
}

function buildRangeExtraColumnRow(name: string, target: number, index: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'range-extra-column-item settings-row';
  row.innerHTML = `
    <div class="settings-group">
      <label>Col ${index + 5} Name:</label>
      <input type="text" class="settings-input range-extra-col-name" value="${name || ''}">
    </div>
    <div class="settings-group" style="width: 120px;">
      <label>Target:</label>
      <input type="number" class="settings-input range-extra-col-target" value="${target || 0}" min="0">
    </div>
    <button class="btn-remove-item remove-range-extra-col" type="button">×</button>
  `;
  row.querySelector('.remove-range-extra-col')?.addEventListener('click', () => row.remove());
  return row;
}
