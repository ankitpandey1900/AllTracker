/**
 * Handles the App Settings page.
 * 
 * It deals with setting the start/end dates, managing 
 * study categories, and changing themes.
 */

import { appState, syncTrackerTimelineWithSettings } from '@/state/app-state';
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

  const themeInput = document.getElementById('themeSelectInput') as HTMLSelectElement;
  const timerStyleInput = document.getElementById('timerStyleSelectInput') as HTMLSelectElement;
  const timerFontInput = document.getElementById('timerFontSelectInput') as HTMLSelectElement;
  const uiFontInput = document.getElementById('uiFontSelectInput') as HTMLSelectElement;
  const accentColorInput = document.getElementById('accentColorInput') as HTMLInputElement;

  if (themeInput) themeInput.value = s.theme || 'stealth-midnight';
  if (timerStyleInput) timerStyleInput.value = s.timerStyle || 'block';
  if (timerFontInput) timerFontInput.value = s.timerFont || 'fira';
  if (uiFontInput) uiFontInput.value = s.uiFont || 'default';
  if (accentColorInput) accentColorInput.value = s.accentColor || '#3b82f6';

  renderCustomRanges();
  modal?.classList.add('active');

  initCustomDropdown('uiFontCustomWrapper', 'uiFontSelectInput');
  initCustomDropdown('timerFontCustomWrapper', 'timerFontSelectInput');
}

// Ensure clicking outside closes custom dropdowns
document.addEventListener('click', () => {
  document.querySelectorAll('.font-select-wrapper').forEach(w => w.classList.remove('open'));
});

function initCustomDropdown(wrapperId: string, selectId: string) {
  const wrapper = document.getElementById(wrapperId);
  const select = document.getElementById(selectId) as HTMLSelectElement;
  if (!wrapper || !select) return;

  const trigger = wrapper.querySelector('.font-select-trigger') as HTMLElement;
  const optionsContainer = wrapper.querySelector('.font-select-options') as HTMLElement;
  const selectedText = trigger.querySelector('span') as HTMLElement;
  const options = optionsContainer.querySelectorAll('.font-option');

  const activeOption = Array.from(options).find(opt => opt.getAttribute('data-value') === select.value) as HTMLElement;
  if (activeOption) {
    selectedText.textContent = activeOption.textContent;
  }

  trigger.onclick = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.font-select-wrapper').forEach(w => {
      if (w !== wrapper) w.classList.remove('open');
    });
    wrapper.classList.toggle('open');
  };

  options.forEach(opt => {
    (opt as HTMLElement).onclick = (e) => {
      e.stopPropagation();
      const val = opt.getAttribute('data-value');
      if (val) {
        select.value = val;
        selectedText.textContent = opt.textContent;
      }
      wrapper.classList.remove('open');
    };
  });
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
    const id = (item as HTMLElement).dataset.phaseId || crypto.randomUUID();
    
    // Custom range category definitions
    const rangeCols: StudyCategory[] = [];
    item.querySelectorAll('.range-category-item').forEach((row) => {
      const name = (row.querySelector('.range-cat-name') as HTMLInputElement).value.trim();
      const target = parseFloat((row.querySelector('.range-cat-target') as HTMLInputElement).value) || 0;
      if (name) rangeCols.push({ name, target });
    });

    if (!startDate || !endDate) {
      import('@/utils/dom.utils').then(m => m.showToast(`Warning: Phase "${name || 'Unnamed'}" is missing dates. It was saved with default dates.`, 'warning'));
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      appState.settings.customRanges.push({
        id,
        startDate: startDate || today.toISOString().split('T')[0],
        endDate: endDate || endOfYear.toISOString().split('T')[0],
        name,
        columns: rangeCols
      });
    } else if (new Date(startDate) > new Date(endDate)) {
      import('@/utils/dom.utils').then(m => m.showToast(`Warning: Phase "${name || 'Unnamed'}" has start date after end date. It was not saved.`, 'error'));
    } else {
      appState.settings.customRanges.push({
        id,
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

  // ⚡ TACTICAL UI BREATHER: Split heavy work across multiple frames so the browser stays responsive
  const btn = document.getElementById('applyColumnSettings') as HTMLButtonElement;
  const originalText = btn?.textContent || 'Apply All Changes';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Synchronizing...';
  }

  // Step 1: Save settings + sync timeline (frame 1)
  setTimeout(() => {
    try {
      saveSettingsToStorage(appState.settings);
      syncTrackerTimelineWithSettings();
      saveTrackerDataToStorage(appState.trackerData);
    } catch (err) {
      console.error("Sync Failure (Step 1):", err);
    }

    // Step 2: Regenerate table (frame 2)
    setTimeout(() => {
      try {
        generateTable();
      } catch (err) {
        console.error("Sync Failure (Step 2):", err);
      }

      // Step 3: Update dashboard + charts (frame 3)
      setTimeout(() => {
        try {
          updateDashboard();
          renderHeatmap();
          renderPerformanceCurve();

          showToast('Settings & Timeline synchronized successfully!', 'success');
          document.getElementById('settingsModal')?.classList.remove('active');
        } catch (err) {
          console.error("Sync Failure (Step 3):", err);
          showToast('Sync failed. Check console for details.', 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
          }
        }
      }, 80);
    }, 80);
  }, 60);
}

// --- Theme Settings ---

export function applyThemeSettings(): void {
  const themeInput = document.getElementById('themeSelectInput') as HTMLSelectElement;
  if (themeInput) {
    appState.settings.theme = themeInput.value as 'stealth-midnight' | 'obsidian-glass' | 'tactical-navy' | 'solar-gold' | 'pristine-white' | 'quantum-purple';
    import('@/state/app-state').then(m => m.applyThemeToDOM(appState.settings.theme));
  }

  const timerStyleInput = document.getElementById('timerStyleSelectInput') as HTMLSelectElement;
  if (timerStyleInput) {
    appState.settings.timerStyle = timerStyleInput.value as 'ring' | 'block';
    document.body.classList.remove('timer-style-ring', 'timer-style-block');
    document.body.classList.add(`timer-style-${appState.settings.timerStyle}`);
  }

  const timerFontInput = document.getElementById('timerFontSelectInput') as HTMLSelectElement;
  if (timerFontInput) {
    appState.settings.timerFont = timerFontInput.value as 'fira' | 'digital' | 'tektur' | 'inter' | 'monoton' | 'blackops' | 'silkscreen' | 'bungee';
    import('@/state/app-state').then(m => m.applyTimerFontToDOM(appState.settings.timerFont));
  }

  const uiFontInput = document.getElementById('uiFontSelectInput') as HTMLSelectElement;
  if (uiFontInput) {
    appState.settings.uiFont = uiFontInput.value;
    import('@/state/app-state').then(m => m.applyUiFontToDOM(appState.settings.uiFont));
  }

  const accentColorInput = document.getElementById('accentColorInput') as HTMLInputElement;
  if (accentColorInput) {
    appState.settings.accentColor = accentColorInput.value;
    import('@/state/app-state').then(m => m.applyAccentColorToDOM(appState.settings.accentColor!));
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
  const today = getLocalIsoDate();
  const endOfYear = `${new Date().getFullYear()}-12-31`;
  addCustomRangeToDOM({ startDate: today, endDate: endOfYear }, document.querySelectorAll('.custom-range-item').length);
}

function addCustomRangeToDOM(range: Partial<CustomRange>, index: number): void {
  const list = document.getElementById('customRangesList');
  if (!list) return;

  const todayStr = getLocalIsoDate();
  const isCompleted = range.endDate && range.endDate < todayStr;

  const div = document.createElement('div');
  div.className = 'custom-range-item settings-card';
  div.dataset.phaseId = range.id || crypto.randomUUID();
  div.style.marginBottom = '20px';
  div.innerHTML = `
    <div class="settings-card-header phase-header-toggle" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; user-select: none;">
      <div style="display: flex; align-items: center; flex: 1; min-width: 0; gap: 8px;">
        <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; flex-shrink: 0;">Phase ${index + 1}</h4>
        ${isCompleted ? '<span style="color: #ef4444; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); padding: 3px 8px; border-radius: 12px; white-space: nowrap; flex-shrink: 0;">FINISHED</span>' : ''}
        <input type="text" class="settings-input range-name" value="${range.name || ''}" placeholder="Name..." style="font-size: 0.8rem; flex: 1; min-width: 60px; max-width: 180px; background: rgba(0,0,0,0.15); border-color: transparent;" onclick="event.stopPropagation()">
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <span class="toggle-icon" style="font-size: 0.8rem; color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0;">
          ${isCompleted ? '&#9660;' : '&#9650;'}
        </span>
        <button class="btn-remove-item" title="Remove Range" onclick="event.stopPropagation()" style="position: relative; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s; flex-shrink: 0;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
    <div class="phase-body" style="display: ${isCompleted ? 'none' : 'block'}; margin-top: 20px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 20px;">
      <div class="range-grid" style="display: flex; gap: 20px; margin-bottom: 24px;">
        <div class="settings-group" style="flex: 1;">
          <label style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block;">Start Date</label>
          <input type="date" class="settings-input range-start" value="${range.startDate || ''}">
        </div>
        <div class="settings-group" style="flex: 1;">
          <label style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block;">End Date</label>
          <input type="date" class="settings-input range-end" value="${range.endDate || ''}">
        </div>
      </div>
      <div class="range-overrides-heading" style="margin-bottom:12px; font-size:0.75rem; font-weight: 700; color:var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between;">
        <span>Specific Category Goals</span>
        <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: normal; letter-spacing: 0;">Target Hrs</span>
      </div>
      <div class="range-categories-wrap" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button class="btn add-range-cat" type="button" style="margin-top:16px; font-size:0.75rem; padding:6px 12px; background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px dashed rgba(255,255,255,0.15); width: 100%; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">+ Add Category Goal</button>
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
  row.style.gap = '12px';
  row.style.alignItems = 'center';
  row.style.background = 'rgba(0,0,0,0.15)';
  row.style.padding = '6px 6px 6px 12px';
  row.style.borderRadius = '8px';
  row.style.border = '1px solid rgba(255,255,255,0.03)';
  row.innerHTML = `
    <input type="text" class="range-cat-name" value="${name || ''}" placeholder="Enter category..." style="flex:1; border:none; background:transparent; color:var(--text-primary); outline:none; font-size:0.85rem;">
    <input type="number" step="0.1" class="range-cat-target" value="${target || ''}" placeholder="0.0" style="width:60px; border:none; background:rgba(0,0,0,0.2); padding:6px; border-radius:6px; color:var(--accent, #3b82f6); text-align:center; font-weight:700; outline:none; font-size:0.85rem;">
    <button class="btn-remove-item remove-range-cat" type="button" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#ef4444'" onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;
  row.querySelector('.remove-range-cat')?.addEventListener('click', () => row.remove());
  return row;
}
