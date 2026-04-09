/**
 * Handles the Focus Timer logic.
 * 
 * It deals with starting, pausing, and stopping the timer, 
 * plus the special 'Midnight Split' logic to save time correctly 
 * if you study past 12:00 AM.
 */

import { appState, getColumnsForDay } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import { syncProfileBroadcast } from '@/features/dashboard/leaderboard';
import { saveTimerStateCloud, updateSyncStatus } from '@/services/supabase.service';
import { saveTrackerDataToStorage, saveSettingsToStorage, saveTimerStateToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard, toggleFocusHUD } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';
import { formatMsToTime, formatClockTime } from '@/utils/date.utils';
import { showToast } from '@/utils/dom.utils';

/**
 * Initializes listeners for the Sync Status HUD
 */
export function initTimerModules(): void {
  // Connectivity Listeners
  window.addEventListener('online',  () => updateSyncIndicator(true));
  window.addEventListener('offline', () => updateSyncIndicator(false));
  
  // Initial Check
  updateSyncIndicator(window.navigator.onLine);
}

/** Updates the HUD cloud icon color based on network status */
export function updateSyncIndicator(isOnline: boolean): void {
  const el = document.getElementById('timerSyncStatus');
  if (!el) return;

  if (isOnline) {
    el.classList.add('sync-live');
    el.classList.remove('sync-offline');
    el.title = "Cloud Sync Active";
  } else {
    el.classList.add('sync-offline');
    el.classList.remove('sync-live');
    el.title = "Offline: Saving Locally";
  }
}

// --- Timer State ---

let isStopping = false; // Stops the 'stop' function from running twice at once

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
  saveTimerStateCloud(appState.activeTimer);
}

// --- Timer Controls ---

export function startTimer(categoryIdx: number, categoryName: string): void {
  if (appState.activeTimer.isRunning) return;

  appState.activeTimer.isRunning = true;
  appState.activeTimer.startTime = Date.now();

  // Tell the leaderboard that we are studying right now
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
  
  // 📡 WORLD STAGE: Broadcast status instantly
  import('@/features/dashboard/leaderboard').then(m => m.syncProfileBroadcast());
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

  // 📡 WORLD STAGE: Broadcast status instantly (Away/Paused)
  import('@/features/dashboard/leaderboard').then(m => m.syncProfileBroadcast());
}

export async function stopTimer(): Promise<void> {
  if (isStopping) return;
  if (!appState.activeTimer.isRunning && appState.activeTimer.elapsedAcc === 0) return;

  isStopping = true;
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  let totalElapsed = appState.activeTimer.elapsedAcc;
  if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
    totalElapsed += Date.now() - appState.activeTimer.startTime;
  }
  const totalHours = Math.floor(totalElapsed / 1000) / 3600;

  // Show the popup to add a note for the session
  const note = await showSessionNoteModal();

  try {
    if (totalElapsed > 0 && appState.activeTimer.category !== null) {
      const colIdx = parseInt(appState.activeTimer.category);
      const sessionStart = appState.activeTimer.sessionStartClock ? new Date(appState.activeTimer.sessionStartClock) : new Date();
      const sessionEnd = new Date();
      
      // Check if the study session started yesterday and ended today
      const startDayStr = sessionStart.toISOString().split('T')[0];
      const endDayStr = sessionEnd.toISOString().split('T')[0];

      if (startDayStr !== endDayStr) {
        // MIDNIGHT SPLIT: If you study past 12:00 AM, we split the time between two days.
        const midnight = new Date(sessionEnd);
        midnight.setHours(0, 0, 0, 0);

        const msBefore = midnight.getTime() - sessionStart.getTime();
        const msAfter = sessionEnd.getTime() - midnight.getTime();

        const hoursBefore = Math.max(0, msBefore / (1000 * 60 * 60));
        const hoursAfter = Math.max(0, msAfter / (1000 * 60 * 60));

        // Save part 1 (Start Day)
        saveSessionToDate(colIdx, hoursBefore, note, sessionStart);
        // Save part 2 (End Day)
        saveSessionToDate(colIdx, hoursAfter, note, sessionEnd);

        showToast(`Midnight Split: ${hoursBefore.toFixed(2)}h (Yesterday) + ${hoursAfter.toFixed(2)}h (Today)`, 'success');
      } else {
        // NORMAL SAVE
        saveSessionToDate(colIdx, totalHours, note, sessionEnd);
        showToast(`Session saved: ${formatMsToTime(totalElapsed)}`, 'success');
      }
    }
  } catch (error) {
    console.error('Error saving session:', error);
    showToast('Session data could not be saved', 'error');
  } finally {
    isStopping = false;
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
    const modal = document.getElementById('sessionNoteModal');
    const input = document.getElementById('sessionNoteInput') as HTMLTextAreaElement;
    const saveBtn = document.getElementById('saveSessionNoteBtn');
    const skipBtn = document.getElementById('skipSessionNoteBtn');

    if (!modal || !input || !saveBtn) {
      resolve('');
      return;
    }

    input.value = '';
    modal.classList.add('active');

    const handleSave = () => {
      const note = input.value.trim();
      closeModal(note);
    };

    const handleSkip = () => {
      closeModal('');
    };

    const handleBackdrop = (e: MouseEvent) => {
      if (e.target === modal) closeModal('');
    };

    const closeModal = (val: string) => {
      modal.classList.remove('active');
      saveBtn.removeEventListener('click', handleSave);
      if (skipBtn) skipBtn.removeEventListener('click', handleSkip);
      modal.removeEventListener('click', handleBackdrop);
      resolve(val);
    };

    saveBtn.addEventListener('click', handleSave);
    if (skipBtn) skipBtn.addEventListener('click', handleSkip);
    modal.addEventListener('click', handleBackdrop);
  });
}

// --- Saving to Tracker ---

function saveSessionToDate(colIdx: number, hoursToAdd: number, note: string = '', targetDate: Date): void {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  let targetIndex = -1;
  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === target.getTime()) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex === -1) {
    console.warn(`[Timer] Could not find date ${targetDate.toDateString()} in tracker data.`);
    return;
  }

  const day = appState.trackerData[targetIndex];
  const fixed = (n: number) => parseFloat(n.toFixed(4)); // Standardized 4-decimal precision for Perfect Sync

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
  syncProfileBroadcast();

  // Highlight row (using End Date context for UI visual)
  const row = document.querySelector(`tr[data-day="${targetIndex}"]`) as HTMLElement;
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('highlight-update');
    setTimeout(() => row.classList.remove('highlight-update'), 2000);
  }
}


// --- Updating the UI ---

function startTimerInterval(): void {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(() => {
    updateTimerDisplay();
    if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
      const totalElapsedMs = appState.activeTimer.elapsedAcc + (Date.now() - appState.activeTimer.startTime);
      const elapsedSeconds = Math.floor(totalElapsedMs / 1000);
      updateSessionProgress(elapsedSeconds);

      // 💓 HEARBEAT SYNC: Every 30 seconds, push the live state to Supabase for "Perfect Sync"
      if (elapsedSeconds > 0 && elapsedSeconds % 30 === 0) {
        console.log('[Timer] Heartbeat: Pulsing live state to Cloud.');
        saveTimerState();
      }
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

// --- The Progress HUD ---

function updateSessionProgress(elapsedSeconds: number): void {
  const circle = document.querySelector('.progress-ring__circle') as SVGCircleElement | null;
  if (!circle) return;

  const radius = 130;
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

// --- Focus Mode Logic ---

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

// --- Modal Logic ---

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
  const { isRunning, startTime, elapsedAcc } = appState.activeTimer;

  // 1. Handle Remote Stop: If timer was running locally but is now stopped on another device
  if (!isRunning) {
    if (appState.timerInterval) {
      clearInterval(appState.timerInterval);
      appState.timerInterval = null;
    }
    updateTimerUI(false);
    
    // If we have some elapsed time showing, we keep it visible in the UI pause state
    // but if elapsedAcc is 0, it means it was fully stopped/saved.
    if (elapsedAcc === 0) {
       return; 
    }
  }

  // 2. Check for abandoned sessions (over 18 hours) and reset them
  if (isRunning && startTime) {
    const elapsedNow = Date.now() - startTime;
    const TOTAL_IMPOSSIBLE_MS = 18 * 60 * 60 * 1000; // 18 Hours

    if (elapsedNow > TOTAL_IMPOSSIBLE_MS) {
      console.warn('[Timer] Self-healing: Detected abandoned session (>18h). Resetting.');
      appState.activeTimer.isRunning = false;
      appState.activeTimer.startTime = null;
      appState.activeTimer.elapsedAcc = 0;
      saveTimerState();
      showToast('Long inactivity detected. Timer has been reset.', 'info');
      updateTimerUI(false);
      return;
    }
  }

  if (isRunning || elapsedAcc > 0) {
    if (isRunning) {
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
  const pauseBtn = document.getElementById('timerPauseBtn');
  const stopBtn = document.getElementById('timerStopBtn');

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
  if (hudSection) {
    let isDragging = false;
    let lastX = 0, lastY = 0;

    // Prevent drag when interacting with buttons
    [pauseBtn, stopBtn].forEach(btn => {
      btn?.addEventListener('mousedown', (e) => e.stopPropagation());
      btn?.addEventListener('touchstart', (e) => e.stopPropagation());
    });

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

    hudSection.addEventListener('mousedown', (e: MouseEvent) => startDrag(e.clientX, e.clientY));
    hudSection.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });
  }
}
