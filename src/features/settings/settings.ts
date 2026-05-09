/**
 * Handles the App Settings page.
 * 
 * It deals with setting the start/end dates, managing 
 * study categories, and changing themes.
 */

import { appState, calculateDates, initializeData, syncTrackerTimelineWithSettings } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { getLocalIsoDate } from '@/utils/date.utils';
import { saveSettingsToStorage, saveTrackerDataToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';
import type { StudyCategory, CustomRange } from '@/types/tracker.types';

export function openSettingsModal(): void {
  const s = appState.settings;
  const modal = document.getElementById('settingsModal');

  // Global date range is now derived from phases

  
  const themeInput = document.getElementById('themeSelectInput') as HTMLSelectElement;
  if (themeInput) { themeInput.value = s.theme || 'default'; }

  const timerStyleInput = document.getElementById('timerStyleSelectInput') as HTMLSelectElement;
  if (timerStyleInput) { timerStyleInput.value = s.timerStyle || 'ring'; }

  renderCustomRanges();
  modal?.classList.add('active');
}

// --- Date Settings ---

// Note: applyDateSettings removed as dates are now driven by Study Phases (Custom Ranges)


// --- Category Settings ---

export function applyColumnSettings(): void {
  appState.settings.customRanges = [];

  document.querySelectorAll('.custom-range-item').forEach((item) => {
    const startDate = (item.querySelector('.range-start') as HTMLInputElement).value;
    const endDate = (item.querySelector('.range-end') as HTMLInputElement).value;
    const name = (item.querySelector('.range-name') as HTMLInputElement)?.value || '';
    
    // Custom range category definitions
    const rangeCols: StudyCategory[] = [];
    item.querySelectorAll('.range-category-item').forEach((row) => {
      const name = (row.querySelector('.range-cat-name') as HTMLInputElement).value.trim();
      const target = parseFloat((row.querySelector('.range-cat-target') as HTMLInputElement).value) || 0;
      if (name) rangeCols.push({ name, target });
    });

    if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
      appState.settings.customRanges.push({
        startDate,
        endDate,
        name,
        columns: rangeCols
      });
    }
  });

  // If no ranges, we ensure at least one default exists or we use global
  if (appState.settings.customRanges.length > 0) {
    appState.settings.columns = [...appState.settings.customRanges[0].columns];
  }

  // ⚡ TACTICAL UI BREATHER: Give the UI a moment to show a loading state before heavy sync
  const btn = document.getElementById('applyColumnSettings') as HTMLButtonElement;
  const originalText = btn?.textContent || 'Apply All Changes';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Synchronizing...';
  }

  setTimeout(() => {
    try {
      saveSettingsToStorage(appState.settings);
      syncTrackerTimelineWithSettings();
      saveTrackerDataToStorage(appState.trackerData);
      
      generateTable();
      updateDashboard();
      renderHeatmap();
      renderPerformanceCurve();
      
      showToast('Settings & Timeline synchronized successfully!', 'success');
      document.getElementById('settingsModal')?.classList.remove('active');
    } catch (err) {
      console.error("Sync Failure:", err);
      showToast('Sync failed. Check console for details.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  }, 100);
}

// --- Theme Settings ---

export function applyThemeSettings(): void {
  const themeInput = document.getElementById('themeSelectInput') as HTMLSelectElement;
  if (themeInput) {
    appState.settings.theme = themeInput.value as 'kaala' | 'default' | 'chanakya-strategy' | 'ayodhya' | 'kamala-grace' | 'vajra-shakti';
    import('@/state/app-state').then(m => m.applyThemeToDOM(appState.settings.theme));
  }

  const timerStyleInput = document.getElementById('timerStyleSelectInput') as HTMLSelectElement;
  if (timerStyleInput) {
    appState.settings.timerStyle = timerStyleInput.value as 'ring' | 'block';
    document.body.classList.remove('timer-style-ring', 'timer-style-block');
    document.body.classList.add(`timer-style-${appState.settings.timerStyle}`);
  }

  saveSettingsToStorage(appState.settings);
  showToast('Appearance applied successfully.', 'success');
}



// --- Study Phases (Custom Ranges) ---

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

  const todayStr = getLocalIsoDate();
  const isCompleted = range.endDate && range.endDate < todayStr;

  const div = document.createElement('div');
  div.className = 'custom-range-item settings-card';
  div.style.marginBottom = '20px';
  div.innerHTML = `
    <div class="settings-card-header phase-header-toggle" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none;">
      <div style="display: flex; align-items: center;">
        <h4 style="margin: 0;">Study Phase ${index + 1}</h4>
        ${isCompleted ? '<span style="color: #ef4444; font-size: 0.6rem; margin-left: 8px; font-weight: bold; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px;">FINISHED</span>' : ''}
        <input type="text" class="settings-input range-name" value="${range.name || ''}" placeholder="Phase Name" style="font-size: 0.7rem; width: 150px; margin-left: 15px;" onclick="event.stopPropagation()">
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="toggle-icon" style="font-size: 0.8rem; color: #8e9fc6; transition: transform 0.2s;">
          ${isCompleted ? '▼' : '▲'}
        </span>
        <button class="btn-remove-item" title="Remove Range" onclick="event.stopPropagation()" style="position: static;">×</button>
      </div>
    </div>
    <div class="phase-body" style="display: ${isCompleted ? 'none' : 'block'}; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
      <div class="range-grid">
        <div class="settings-group">
          <label>Start Date:</label>
          <input type="date" class="settings-input range-start" value="${range.startDate || ''}">
        </div>
        <div class="settings-group">
          <label>End Date:</label>
          <input type="date" class="settings-input range-end" value="${range.endDate || ''}">
        </div>
      </div>
      <div class="range-overrides-heading" style="margin-top:10px; font-size:0.8rem; color:var(--text-secondary);">Category Overrides (Optional)</div>
      <div class="range-categories-wrap" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
      <button class="btn add-range-cat" type="button" style="margin-top:10px; font-size:0.7rem; padding:4px 8px;">+ Add Override</button>
    </div>
  `;

  // Toggle Logic
  div.querySelector('.phase-header-toggle')?.addEventListener('click', () => {
    const body = div.querySelector('.phase-body') as HTMLElement;
    const icon = div.querySelector('.toggle-icon') as HTMLElement;
    if (body.style.display === 'none') {
      body.style.display = 'block';
      icon.textContent = '▲';
    } else {
      body.style.display = 'none';
      icon.textContent = '▼';
    }
  });

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
    <input type="number" step="0.1" class="settings-input range-cat-target" value="${target || ''}" placeholder="target hrs" style="width:80px;">
    <button class="btn-remove-item remove-range-cat" type="button">×</button>
  `;
  row.querySelector('.remove-range-cat')?.addEventListener('click', () => row.remove());
  return row;
}
