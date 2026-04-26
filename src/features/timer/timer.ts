/**
 * Handles the Focus Timer logic.
 * 
 * It deals with starting, pausing, and stopping the timer, 
 * plus the special 'Midnight Split' logic to save time correctly 
 * if you study past 12:00 AM.
 */

import { appState, getColumnsForDay } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import { SyncIndicator, logStudySessionCloud } from '@/services/vault.service';
import { saveTrackerDataToStorage, saveSettingsToStorage, saveTimerStateToStorage, clearTimerStateDB } from '@/services/data-bridge';
import { getCurrentUserId } from '@/services/auth.service';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard, toggleFocusHUD } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';
import { formatMsToTime, formatClockTime, formatDuration } from '@/utils/date.utils';
import { showToast, startConfetti } from '@/utils/dom.utils';
import { log } from '@/utils/logger.utils';
import { getNextRoutine } from '@/utils/calc.utils';
import { notificationService } from '@/services/notification.service';

/**
 * Initializes listeners for the Sync Status HUD
 */
export function initTimerModules(): void {
  // Connectivity Listeners
  window.addEventListener('online', () => SyncIndicator.update('synced'));
  window.addEventListener('offline', () => SyncIndicator.update('offline'));

  // Initial Check
  SyncIndicator.update(window.navigator.onLine ? 'synced' : 'offline');

  // 📡 Mission-Critical Timer Sync: Full Cross-Device Integration
  import('@/services/vault.service').then(({ subscribeToUserDataSync }) => {
    subscribeToUserDataSync((payload) => {
      // payload.new.data is [trackerData, settings, routines, history, bookmarks, tasks, timerState]
      if (!payload.new || !payload.new.data || !payload.new.data[6]) return;
      const cloudState = payload.new.data[6].data; // Vault Response wrapper
      if (!cloudState) return;

      const cloudIsRunning = cloudState.isRunning;
      const cloudOnBreak  = !!cloudState.activeBreak;
      const localIsRunning = appState.activeTimer.isRunning;
      const localOnBreak   = !!appState.activeTimer.activeBreak;
      const localHasSession = appState.activeTimer.elapsedAcc > 0 || appState.activeTimer.isRunning || localOnBreak;
      const cloudHasSession = cloudState.elapsedAcc > 0 || cloudIsRunning || cloudOnBreak;

      // Detect any meaningful state change
      const stateChanged =
        cloudIsRunning !== localIsRunning ||
        cloudOnBreak   !== localOnBreak   ||
        (!localHasSession && cloudHasSession) ||
        (localHasSession && !cloudHasSession);

      if (!stateChanged) return;

      log.info(`📡 CLOUD SYNC: Remote state → running=${cloudIsRunning}, break=${cloudOnBreak}`);

      // Stop any local interval first
      if (appState.timerInterval) clearInterval(appState.timerInterval);

      // Apply cloud state fully
      Object.assign(appState.activeTimer, cloudState);

      if (cloudIsRunning) {
        // Remote device is actively focusing
        updateTimerUI(true);
        startTimerInterval();
        document.body.classList.add('is-focusing');
        requestWakeLock();
      } else if (cloudOnBreak) {
        // Remote device is on break — show break HUD
        updateTimerUI(true);
        startBreakInterval();
        document.body.classList.remove('is-focusing');
      } else if (!cloudHasSession) {
        // Remote device stopped/terminated — clear everything
        document.body.classList.remove('focus-mode', 'focus-minimized', 'is-focusing');
        updateTimerUI(false);
        toggleFocusHUD(false);
        releaseWakeLock();
      }
      updateTimerDisplay();
    });
  });
}

// --- Timer State ---

let isStopping = false; 
let wakeLock: any = null; 

function saveTimerState(): void {
  saveTimerStateToStorage(appState.activeTimer);
}

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      log.info('💡 Wake Lock Active.');
    } catch (err: any) { log.error('Wake Lock Failed:', err); }
  }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

document.addEventListener('visibilitychange', async () => {
  if ((appState.activeTimer.isRunning || appState.activeTimer.activeBreak) && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

function updateMediaSession(isRunning: boolean) {
  if (!('mediaSession' in navigator)) return;
  if (isRunning && appState.activeTimer.colName) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Focus: ${appState.activeTimer.colName}`,
      artist: 'All Tracker',
      artwork: [{ src: 'logo.png', sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.setActionHandler('play', () => startTimerInterval());
    navigator.mediaSession.setActionHandler('pause', () => pauseTimer());
    navigator.mediaSession.setActionHandler('stop', () => stopTimer());
  } else { navigator.mediaSession.metadata = null; }
}

// --- Timer Controls ---

export function startTimer(categoryIdx: number, categoryName: string): void {
  if (appState.activeTimer.isRunning) return;
  appState.activeTimer.isRunning = true;
  appState.activeTimer.startTime = Date.now();
  updateTimerUI(true); startTimerInterval();
  notificationService.startAmbient();
  document.getElementById('timerModal')?.classList.remove('active');
  appState.activeTimer.category = String(categoryIdx);
  appState.activeTimer.colName = categoryName;
  notificationService.requestPermission();
  appState.activeTimer.hasNotifiedGoal = false;
  if (appState.activeTimer.elapsedAcc === 0) appState.activeTimer.sessionStartClock = appState.activeTimer.startTime;
  saveTimerState();
  showToast(`Timer started for ${categoryName}`, 'success');
  document.body.classList.add('is-focusing');
  requestWakeLock(); updateMediaSession(true);
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast(true));
}

export function startBreak(reason: string): void {
  if (!appState.activeTimer.isRunning) return;
  appState.activeTimer.isRunning = false;
  const currentSession = Date.now() - (appState.activeTimer.startTime || 0);
  appState.activeTimer.elapsedAcc += currentSession;
  appState.activeTimer.startTime = null;
  appState.activeTimer.activeBreak = { reason, startTime: Date.now(), durationAcc: 0 };
  updateTimerUI(true);
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  startBreakInterval();
  notificationService.stopAmbient();
  saveTimerState();
  document.body.classList.remove('is-focusing');
  updateMediaSession(false);
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast(true));
}

export function resumeFromBreak(): void {
  if (appState.activeTimer.isRunning) return;
  if (appState.activeTimer.activeBreak) {
    const elapsedBreak = Date.now() - appState.activeTimer.activeBreak.startTime + appState.activeTimer.activeBreak.durationAcc;
    if (!appState.activeTimer.completedBreaks) appState.activeTimer.completedBreaks = [];
    appState.activeTimer.completedBreaks.push({ reason: appState.activeTimer.activeBreak.reason, durationMs: elapsedBreak });
    appState.activeTimer.activeBreak = null;
  }
  appState.activeTimer.isRunning = true;
  appState.activeTimer.startTime = Date.now();
  updateTimerUI(true); startTimerInterval();
  notificationService.startAmbient(); saveTimerState();
  document.body.classList.add('is-focusing');
  requestWakeLock(); updateMediaSession(true);
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast(true));
}

export function pauseTimer(): void { startBreak('Paused'); }

function startBreakInterval(): void {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  let breakTick = 0;
  appState.timerInterval = setInterval(() => {
    breakTick++;
    updateTimerDisplay();
    const activeBreak = appState.activeTimer.activeBreak;
    if (activeBreak) {
      const elapsedMs = Date.now() - activeBreak.startTime + activeBreak.durationAcc;
      const elapsedMins = Math.floor(elapsedMs / 60000);
      const last = activeBreak.lastNotifiedMinutes || 0;
      const milestones = [15, 25, 40, 55];
      let currentMilestone = 0;
      for (const m of milestones) if (elapsedMins >= m) currentMilestone = m;
      if (elapsedMins > 55) currentMilestone = 55 + Math.floor((elapsedMins - 55) / 15) * 15;
      if (currentMilestone > last) {
        let msg = `Slacking Alert: ${currentMilestone}m ho gaye. Jaldi wapas aao! 🚨`;
        if (currentMilestone === 15) msg = "15 minutes ho gaye. Refocus? ☕";
        else if (currentMilestone === 25) msg = "25 minutes khatam! Grind pe lag ja! 🚀";
        else if (currentMilestone === 40) msg = "Bhai 40 minutes break?! Jaldi wapas aao! ⚠️";
        else if (currentMilestone === 55) msg = "AB BAS! boht slacking ho gayi. Immediately return! 🛑";
        notificationService.sendAlert(`${activeBreak.reason} Break: ${currentMilestone}m`, msg);
        activeBreak.lastNotifiedMinutes = currentMilestone;
        // Save immediately when a notification fires (milestone state change)
        saveTimerState();
      }
    }
    // 🛡️ Throttled cloud save: every 30s during break (same as study interval)
    // Prevents write-war between devices where both save every second
    if (breakTick % 30 === 0) {
      saveTimerState();
      if (!wakeLock) requestWakeLock();
    }
  }, 1000);
}

export async function stopTimer(autoNote?: string): Promise<void> {
  if (isStopping) return;
  // Allow stopping when on break (isRunning=false but elapsedAcc > 0 or activeBreak exists)
  const hasActiveSession = appState.activeTimer.isRunning ||
    appState.activeTimer.elapsedAcc > 0 ||
    !!appState.activeTimer.activeBreak;
  if (!hasActiveSession) return;
  isStopping = true;
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  // Calculate total elapsed BEFORE modifying state
  let totalElapsed = appState.activeTimer.elapsedAcc;
  if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
    totalElapsed += Date.now() - appState.activeTimer.startTime;
  }

  // 🛰️ INSTANT CLOUD BROADCAST: Tell all other devices to stop NOW
  appState.activeTimer.isRunning = false;
  appState.activeTimer.startTime = null;
  appState.activeTimer.elapsedAcc = totalElapsed; // Freeze accumulated value
  saveTimerState(); // Pushes isRunning: false to the cloud immediately
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast(true));

  const totalHours = totalElapsed / 3600000;
  let note = autoNote || await showSessionNoteModal();
  if (appState.activeTimer.activeBreak) {
    const elapsedBreak = Date.now() - appState.activeTimer.activeBreak.startTime + appState.activeTimer.activeBreak.durationAcc;
    if (!appState.activeTimer.completedBreaks) appState.activeTimer.completedBreaks = [];
    appState.activeTimer.completedBreaks.push({ reason: appState.activeTimer.activeBreak.reason, durationMs: elapsedBreak });
    appState.activeTimer.activeBreak = null;
  }
  if (appState.activeTimer.completedBreaks && appState.activeTimer.completedBreaks.length > 0) {
    const breakMap = new Map<string, { d: number; c: number }>();
    appState.activeTimer.completedBreaks.forEach(b => {
      const e = breakMap.get(b.reason) || { d: 0, c: 0 };
      e.d += b.durationMs; e.c += 1; breakMap.set(b.reason, e);
    });
    const breakStr = Array.from(breakMap.entries()).map(([r, s]) => `${r} (${Math.max(1, Math.floor(s.d/60000))}m${s.c>1? ' / '+s.c+'x' : ''})`).join(', ');
    note = note ? `${note} | [Breaks: ${breakStr}]` : `[Breaks: ${breakStr}]`;
  }
  try {
    if (totalElapsed > 0 && appState.activeTimer.category !== null) {
      const colIdx = parseInt(appState.activeTimer.category);
      const sessionStart = appState.activeTimer.sessionStartClock ? new Date(appState.activeTimer.sessionStartClock) : new Date();
      const sessionEnd = new Date();
      if (sessionStart.getDate() !== sessionEnd.getDate()) {
        const midnight = new Date(sessionEnd); midnight.setHours(0,0,0,0);
        const hoursBefore = (midnight.getTime() - sessionStart.getTime()) / 3600000;
        const hoursAfter = (sessionEnd.getTime() - midnight.getTime()) / 3600000;
        saveSessionToDate(colIdx, hoursBefore, note, sessionStart);
        saveSessionToDate(colIdx, hoursAfter, note, sessionEnd);
        saveTrackerDataToStorage(appState.trackerData);
        await logStudySessionCloud(hoursBefore, appState.activeTimer.colName || 'GENERAL', sessionStart, note);
        await logStudySessionCloud(hoursAfter, appState.activeTimer.colName || 'GENERAL', midnight, note);
        appState.verifiedHours += (hoursBefore + hoursAfter);
      } else {
        saveSessionToDate(colIdx, totalHours, note, sessionEnd);
        saveTrackerDataToStorage(appState.trackerData);
        await logStudySessionCloud(totalHours, appState.activeTimer.colName || 'GENERAL', sessionStart, note);
        appState.verifiedHours += totalHours;
      }
      showToast(autoNote ? "Auto-Safe: Session Saved" : `Saved: ${formatMsToTime(totalElapsed)}`, 'success');
    }
  } catch (error) { log.error('Save Error:', error); } finally { isStopping = false; }
  document.body.classList.remove('focus-mode', 'focus-minimized', 'is-focusing');
  appState.activeTimer.elapsedAcc = 0; appState.activeTimer.startTime = null; appState.activeTimer.category = null;
  appState.activeTimer.colName = ''; appState.activeTimer.sessionStartClock = null;
  appState.activeTimer.activeBreak = null; appState.activeTimer.completedBreaks = [];
  appState.activeTimer.overrunCapMs = undefined; appState.activeTimer.hasWarnedOverrun1 = false; appState.activeTimer.hasWarnedOverrun2 = false;
  notificationService.stopAmbient();
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast(true));
  saveTimerState(); updateDashboard(); generateTable(); renderHeatmap(); renderPerformanceCurve();
  const section = document.getElementById('activeTimerSection');
  if (section) section.style.display = 'none';
  document.getElementById('timerModal')?.classList.remove('active');
  updateTimerUI(false); toggleFocusHUD(false); releaseWakeLock();
}

export async function terminateTimer(): Promise<void> {
  // Allow termination when on break (isRunning=false but elapsedAcc > 0 or activeBreak exists)
  const hasActiveSession = appState.activeTimer.isRunning ||
    appState.activeTimer.elapsedAcc > 0 ||
    !!appState.activeTimer.activeBreak;
  if (!hasActiveSession) return;
  const confirmed = await showTerminateConfirmModal();
  if (!confirmed) return;
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.activeTimer.isRunning = false; appState.activeTimer.elapsedAcc = 0;
  appState.activeTimer.startTime = null; appState.activeTimer.category = null;
  appState.activeTimer.colName = ''; appState.activeTimer.activeBreak = null;
  saveTimerState(); // Notify other devices to clear HUD
  notificationService.stopAmbient(); await clearTimerStateDB();
  document.body.classList.remove('focus-mode', 'focus-minimized', 'is-focusing');
  const section = document.getElementById('activeTimerSection');
  if (section) section.style.display = 'none';
  updateTimerUI(false); toggleFocusHUD(false); releaseWakeLock();
  showToast('Session terminated.', 'error');
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast(true));
}

async function showTerminateConfirmModal(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal active'; overlay.style.zIndex = '999999';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <h3 style="color: #ef4444; margin-bottom: 12px;">TERMINATE SESSION?</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">This will discard all study time.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="cancelTermBtn" class="btn btn-outline" style="flex:1">Cancel</button>
          <button id="confirmTermBtn" class="btn glow-danger" style="flex:1">Terminate</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancelTermBtn')?.addEventListener('click', () => { document.body.removeChild(overlay); resolve(false); });
    overlay.querySelector('#confirmTermBtn')?.addEventListener('click', () => { document.body.removeChild(overlay); resolve(true); });
  });
}

async function showSessionNoteModal(): Promise<string> {
  return new Promise((resolve) => {
    const modal = document.getElementById('sessionNoteModal');
    const input = document.getElementById('sessionNoteInput') as HTMLTextAreaElement;
    const saveBtn = document.getElementById('saveSessionNoteBtn');
    const skipBtn = document.getElementById('skipSessionNoteBtn');
    if (!modal || !input || !saveBtn) { resolve(''); return; }
    input.value = ''; modal.classList.add('active');
    const closeModal = (val: string) => { modal.classList.remove('active'); resolve(val); };
    saveBtn.addEventListener('click', () => closeModal(input.value.trim()), { once: true });
    if (skipBtn) skipBtn.addEventListener('click', () => closeModal(''), { once: true });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(''); });
  });
}

function saveSessionToDate(colIdx: number, hoursToAdd: number, note: string = '', targetDate: Date): void {
  const target = new Date(targetDate); target.setHours(0,0,0,0);
  const targetIndex = appState.trackerData.findIndex(d => {
    const date = new Date(d.date); date.setHours(0,0,0,0);
    return date.getTime() === target.getTime();
  });
  if (targetIndex === -1) return;
  const day = appState.trackerData[targetIndex];
  if (!Array.isArray(day.studyHours)) day.studyHours = [];
  day.studyHours[colIdx] = parseFloat(((day.studyHours[colIdx] || 0) + hoursToAdd).toFixed(4));
  if (note) {
    const colName = getColumnsForDay(day.day)[colIdx]?.name || 'Study';
    const field = colName.toLowerCase().includes('project') ? 'project' : 'topics';
    day[field] = day[field] ? `${day[field]} | ${colName}: ${note}` : `${colName}: ${note}`;
  }
}

function startTimerInterval(): void {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(() => {
    updateTimerDisplay();
    if (appState.activeTimer.isRunning && appState.activeTimer.startTime) {
      const totalElapsedMs = appState.activeTimer.elapsedAcc + (Date.now() - appState.activeTimer.startTime);
      const elapsedSec = Math.floor(totalElapsedMs / 1000);
      updateSessionProgress(elapsedSec);
      const currentCapMs = appState.activeTimer.overrunCapMs || (3 * 60 * 60 * 1000);
      const remainingMs = currentCapMs - totalElapsedMs;
      const extendBtn = document.getElementById('timerExtendBtn');
      if (remainingMs <= 10 * 60 * 1000 && remainingMs > 0) { if (extendBtn) extendBtn.style.display = 'block'; }
      else if (extendBtn) extendBtn.style.display = 'none';
      if (totalElapsedMs > currentCapMs) { stopTimer('[AUTO-SAFE] Overrun Guard'); return; }
      if (elapsedSec % 30 === 0) {
        saveTimerState(); import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
        if (!wakeLock) requestWakeLock();
      }
    }
  }, 1000);
}

function updateTimerDisplay(): void {
  let totalMs = appState.activeTimer.elapsedAcc;
  if (appState.activeTimer.isRunning && appState.activeTimer.startTime) totalMs += Date.now() - appState.activeTimer.startTime;
  const display = document.getElementById('timerDisplay');
  const subjectLabel = document.getElementById('timerSubject');
  if (appState.activeTimer.activeBreak) {
    const breakMs = Date.now() - appState.activeTimer.activeBreak.startTime + appState.activeTimer.activeBreak.durationAcc;
    const timeStr = formatMsToTime(breakMs);
    if (display) display.textContent = timeStr;
    if (subjectLabel) subjectLabel.textContent = `BREAK: ${appState.activeTimer.activeBreak.reason.toUpperCase()}`;
    document.title = `[BREAK: ${timeStr}]`;
  } else {
    const timeStr = formatMsToTime(totalMs);
    if (display) display.textContent = timeStr;
    if (subjectLabel) subjectLabel.textContent = 'DEEP FOCUS';
    if (appState.activeTimer.isRunning) { toggleFocusHUD(true, appState.activeTimer.colName || 'STUDYING', timeStr); document.title = `[${timeStr}]`; }
    else { document.title = 'All Tracker'; updateSessionProgress(Math.floor(totalMs / 1000)); }
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
      section.classList.remove('paused'); pauseBtn.textContent = 'Break ☕';
      display.classList.remove('blink'); document.body.classList.add('focus-mode'); updateFocusTask();
    } else {
      section.classList.add('paused'); pauseBtn.textContent = 'Resume ▶️';
      if (appState.activeTimer.activeBreak) display.classList.remove('blink'); else display.classList.add('blink');
    }
  } else { section.style.display = 'none'; document.body.classList.remove('focus-mode', 'focus-minimized'); notificationService.stopAmbient(); }
  
  const soundLabel = document.getElementById('ambientSoundLabel');
  const volumeSlider = document.getElementById('ambientVolumeSlider') as HTMLInputElement | null;
  if (soundLabel) soundLabel.textContent = (appState.settings.ambientSound || 'none').replace('-', ' ').toUpperCase();
  if (volumeSlider) {
    const isMuted = notificationService.getMuteState();
    volumeSlider.value = isMuted ? '0' : String(appState.settings.ambientVolume ?? 0.5);
    const iconOn = document.getElementById('volumeIconOn'), iconOff = document.getElementById('volumeIconOff');
    if (iconOn && iconOff) { iconOn.style.display = isMuted ? 'none' : 'block'; iconOff.style.display = isMuted ? 'block' : 'none'; }
  }
  const viz = document.getElementById('audioVisualizer');
  if (viz) viz.style.display = (appState.activeTimer.isRunning && (appState.settings.ambientSound || 'none') !== 'none') ? 'flex' : 'none';
}

function updateSessionProgress(elapsedSeconds: number): void {
  const circle = document.querySelector('.progress-ring__circle') as SVGCircleElement | null;
  if (!circle) return;
  const radius = 130, circumference = radius * 2 * Math.PI;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  const goalMin = parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_GOAL) || '60');
  const percent = Math.min((elapsedSeconds / (goalMin * 60)) * 100, 100);
  circle.style.strokeDashoffset = `${circumference - (percent / 100) * circumference}`;
  if (percent >= 100 && !appState.activeTimer.hasNotifiedGoal) {
    appState.activeTimer.hasNotifiedGoal = true; startConfetti(); notificationService.sendAlert('Goal Reached! 🚀', 'Mission accomplished.');
  }
}

function updateFocusTask(): void {
  const next = getNextRoutine(appState.routines || []);
  const container = document.getElementById('focusActiveTaskContainer'), taskDisplay = document.getElementById('nowPlayingTask');
  if (next && container && taskDisplay) {
    container.style.display = 'block'; taskDisplay.textContent = next.title + (next.title.includes('(Coming Up)') ? '' : ' (Active)');
  } else if (container) container.style.display = 'none';
}

export function openTimerModal(): void {
  const modal = document.getElementById('timerModal'), select = document.getElementById('timerCategorySelect') as HTMLSelectElement;
  if (!select) return; select.innerHTML = '';
  const today = new Date(); today.setHours(0,0,0,0);
  const dayData = appState.trackerData.find(d => {
    const date = new Date(d.date); date.setHours(0,0,0,0); return date.getTime() === today.getTime();
  });
  getColumnsForDay(dayData ? dayData.day : 1).forEach((col, i) => {
    const el = document.createElement('option'); el.value = String(i); el.textContent = col.name; select.appendChild(el);
  });
  modal?.classList.add('active');
}

export function extendTimerCap(): void {
  const current = appState.activeTimer.overrunCapMs || 10800000;
  appState.activeTimer.overrunCapMs = current + 3600000;
  appState.activeTimer.hasWarnedOverrun1 = false; appState.activeTimer.hasWarnedOverrun2 = false;
  const btn = document.getElementById('timerExtendBtn'); if (btn) btn.style.display = 'none';
  showToast("Grind Guard Extended! 🚀", "success"); saveTimerState();
}

export function resumeTimerIfNeeded(): void {
  const { isRunning, startTime, activeBreak, elapsedAcc } = appState.activeTimer;

  // Case 1: No active session at all
  if (!isRunning && !activeBreak && elapsedAcc === 0) {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    updateTimerUI(false);
    return;
  }

  // Case 2: Timer is running
  if (isRunning) {
    if (startTime && (Date.now() - startTime) > 18000000) { stopTimer('[AUTO-SAFE] Recovered'); return; }
    startTimerInterval();
    updateTimerUI(true);
    updateTimerDisplay();
    document.body.classList.add('is-focusing');
    requestWakeLock();
    return;
  }

  // Case 3: On break (isRunning=false but activeBreak is set)
  if (activeBreak) {
    updateTimerUI(true);
    startBreakInterval();
    updateTimerDisplay();
    document.body.classList.remove('is-focusing');
    return;
  }

  // Case 4: Paused with accumulated time (no active break object)
  updateTimerUI(true);
  updateTimerDisplay();
}

export function setupFocusListeners(): void {
  const toggle = document.getElementById('manualFocusToggle'), toggleText = document.getElementById('focusToggleText');
  const hudSection = document.getElementById('activeTimerSection'), pauseBtn = document.getElementById('timerPauseBtn');
  const stopBtn = document.getElementById('timerStopBtn'), terminateBtn = document.getElementById('timerTerminateBtn'), extendBtn = document.getElementById('timerExtendBtn');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isMin = document.body.classList.toggle('focus-minimized');
      if (toggleText) toggleText.textContent = isMin ? 'Restore HUD' : 'Minimize HUD';
      if (!isMin && hudSection) { hudSection.style.setProperty('--drag-x', '0px'); hudSection.style.setProperty('--drag-y', '0px'); }
    });
  }
  const soundToggle = document.getElementById('ambientSoundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = appState.settings.ambientSound || 'none';
      const next = current === 'none' ? 'interstellar' : 'none';
      appState.settings.ambientSound = next; notificationService.setAmbientSound(next);
      if (appState.activeTimer.isRunning) notificationService.startAmbient();
      updateTimerUI(true); saveSettingsToStorage(appState.settings);
    });
  }
  const volSlider = document.getElementById('ambientVolumeSlider') as HTMLInputElement | null;
  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      appState.settings.ambientVolume = val; 
      notificationService.setAmbientVolume(val); 
      saveSettingsToStorage(appState.settings);
    });
    volSlider.addEventListener('mousedown', (e) => e.stopPropagation());
    volSlider.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }
  const muteBtn = document.getElementById('muteToggleBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationService.toggleMute();
      updateTimerUI(true);
    });
  }

  if (terminateBtn) terminateBtn.addEventListener('click', () => terminateTimer());
  if (extendBtn) extendBtn.addEventListener('click', () => extendTimerCap());

  if (hudSection) {
    let isDragging = false, lastX = 0, lastY = 0, currX = 0, currY = 0;
    [pauseBtn, stopBtn, terminateBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('mousedown', (e) => e.stopPropagation());
        btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      }
    });

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !document.body.classList.contains('focus-minimized')) return;
      const cx = e.type.includes('mouse') ? (e as MouseEvent).clientX : (e as TouchEvent).touches[0].clientX;
      const cy = e.type.includes('mouse') ? (e as MouseEvent).clientY : (e as TouchEvent).touches[0].clientY;
      currX += (cx - lastX); currY += (cy - lastY); lastX = cx; lastY = cy;
      hudSection.style.setProperty('--drag-x', `${currX}px`); 
      hudSection.style.setProperty('--drag-y', `${currY}px`);
    };

    const stopDrag = () => {
      isDragging = false;
      hudSection.style.transition = 'transform 0.3s, opacity 0.3s';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
    };

    const startDrag = (cx: number, cy: number) => {
      if (!document.body.classList.contains('focus-minimized')) return;
      isDragging = true;
      hudSection.style.transition = 'none';
      lastX = cx; lastY = cy;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('mouseup', stopDrag, { once: true });
      window.addEventListener('touchend', stopDrag, { once: true });
    };

    hudSection.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
    hudSection.addEventListener('touchstart', (e) => {
      if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    hudSection.style.touchAction = 'none';
  }
}
