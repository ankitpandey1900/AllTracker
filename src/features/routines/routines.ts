/**
 * Routines feature
 *
 * Daily routine CRUD, rendering, toggle completion, and daily auto-reset.
 */

import { appState } from '@/state/app-state';
import { formatTime12h } from '@/utils/date.utils';
import { showToast } from '@/utils/dom.utils';
import { saveRoutinesToStorage, saveRoutineHistoryToStorage, loadRoutineResetFromStorage, saveRoutineResetToStorage } from '@/services/data-bridge';
import { renderPerformanceCurve } from './performance-chart';
import { renderRadarStats } from './radar-stats';
import { getHabitPulse } from '@/features/intelligence/intelligence.service';
import { updateDashboard } from '../dashboard/dashboard';

// ─── Render ──────────────────────────────────────────────────

export function renderRoutine(): void {
  const list = document.getElementById('routineList');
  if (!list) return;

  const todayDay = new Date().getDay();
  const filtered = appState.routines.filter(item => {
    if (!item.days || item.days.length === 0) return true; // Default to all days
    return item.days.includes(todayDay);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">No routines scheduled for today. Take a breather!</div>';
    return;
  }

  const sorted = [...filtered].sort((a, b) => a.time.localeCompare(b.time));

  list.innerHTML = sorted.map((item) => `
    <div class="routine-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
      <div class="routine-checkbox-wrapper">
        <input type="checkbox" 
               class="routine-native-check" 
               id="check-${item.id}" 
               ${item.completed ? 'checked' : ''} 
               data-action="toggle" 
               data-id="${item.id}">
        <label for="check-${item.id}" class="routine-custom-check"></label>
      </div>
      
      <div class="routine-info">
        <div class="routine-meta">
          <span class="routine-time">${formatTime12h(item.time)}</span>
        </div>
        <div class="routine-main">
          <div class="routine-title-row">
            <div class="routine-title" style="font-family: 'Tektur', sans-serif;">${item.title}</div>
            ${item.streak && item.streak > 0 ? `
              <div class="routine-streak-badge" title="${item.streak} day streak">
                <span class="streak-fire">🔥</span>
                <span class="streak-count">${item.streak}</span>
              </div>
            ` : ''}
          </div>
          ${item.note ? `<div class="routine-note">${item.note}</div>` : ''}
        </div>
      </div>

      <div class="routine-actions">
        <button class="btn-action-icon" data-action="edit" data-id="${item.id}" title="Edit Item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="btn-action-icon" data-action="delete" data-id="${item.id}" title="Delete Item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  `).join('');

  // Attach event listeners via delegation (targeting both checkbox and buttons)
  list.querySelectorAll('[data-action]').forEach((el) => {
    if (el.tagName === 'INPUT') {
      el.addEventListener('change', handleRoutineAction);
    } else {
      el.addEventListener('click', handleRoutineAction);
    }
  });

  // Update Habit Pulse
  renderHabitPulse();
}

function renderHabitPulse(): void {
  const container = document.getElementById('habitPulseContainer');
  const content = document.getElementById('habitPulseContent');
  if (!container || !content) return;

  const pulse = getHabitPulse();
  content.textContent = pulse;
  container.style.display = 'block';
}

// ─── Actions ─────────────────────────────────────────────────

function handleRoutineAction(e: Event): void {
  const target = e.currentTarget as HTMLElement;
  const action = target.getAttribute('data-action');
  const id = parseInt(target.getAttribute('data-id') || '0');

  switch (action) {
    case 'toggle': toggleRoutine(id); break;
    case 'edit': editRoutine(id); break;
    case 'delete': deleteRoutine(id); break;
  }
}

function toggleRoutine(id: number): void {
  const item = appState.routines.find((r) => r.id === id);
  if (!item) return;

  // Toggle completion status
  item.completed = !item.completed;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (!appState.routineHistory[todayStr]) appState.routineHistory[todayStr] = 0;

  if (item.completed) {
    // Increment completed count for today
    appState.routineHistory[todayStr]++;
    
    // Streak logic
    if (item.lastCompletedIso === yesterdayStr) {
      item.streak = (item.streak || 0) + 1;
    } else if (item.lastCompletedIso !== todayStr) {
      item.streak = 1;
    }
    item.lastCompletedIso = todayStr;
  } else {
    // Decrement completed count for today
    appState.routineHistory[todayStr] = Math.max(0, appState.routineHistory[todayStr] - 1);
    // We don't strictly reset streak on uncheck within the same day, 
    // to allow accidental toggle correction.
  }

  // Save changes
  saveRoutinesToStorage(appState.routines);
  saveRoutineHistoryToStorage(appState.routineHistory);

  renderRoutine();
  updateDashboard(); // Refresh "Up Next"
  renderPerformanceCurve();
  renderRadarStats();
  showToast(item.completed ? 'Routine item completed!' : 'Item marked incomplete');
}

function editRoutine(id: number): void {
  const item = appState.routines.find((r) => r.id === id);
  if (!item) return;

  const modal = document.getElementById('routineModal');
  const modalTitle = modal?.querySelector('.modal-header h2');
  const titleInput = document.getElementById('routineTitleInput') as HTMLInputElement;
  const timeInput = document.getElementById('routineTimeInput') as HTMLInputElement;
  const noteInput = document.getElementById('routineNoteInput') as HTMLTextAreaElement;
  const saveBtn = document.getElementById('saveRoutineBtn');

  if (modal) modal.dataset.editId = String(id);
  if (modalTitle) modalTitle.textContent = 'Edit Routine Item';
  if (saveBtn) saveBtn.textContent = 'Update Routine';

  if (titleInput) titleInput.value = item.title;
  if (timeInput) timeInput.value = item.time;
  if (noteInput) noteInput.value = item.note || '';

  // Set day checkboxes
  const dayChecks = modal?.querySelectorAll('.day-chip input') as NodeListOf<HTMLInputElement>;
  dayChecks.forEach(input => {
    const day = parseInt(input.getAttribute('data-day') || '-1');
    input.checked = item.days?.includes(day) || false;
  });

  modal?.classList.add('active');
}

function deleteRoutine(id: number): void {
  if (confirm('Delete this routine item?')) {
    appState.routines = appState.routines.filter((r) => r.id !== id);
    saveRoutinesToStorage(appState.routines);
    renderRoutine();
    renderPerformanceCurve();
    renderRadarStats();
    showToast('Routine item removed');
  }
}

// ─── Routine Modal Setup ─────────────────────────────────────

export function setupRoutineListeners(): void {
  const addBtn = document.getElementById('addRoutineBtn');
  const modal = document.getElementById('routineModal');
  const closeBtn = document.getElementById('closeRoutineModal');
  const saveBtn = document.getElementById('saveRoutineBtn');

  if (addBtn && modal) {
    addBtn.addEventListener('click', () => {
      const title = modal.querySelector('.modal-header h2');
      delete modal.dataset.editId;
      if (title) title.textContent = 'Add New Routine Item';
      if (saveBtn) saveBtn.textContent = 'Add to Routine';

      (document.getElementById('routineTitleInput') as HTMLInputElement).value = '';
      (document.getElementById('routineTimeInput') as HTMLInputElement).value = '';
      (document.getElementById('routineNoteInput') as HTMLTextAreaElement).value = '';

      // Clear day checkboxes
      modal.querySelectorAll('.day-chip input').forEach(input => {
        (input as HTMLInputElement).checked = false;
      });

      modal.classList.add('active');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      delete modal.dataset.editId;
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = (document.getElementById('routineTitleInput') as HTMLInputElement).value.trim();
      const time = (document.getElementById('routineTimeInput') as HTMLInputElement).value;
      const note = (document.getElementById('routineNoteInput') as HTMLTextAreaElement).value.trim();
      
      // Collect selected days
      const selectedDays: number[] = [];
      modal?.querySelectorAll('.day-chip input:checked').forEach(input => {
        const day = (input as HTMLInputElement).getAttribute('data-day');
        if (day !== null) selectedDays.push(parseInt(day));
      });

      if (!title || !time) {
        showToast('Please enter both title and time!', 'warning');
        return;
      }

      const editId = modal?.dataset.editId;
      if (editId) {
        const item = appState.routines.find((r) => r.id === parseInt(editId));
        if (item) {
          item.title = title;
          item.time = time;
          item.note = note;
          item.days = selectedDays;
        }
      } else {
        appState.routines.push({ 
          id: Date.now(), 
          title, 
          time, 
          note, 
          completed: false,
          days: selectedDays 
        });
      }

      saveRoutinesToStorage(appState.routines);
      renderRoutine();
      modal?.classList.remove('active');
      delete modal?.dataset.editId;
      showToast(editId ? 'Routine updated!' : 'Routine added!', 'success');
    });
  }
}

// ─── Daily Reset ─────────────────────────────────────────────

export async function checkDailyRoutineReset(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const lastReset = await loadRoutineResetFromStorage();

  if (lastReset !== today) {
    console.log('New day detected! Resetting daily routine...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDay = yesterday.getDay();

    appState.routines.forEach((item) => { 
      // Reset streak if missed on a scheduled day
      const scheduledYesterday = !item.days || item.days.length === 0 || item.days.includes(yesterdayDay);
      if (scheduledYesterday && !item.completed) {
        item.streak = 0;
      }
      item.completed = false; 
    });

    saveRoutinesToStorage(appState.routines);
    await saveRoutineResetToStorage(today);
    updateDashboard(); // Ensure "Up Next" resets for the new day
  }
}
