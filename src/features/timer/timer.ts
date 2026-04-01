/**
 * Timer feature
 *
 * Manages the study timer state machine: start → pause → resume → stop.
 * Saves completed sessions to today's tracker data.
 */

import { appState, getColumnsForDay } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import { syncProfileBroadcast } from '@/features/dashboard/leaderboard';
import { formatMsToTime, formatClockTime } from '@/utils/date.utils';
import { showToast } from '@/utils/dom.utils';
import { saveTrackerDataToStorage, saveSettingsToStorage, saveTimerStateToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard, toggleFocusHUD } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';

// ─── Timer State ─────────────────────────────────────────────

export function loadTimerState(): void {
  const saved = localStorage.getItem(STORAGE_KEYS.TIMER);
  if (saved) {
    try {
      Object.assign(appState.activeTimer, JSON.parse(saved));
    } catch { /* noop */ }
  }
}

function saveTimerState(): void {
  saveTimerStateToStorage(appState.activeTimer);
}

// ─── Timer Actions ───────────────────────────────────────────

export function startTimer(categoryIdx: number, categoryName: string): void {
  if (appState.activeTimer.isRunning) return;

  appState.activeTimer.isRunning = true;
  appState.activeTimer.startTime = Date.now();

  // Broadcast focus status to World Stage
  syncProfileBroadcast();

  if (appState.activeTimer.elapsedAcc === 0) {
    appState.activeTimer.sessionStartClock = appState.activeTimer.startTime;
  }

  appState.activeTimer.category = String(categoryIdx);
  appState.activeTimer.colName = categoryName;

  saveTimerState();
  startTimerInterval();
  updateTimerUI(true);

  document.getElementById('timerModal')?.classList.remove('active');
  showToast(`Timer started for ${categoryName}`, 'success');
}

export function pauseTimer(): void {
  if (!appState.activeTimer.isRunning) return;

  const currentSession = Date.now() - (appState.activeTimer.startTime || 0);
  appState.activeTimer.elapsedAcc += currentSession;
  appState.activeTimer.isRunning = false;
  appState.activeTimer.startTime = null;

  saveTimerState();
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  updateTimerUI(true);
}

export async function stopTimer(): Promise<void> {
  if (!appState.activeTimer.isRunning && appState.activeTimer.elapsedAcc === 0) return;

  if (appState.timerInterval) clearInterval(appState.timerInterval);

  let totalElapsed = appState.activeTimer.elapsedAcc;
  if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
    totalElapsed += Date.now() - appState.activeTimer.startTime;
  }
  const totalHours = Math.floor(totalElapsed / 1000) / 3600;

  // Modern modal for session note
  const note = await showSessionNoteModal();

  try {
    if (totalHours > 0 && appState.activeTimer.category !== null) {
      saveSessionToToday(parseInt(appState.activeTimer.category), totalHours, note);
      showToast(`Session saved: ${formatMsToTime(totalElapsed)}`, 'success');
    }
  } catch (error) {
    console.error('Error saving session:', error);
    showToast('Session data could not be saved', 'error');
  }

  // Clear focus mode
  document.body.classList.remove('focus-mode', 'focus-minimized');

  // Reset timer
  appState.activeTimer.isRunning = false;
  appState.activeTimer.elapsedAcc = 0;
  appState.activeTimer.startTime = null;
  appState.activeTimer.category = null;
  appState.activeTimer.colName = '';
  appState.activeTimer.sessionStartClock = null;

  // Broadcast status update
  syncProfileBroadcast();

  saveTimerState();

  const section = document.getElementById('activeTimerSection');
  if (section) section.style.display = 'none';
  document.getElementById('timerModal')?.classList.remove('active');

  updateTimerUI(false);
  updateDashboard();
  renderHeatmap();
  renderPerformanceCurve();
  generateTable();
}

async function showSessionNoteModal(): Promise<string> {
  return new Promise((resolve) => {
    const modal = document.getElementById('sessionNoteModal') as HTMLElement;
    const input = document.getElementById('sessionNoteInput') as HTMLTextAreaElement;
    const saveBtn = document.getElementById('saveSessionNoteBtn') as HTMLElement;
    const skipBtn = document.getElementById('skipSessionNoteBtn') as HTMLElement;

    if (!modal || !input || !saveBtn) {
      resolve('');
      return;
    }

    input.value = '';
    modal.classList.add('active');

    // Create unique handlers to avoid leaks
    function cleanup() {
      if (saveBtn) saveBtn.removeEventListener('click', handleSave);
      if (skipBtn) skipBtn.removeEventListener('click', handleSkip);
      if (modal) modal.removeEventListener('click', handleClose);
    }

    function handleSave() {
      const note = input.value.trim();
      modal.classList.remove('active');
      cleanup();
      resolve(note);
    }

    function handleSkip() {
      modal.classList.remove('active');
      cleanup();
      resolve('');
    }

    function handleClose(e: MouseEvent) {
      if ((e.target as HTMLElement).id === 'sessionNoteModal') {
        modal.classList.remove('active');
        cleanup();
        resolve('');
      }
    }

    saveBtn.addEventListener('click', handleSave);
    if (skipBtn) skipBtn.addEventListener('click', handleSkip);
    modal.addEventListener('click', handleClose);
  });
}

// ─── Session Save ────────────────────────────────────────────

function saveSessionToToday(colIdx: number, hoursToAdd: number, note: string = ''): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayIndex = -1;
  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      todayIndex = i;
      break;
    }
  }

  if (todayIndex === -1) {
    showToast('Could not find today in tracker data.', 'error');
    return;
  }

  const day = appState.trackerData[todayIndex];
  const fixed = (n: number) => parseFloat(n.toFixed(2));

  if (!Array.isArray(day.studyHours)) day.studyHours = [];
  day.studyHours[colIdx] = fixed((day.studyHours[colIdx] || 0) + hoursToAdd);

  // Log session
  const cols = getColumnsForDay(day.day);
  const categoryName = cols[colIdx]?.name || `Category ${colIdx + 1}`;

  // Propagate note to Tracker Table (Topics/Project)
  if (note) {
    const formattedNote = `${categoryName}: ${note}`;
    const isProject = categoryName.toLowerCase().includes('project');
    const targetField = isProject ? 'project' : 'topics';

    if (day[targetField]) {
      // Append if already contains text
      if (!day[targetField].includes(formattedNote)) {
        day[targetField] += ` | ${formattedNote}`;
      }
    } else {
      day[targetField] = formattedNote;
    }
  }

  const sessionLog = {
    date: new Date().toISOString(),
    category: `col${colIdx + 1}`,
    categoryName,
    duration: hoursToAdd,
    timeRange: appState.activeTimer.sessionStartClock
      ? `${formatClockTime(new Date(appState.activeTimer.sessionStartClock))} - ${formatClockTime(new Date())}`
      : formatClockTime(new Date()),
    note: note || undefined,
  };

  if (!appState.settings.sessionLogs) appState.settings.sessionLogs = [];
  appState.settings.sessionLogs.unshift(sessionLog);
  if (appState.settings.sessionLogs.length > 100) {
    appState.settings.sessionLogs = appState.settings.sessionLogs.slice(0, 100);
  }

  saveSettingsToStorage(appState.settings);
  saveTrackerDataToStorage(appState.trackerData);
  generateTable();
  updateDashboard();
  renderHeatmap();
  renderPerformanceCurve();

  // Highlight row
  const row = document.querySelector(`tr[data-day="${todayIndex}"]`) as HTMLElement;
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('highlight-update');
    setTimeout(() => row.classList.remove('highlight-update'), 2000);
  }
}


// ─── Timer Display ───────────────────────────────────────────

function startTimerInterval(): void {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(() => {
    updateTimerDisplay();
    if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
      const elapsed = appState.activeTimer.elapsedAcc + (Date.now() - appState.activeTimer.startTime);
      const elapsedSeconds = Math.floor(elapsed / 1000);
      updateSessionProgress(elapsedSeconds);
    }
  }, 1000);
}

function updateTimerDisplay(): void {
  let totalMs = appState.activeTimer.elapsedAcc;
  if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
    totalMs += Date.now() - appState.activeTimer.startTime;
  }
  const display = document.getElementById('timerDisplay');
  const timeStr = formatMsToTime(totalMs);
  if (display) display.textContent = timeStr;

  // Sync Focus HUD
  if (appState.activeTimer.isRunning) {
    toggleFocusHUD(true, appState.activeTimer.colName || 'STUDYING', timeStr);
  }

  if (!appState.activeTimer.isRunning) {
    updateSessionProgress(Math.floor(totalMs / 1000));
  }
}

function updateTimerUI(isVisible: boolean): void {
  const section = document.getElementById('activeTimerSection');
  const display = document.getElementById('timerDisplay');
  const pauseBtn = document.getElementById('timerPauseBtn');
  if (!section || !display || !pauseBtn) return;

  if (isVisible) {
    section.style.display = 'block';
    if (appState.activeTimer.isRunning) {
      section.classList.remove('paused');
      pauseBtn.textContent = ' Pause';
      display.classList.remove('blink');
      document.body.classList.add('focus-mode');
      updateFocusTask();
    } else {
      section.classList.add('paused');
      pauseBtn.textContent = ' Resume';
      display.classList.add('blink');
    }
  } else {
    section.style.display = 'none';
    document.body.classList.remove('focus-mode', 'focus-minimized');
  }
}

// ─── Session Progress Ring ───────────────────────────────────

function updateSessionProgress(elapsedSeconds: number): void {
  const circle = document.querySelector('.progress-ring__circle') as SVGCircleElement | null;
  if (!circle) return;

  const radius = 120;
  const circumference = radius * 2 * Math.PI;

  circle.style.strokeDasharray = `${circumference} ${circumference}`;

  const goalMinutes = parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_GOAL) || '60');
  const goalSeconds = goalMinutes * 60;
  const percent = Math.min((elapsedSeconds / goalSeconds) * 100, 100);

  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = `${offset}`;

  if (percent >= 100) {
    circle.style.stroke = 'var(--success)';
    circle.style.filter = 'drop-shadow(0 0 15px var(--success))';
  } else if (percent > 80) {
    circle.style.stroke = 'var(--accent-gold)';
    circle.style.filter = '';
  } else {
    circle.style.stroke = 'var(--accent-purple)';
    circle.style.filter = 'drop-shadow(0 0 10px var(--accent-purple))';
  }
}

// ─── Focus Mode ──────────────────────────────────────────────

function updateFocusTask(): void {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (!appState.routines || appState.routines.length === 0) return;

  const sorted = [...appState.routines].sort((a, b) => {
    const [aH, aM] = a.time.split(':').map(Number);
    const [bH, bM] = b.time.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  let activeTask = sorted[0];
  for (const routine of sorted) {
    const [rH, rM] = routine.time.split(':').map(Number);
    if (rH * 60 + rM <= currentTime) {
      activeTask = routine;
    } else {
      if (!activeTask) activeTask = { ...routine, isNext: true };
      break;
    }
  }

  const container = document.getElementById('focusActiveTaskContainer');
  const taskDisplay = document.getElementById('nowPlayingTask');
  if (activeTask && container && taskDisplay) {
    container.style.display = 'block';
    taskDisplay.textContent = activeTask.title + (activeTask.isNext ? ' (Coming Up)' : '');
  }
}

// ─── Timer Modal ─────────────────────────────────────────────

export function openTimerModal(): void {
  const modal = document.getElementById('timerModal');
  const select = document.getElementById('timerCategorySelect') as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayDay = 1;

  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      todayDay = appState.trackerData[i].day;
      break;
    }
  }

  const cols = getColumnsForDay(todayDay);
  cols.forEach((col, i) => {
    const el = document.createElement('option');
    el.value = String(i);
    el.textContent = col.name;
    select.appendChild(el);
  });

  modal?.classList.add('active');
}

/** Resumes a timer if it was running when the page loaded */
export function resumeTimerIfNeeded(): void {
  if (appState.activeTimer.isRunning || appState.activeTimer.elapsedAcc > 0) {
    if (appState.activeTimer.isRunning) {
      startTimerInterval();
    }
    updateTimerUI(true);
    updateTimerDisplay();
  }
}

/** Sets up focus mode toggle and draggable mini-player */
export function setupFocusListeners(): void {
  const toggle = document.getElementById('manualFocusToggle');
  const toggleText = document.getElementById('focusToggleText');
  const hudSection = document.getElementById('activeTimerSection');
  const dragHandle = document.querySelector('.hud-drag-handle') as HTMLElement;

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isMin = document.body.classList.toggle('focus-minimized');
      document.documentElement.classList.toggle('focus-minimized-scroll', isMin);
      const hud = document.getElementById('focusHud');

      if (isMin) {
        if (toggleText) toggleText.textContent = 'Restore HUD';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        if (hud) hud.classList.remove('active');
      } else {
        if (toggleText) toggleText.textContent = 'Minimize HUD';
        document.body.style.overflow = 'hidden';
        if (hud) hud.classList.add('active');
      }

      // Reset drag on restore perfectly
      if (!isMin && hudSection) {
        hudSection.style.setProperty('--drag-x', '0px');
        hudSection.style.setProperty('--drag-y', '0px');
        currX = 0; currY = 0;
      }
    });
  }

  // Draggable Logic
  let currX = 0, currY = 0;
  if (dragHandle && hudSection) {
    let isDragging = false;
    let lastX = 0, lastY = 0;

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !document.body.classList.contains('focus-minimized')) return;
      e.preventDefault();
      const cx = e.type.includes('mouse') ? (e as MouseEvent).clientX : (e as TouchEvent).touches[0].clientX;
      const cy = e.type.includes('mouse') ? (e as MouseEvent).clientY : (e as TouchEvent).touches[0].clientY;
      
      const dx = cx - lastX;
      const dy = cy - lastY;
      lastX = cx;
      lastY = cy;

      // The translate() function precedes scale() in CSS, natively moving in 1:1 screen pixels.
      currX += dx;
      currY += dy;
      
      hudSection.style.setProperty('--drag-x', `${currX}px`);
      hudSection.style.setProperty('--drag-y', `${currY}px`);
    };

    const stopDrag = () => { 
      if (!isDragging) return;
      isDragging = false; 
      hudSection.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s';
      
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
    };

    const startDrag = (cx: number, cy: number) => {
      if (!document.body.classList.contains('focus-minimized')) return;
      isDragging = true;
      hudSection.style.transition = 'none'; // Disable transition for 1:1 sync
      lastX = cx;
      lastY = cy;

      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchend', stopDrag);
    };

    dragHandle.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
    dragHandle.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
  }
}
