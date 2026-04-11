/**
 * Handles the Focus Timer logic.
 * 
 * It deals with starting, pausing, and stopping the timer, 
 * plus the special 'Midnight Split' logic to save time correctly 
 * if you study past 12:00 AM.
 */

import { appState, getColumnsForDay } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import { syncProfileBroadcast } from '@/features/profile/profile.manager';
import { saveTimerStateCloud, updateSyncStatus, SyncIndicator } from '@/services/supabase.service';
import { saveTrackerDataToStorage, saveSettingsToStorage, saveTimerStateToStorage, clearTimerStateDB } from '@/services/data-bridge';
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
  window.addEventListener('online',  () => SyncIndicator.update('synced'));
  window.addEventListener('offline', () => SyncIndicator.update('offline'));
  
  // Initial Check
  SyncIndicator.update(window.navigator.onLine ? 'synced' : 'offline');

  // Split-Brain Timer Sync (Listen for cross-device pauses)
  import('@/services/supabase.service').then(({ subscribeToRealtimeTelemetry }) => {
    subscribeToRealtimeTelemetry(async (payload) => {
      const { getCurrentUserId } = await import('@/services/auth.service');
      const me = getCurrentUserId();
      // If the telemetry event is for this user
      if (payload.new && payload.new.id === me) {
         const newIsFocusing = payload.new.is_focusing;
         if (appState.activeTimer.isRunning && !newIsFocusing) {
            console.log('🚨 SILENT OVERRIDE: External pause detected. Freezing local timer...');
            const { loadTimerStateFromStorage } = await import('@/services/data-bridge');
            const cloudState = await loadTimerStateFromStorage();
            if (cloudState) Object.assign(appState.activeTimer, cloudState);
            updateTimerDisplay();
         }
      }
    });
  });
}

// HUD Sync logic centralized in supabase.service.ts

// --- Timer State ---

let isStopping = false; // Stops the 'stop' function from running twice at once
let wakeLock: any = null; // WakeLockSentinel (any for browser compatibility checks)

/** DB-First save — writes exclusively to Supabase via the Data Bridge. */
function saveTimerState(): void {
  saveTimerStateToStorage(appState.activeTimer); // pure DB call (Data Bridge handles the Cloud sync)
}

/** 🛡️ ANTI-SLEEP: Request the browser to keep the screen active */
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('💡 Wake Lock Active: Screen will stay awake.');
      wakeLock.addEventListener('release', () => {
        console.log('🌙 Wake Lock Released.');
      });
    } catch (err: any) {
      console.error(`${err.name}, ${err.message}`);
    }
  }
}

/** 🌙 SLEEP ALLOWED: Release the screen lock */
function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// Re-acquire wake lock if tab becomes visible again (OS often kills it in background)
document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

/** 📺 OS PIP: Update the Lock Screen / Media Hub metadata */
function updateMediaSession(isRunning: boolean) {
  if (!('mediaSession' in navigator)) return;

  if (isRunning && appState.activeTimer.colName) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Focus: ${appState.activeTimer.colName}`,
      artist: 'All Tracker',
      album: 'Internal Strategy',
      artwork: [
        { src: 'logo.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    // Set action handlers for lock screen buttons
    navigator.mediaSession.setActionHandler('play', () => startTimerInterval());
    navigator.mediaSession.setActionHandler('pause', () => pauseTimer());
    navigator.mediaSession.setActionHandler('stop', () => {
      stopTimer().catch(err => console.error('MediaSession Stop Error:', err));
    });
  } else {
    navigator.mediaSession.metadata = null;
  }
}

// --- Timer Controls ---

export function startTimer(categoryIdx: number, categoryName: string): void {
  if (appState.activeTimer.isRunning) return;

  appState.activeTimer.isRunning = true;
  appState.activeTimer.startTime = Date.now();

  // ⚡ OPTIMISTIC UI: Instant visual feedback
  updateTimerUI(true);
  startTimerInterval();
  document.getElementById('timerModal')?.classList.remove('active');

  appState.activeTimer.category = String(categoryIdx);
  appState.activeTimer.colName = categoryName;

  if (appState.activeTimer.elapsedAcc === 0) {
    appState.activeTimer.sessionStartClock = appState.activeTimer.startTime;
  }

  saveTimerState();
  showToast(`Timer started for ${categoryName}`, 'success');
  
  // ⚡ ELITE UX: Trigger War Mode / Sonic Effects
  document.body.classList.add('is-focusing');

  // 🛡️ ANTI-SLEEP & PIP
  requestWakeLock();
  updateMediaSession(true);

  // 📡 WORLD STAGE: Broadcast status instantly
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
}

export function pauseTimer(): void {
  if (!appState.activeTimer.isRunning) return;

  // ⚡ OPTIMISTIC UI: Instant freeze
  appState.activeTimer.isRunning = false;
  updateTimerUI(true);
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  const currentSession = Date.now() - (appState.activeTimer.startTime || 0);
  appState.activeTimer.elapsedAcc += currentSession;
  appState.activeTimer.startTime = null;

  saveTimerState();

  // ⚡ ELITE UX: Cease Fire / Landing
  document.body.classList.remove('is-focusing');

  // 🌙 RELEASE LOCKS
  releaseWakeLock();
  updateMediaSession(false);

  // 📡 WORLD STAGE: Broadcast status instantly (Away/Paused)
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
}

export async function stopTimer(autoNote?: string): Promise<void> {
  if (isStopping) return;
  if (!appState.activeTimer.isRunning && appState.activeTimer.elapsedAcc === 0) return;

  isStopping = true;
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  let totalElapsed = appState.activeTimer.elapsedAcc;
  if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
    totalElapsed += Date.now() - appState.activeTimer.startTime;
  }
  const totalHours = Math.floor(totalElapsed / 1000) / 3600;

  // Show the popup to add a note for the session UNLESS it's an auto-stop
  const note = autoNote || await showSessionNoteModal();

  try {
    if (totalElapsed > 0 && appState.activeTimer.category !== null) {
      const colIdx = parseInt(appState.activeTimer.category);
      const sessionStart = appState.activeTimer.sessionStartClock ? new Date(appState.activeTimer.sessionStartClock) : new Date();
      const sessionEnd = new Date();
      
      const startDayStr = sessionStart.toISOString().split('T')[0];
      const endDayStr = sessionEnd.toISOString().split('T')[0];

      if (startDayStr !== endDayStr) {
        const midnight = new Date(sessionEnd);
        midnight.setHours(0, 0, 0, 0);

        const msBefore = midnight.getTime() - sessionStart.getTime();
        const msAfter = sessionEnd.getTime() - midnight.getTime();

        const hoursBefore = Math.max(0, msBefore / (1000 * 60 * 60));
        const hoursAfter = Math.max(0, msAfter / (1000 * 60 * 60));

        saveSessionToDate(colIdx, hoursBefore, note, sessionStart);
        saveSessionToDate(colIdx, hoursAfter, note, sessionEnd);

        showToast(`Midnight Split: ${hoursBefore.toFixed(2)}h (Yesterday) + ${hoursAfter.toFixed(2)}h (Today)`, 'success');
      } else {
        saveSessionToDate(colIdx, totalHours, note, sessionEnd);
        showToast(autoNote ? `Auto-Safe Triggered: ${formatMsToTime(totalElapsed)}` : `Session saved: ${formatMsToTime(totalElapsed)}`, 'success');
      }
    }
  } catch (error) {
    console.error('Error saving session:', error);
    showToast('Session data could not be saved', 'error');
  } finally {
    isStopping = false;
  }

  // Clear focus mode
  document.body.classList.remove('focus-mode', 'focus-minimized', 'is-focusing');

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

/** Kills the session instantly — no note, no data saved.
 * Uses clearTimerStateDB() to guarantee the DB record is zeroed
 * before the user can refresh, eliminating the resurrection bug. */
export async function terminateTimer(): Promise<void> {
  if (!appState.activeTimer.isRunning && appState.activeTimer.elapsedAcc === 0) return;

  const confirmed = confirm('TERMINATE SESSION?\n\nThis will discard all time. Nothing will be saved.');
  if (!confirmed) return;

  // Stop the local tick immediately
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  // Zero out in-memory state
  appState.activeTimer.isRunning = false;
  appState.activeTimer.elapsedAcc = 0;
  appState.activeTimer.startTime = null;
  appState.activeTimer.category = null;
  appState.activeTimer.colName = '';
  appState.activeTimer.sessionStartClock = null;

  // ✅ ATOMIC DB CLEAR: await guarantees cloud is zeroed before any refresh can happen
  await clearTimerStateDB();

  // Dismiss HUD
  document.body.classList.remove('focus-mode', 'focus-minimized');
  const section = document.getElementById('activeTimerSection');
  if (section) section.style.display = 'none';
  document.getElementById('timerModal')?.classList.remove('active');

  updateTimerUI(false);
  showToast('Session terminated. No data recorded.', 'error');

  // Broadcast Idle telemetry so leaderboard/HUD reflects Idle state
  syncProfileBroadcast();
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

      // 📺 UPDATING OS PIP POSITION
      if ('mediaSession' in navigator && (navigator as any).mediaSession.setPositionState) {
        try {
          (navigator as any).mediaSession.setPositionState({
            duration: 3600 * 24, // Infinite-ish progress for stopwatch mode
            playbackRate: 1,
            position: elapsedSeconds
          });
        } catch (e) {}
      }

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

  if (!isRunning) {
    if (appState.timerInterval) {
      clearInterval(appState.timerInterval);
      appState.timerInterval = null;
    }
    updateTimerUI(false);
    if (elapsedAcc === 0) return; 
  }

  // 🛡️ SELF-HEAL: Abandoned sessions (over 5 hours) - Aligned to Overrun Guard
  if (isRunning && startTime) {
    const elapsedNow = Date.now() - startTime;
    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000; 

    if (elapsedNow > FIVE_HOURS_MS) {
      console.warn('[Timer] Self-healing: Detected abandoned session (>5h). Auto-Save Triggered.');
      stopTimer('[AUTO-SAFE] Post-Crash/Inactivity Recovered');
      return;
    }
  }

  if (isRunning || elapsedAcc > 0) {
    // 🔧 SELF-HEAL: If colName is missing but category index exists, reconstruct it
    if (isRunning && !appState.activeTimer.colName && appState.activeTimer.category !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let todayDay = 1;
      for (let i = 0; i < appState.trackerData.length; i++) {
        const d = new Date(appState.trackerData[i].date);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) { todayDay = appState.trackerData[i].day; break; }
      }
      const cols = getColumnsForDay(todayDay);
      const colIdx = parseInt(appState.activeTimer.category);
      if (!isNaN(colIdx) && cols[colIdx]) {
        appState.activeTimer.colName = cols[colIdx].name;
        console.log(`[Timer] Self-healed colName: "${appState.activeTimer.colName}"`);
      }
    }

    if (isRunning) {
      startTimerInterval();
      // Re-broadcast with the correct (possibly self-healed) colName
      import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
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

  // Wire up Terminate Button
  const terminateBtn = document.getElementById('timerTerminateBtn');
  if (terminateBtn) terminateBtn.addEventListener('click', () => terminateTimer());

  // Draggable Logic
  let currX = 0, currY = 0;
  if (hudSection) {
    let isDragging = false;
    let lastX = 0, lastY = 0;

    // Prevent drag when interacting with buttons
    [pauseBtn, stopBtn, terminateBtn].forEach(btn => {
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
