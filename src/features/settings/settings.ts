/**
 * Settings feature
 *
 * Settings modal, date configuration, column names, and custom ranges.
 */

import { appState, calculateDates, initializeData } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { saveSettingsToStorage, saveTrackerDataToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';
import type { StudyCategory, CustomRange } from '@/types/tracker.types';

export function openSettingsModal(): void {
  const s = appState.settings;
  const modal = document.getElementById('settingsModal');

  (document.getElementById('startDateInput') as HTMLInputElement).value = s.startDate;
  (document.getElementById('endDateInput') as HTMLInputElement).value = s.endDate;
  
  const themeInput = document.getElementById('themeSelectInput') as HTMLSelectElement;
  if (themeInput) { themeInput.value = s.theme || 'midnight'; }

  renderCustomRanges();
  modal?.classList.add('active');
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
  appState.settings.customRanges = [];

  document.querySelectorAll('.custom-range-item').forEach((item) => {
    const startDay = parseInt((item.querySelector('.range-start') as HTMLInputElement).value);
    const endDay = parseInt((item.querySelector('.range-end') as HTMLInputElement).value);
    
    // Custom range category definitions
    const rangeCols: StudyCategory[] = [];
    item.querySelectorAll('.range-category-item').forEach((row) => {
      const name = (row.querySelector('.range-cat-name') as HTMLInputElement).value.trim();
      const target = parseFloat((row.querySelector('.range-cat-target') as HTMLInputElement).value) || 0;
      if (name) rangeCols.push({ name, target });
    });

    if (startDay && endDay && startDay <= endDay) {
      appState.settings.customRanges.push({
        startDay,
        endDay,
        columns: rangeCols
      });
    }
  });

  if (appState.settings.customRanges.length === 0) {
    showToast('Please add at least one Study Phase (Custom Range) with categorized columns.', 'warning');
  } else {
    // For internal backward compatibility, update the global "columns" to match the first range
    appState.settings.columns = [...appState.settings.customRanges[0].columns];
  }

  saveSettingsToStorage(appState.settings);
  saveTrackerDataToStorage(appState.trackerData);
  generateTable();
  updateDashboard();
  showToast('Range settings applied successfully!', 'success');
}

// ─── Apply Theme Settings ────────────────────────────────────

export function applyThemeSettings(): void {
  const themeInput = document.getElementById('themeSelectInput') as HTMLSelectElement;
  if (themeInput) {
    appState.settings.theme = themeInput.value as 'midnight' | 'arctic' | 'cyberpunk';
    import('@/state/app-state').then(m => m.applyThemeToDOM(appState.settings.theme));
    saveSettingsToStorage(appState.settings);
    showToast('Theme applied successfully.', 'success');
  }
}



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

function addCustomRangeToDOM(range: Partial<CustomRange>, index: number): void {
  const list = document.getElementById('customRangesList');
  if (!list) return;

  const div = document.createElement('div');
  div.className = 'custom-range-item settings-card';
  div.style.marginBottom = '20px';
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
    <div class="range-overrides-heading" style="margin-top:10px; font-size:0.8rem; color:var(--text-secondary);">Category Overrides (Optional)</div>
    <div class="range-categories-wrap" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
    <button class="btn add-range-cat" type="button" style="margin-top:10px; font-size:0.7rem; padding:4px 8px;">+ Add Override</button>
  `;

  const wrap = div.querySelector('.range-categories-wrap') as HTMLElement;
  const columns = range.columns || [];
  columns.forEach((c) => wrap.appendChild(buildRangeCategoryRow(c.name, c.target)));

  div.querySelector('.add-range-cat')?.addEventListener('click', () => {
    wrap.appendChild(buildRangeCategoryRow('', 0));
  });

  div.querySelector('.btn-remove-item')?.addEventListener('click', () => {
    div.remove();
    document.querySelectorAll('#customRangesList h4').forEach((h4, i) => {
      h4.textContent = `Custom Range ${i + 1}`;
    });
  });

  list.appendChild(div);
}

function buildRangeCategoryRow(name: string, target: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'range-category-item settings-row';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.alignItems = 'center';
  row.innerHTML = `
    <input type="text" class="settings-input range-cat-name" value="${name || ''}" placeholder="Category" style="flex:1;">
    <input type="number" class="settings-input range-cat-target" value="${target || 0}" placeholder="Target" style="width:70px;">
    <button class="btn-remove-item remove-range-cat" type="button">×</button>
  `;
  row.querySelector('.remove-range-cat')?.addEventListener('click', () => row.remove());
  return row;
}
