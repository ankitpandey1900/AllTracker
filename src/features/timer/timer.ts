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
import { saveTimerStateCloud, updateSyncStatus, SyncIndicator, logStudySessionCloud } from '@/services/vault.service';
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

  // 📡 Split-Brain Timer Sync: Full Bi-Directional Real-time Integration
  import('@/services/vault.service').then(({ subscribeToRealtimeTelemetry }) => {
    subscribeToRealtimeTelemetry(async (payload) => {
      const { getCurrentUserId } = await import('@/services/auth.service');
      const me = getCurrentUserId();
      
      if (payload.new && payload.new.id === me) {
        const cloudIsRunning = payload.new.is_focusing;
        const localIsRunning = appState.activeTimer.isRunning;

        // If Cloud state differs from Local state, we have a remote event
        if (cloudIsRunning !== localIsRunning) {
          log.info(`📡 REMOTE SYNC: External ${cloudIsRunning ? 'START' : 'PAUSE'} detected. Synchronizing...`);
          
          const { loadTimerStateFromStorage } = await import('@/services/data-bridge');
          const cloudState = await loadTimerStateFromStorage();
          
          if (cloudState) {
            // Update local memory
            Object.assign(appState.activeTimer, cloudState);
            
            // Handle UI transitions
            if (cloudIsRunning) {
              updateTimerUI(true);
              startTimerInterval();
              document.body.classList.add('is-focusing');
              requestWakeLock();
            } else {
              if (appState.timerInterval) clearInterval(appState.timerInterval);
              updateTimerUI(true); // Still show it, but in paused/break state
              document.body.classList.remove('is-focusing');
              // We don't release wakeLock here because user might be on break
            }
            updateTimerDisplay();
          }
        }
      }
    });
  });
}

// HUD Sync logic centralized in vault.service.ts

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
      log.info('💡 Wake Lock Active: Screen will stay awake.');
      wakeLock.addEventListener('release', () => {
        log.info('🌙 Wake Lock Released.');
      });
    } catch (err: any) {
      log.error('Wake Lock Request Failed:', err);
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

// Re-acquire wake lock if tab becomes visible again or if the OS releases it
document.addEventListener('visibilitychange', async () => {
  if (appState.activeTimer.isRunning || appState.activeTimer.activeBreak) {
    if (document.visibilityState === 'visible') {
      await requestWakeLock();
    }
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
      stopTimer().catch(err => log.error('MediaSession Stop Error:', err));
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
  
  // 🎙️ AMBIENT AUDIO: Resume if sound is selected
  notificationService.startAmbient();
  
  document.getElementById('timerModal')?.classList.remove('active');

  appState.activeTimer.category = String(categoryIdx);
  appState.activeTimer.colName = categoryName;

  // 🔔 NOTIFICATIONS: Request permission and reset goal flag
  notificationService.requestPermission();
  appState.activeTimer.hasNotifiedGoal = false;

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

export function startBreak(reason: string): void {
  if (!appState.activeTimer.isRunning) return;

  // ⚡ OPTIMISTIC UI: Instant freeze
  appState.activeTimer.isRunning = false;
  
  // Track Break
  const currentSession = Date.now() - (appState.activeTimer.startTime || 0);
  appState.activeTimer.elapsedAcc += currentSession;
  appState.activeTimer.startTime = null;
  
  appState.activeTimer.activeBreak = {
    reason: reason,
    startTime: Date.now(),
    durationAcc: 0
  };

  updateTimerUI(true);
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  // Still allow timerInterval to tick up the *break* timer
  startBreakInterval();

  // 🎙️ AMBIENT AUDIO: Stop on break
  notificationService.stopAmbient();
  saveTimerState();

  // ⚡ ELITE UX: Rest Mode
  document.body.classList.remove('is-focusing');

  // ⚡ ELITE UX: Rest Mode
  document.body.classList.remove('is-focusing');

  // NOTE: We NO LONGER release wakeLock here so the screen stays awake during breaks as requested.
  updateMediaSession(false);

  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
}

export function resumeFromBreak(): void {
  if (appState.activeTimer.isRunning) return;

  if (appState.activeTimer.activeBreak) {
    const elapsedBreak = Date.now() - appState.activeTimer.activeBreak.startTime + appState.activeTimer.activeBreak.durationAcc;
    if (!appState.activeTimer.completedBreaks) appState.activeTimer.completedBreaks = [];
    appState.activeTimer.completedBreaks.push({
      reason: appState.activeTimer.activeBreak.reason,
      durationMs: elapsedBreak
    });
    appState.activeTimer.activeBreak = null;
  }

  appState.activeTimer.isRunning = true;
  appState.activeTimer.startTime = Date.now();

  updateTimerUI(true);
  startTimerInterval();
  notificationService.startAmbient();
  saveTimerState();

  document.body.classList.add('is-focusing');
  requestWakeLock();
  updateMediaSession(true);
  
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
}

export function pauseTimer(): void {
  // Legacy handler — acts as a fallback or unlogged pause. Re-routes to basic break.
  startBreak('Paused');
}

function startBreakInterval(): void {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(() => {
    updateTimerDisplay(); // Displays Break Mode
    
    // 🛰️ INFINITE ESCALATING SLACKER ALARM (15, 25, 40, 55, and then every 15m)
    const activeBreak = appState.activeTimer.activeBreak;
    if (activeBreak) {
      const elapsedMs = Date.now() - activeBreak.startTime + activeBreak.durationAcc;
      const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
      const last = activeBreak.lastNotifiedMinutes || 0;

      // Milestone Logic
      const milestones = [15, 25, 40, 55];
      let currentMilestone = 0;

      for (const m of milestones) {
        if (elapsedMins >= m) currentMilestone = m;
      }
      
      // Beyond fixed milestones, repeat every 15 mins
      if (elapsedMins > 55) {
        const intervalStep = Math.floor((elapsedMins - 55) / 15) * 15;
        currentMilestone = 55 + intervalStep;
      }

      // Fire notification if crossing a new milestone
      if (currentMilestone > last) {
        let msg = 'Thoda break ho gaya? Ab refocus karlo! ☕';
        if (currentMilestone === 15) msg = "15 minutes ho gaye. Refocus mode on? ☕";
        else if (currentMilestone === 25) msg = "25 minutes khatam! Chal wapas grind pe lag ja! 🚀";
        else if (currentMilestone === 40) msg = "Bhai 40 minutes break?! Sab aage nikal jayenge, jaldi wapas aao! ⚠️";
        else if (currentMilestone === 55) msg = "AB BAS! Boht slacking ho gayi. Immediately return to mission! 🛑";
        else msg = `Continuous Slacking Alert: ${currentMilestone} mins ho gaye. Bas karo aur wapas aao! 🚨`;

        notificationService.sendAlert(`${activeBreak.reason} Break: ${currentMilestone}m ⚠️`, msg);
        activeBreak.lastNotifiedMinutes = currentMilestone;
      }
    }

    // 💓 HEARBEAT SYNC
    saveTimerState();

    // 🛡️ ANTI-SLEEP HEARTBEAT: Keep screen awake during breaks
    if (!wakeLock) requestWakeLock();
  }, 1000);
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

  // ⚡ OPTIMISTIC UI: Mark as not running immediately so the World Stage updates instantly 
  // before they spend time writing their session note.
  appState.activeTimer.isRunning = false;
  import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
  const totalHours = Math.floor(totalElapsed / 1000) / 3600;

  let note = autoNote || await showSessionNoteModal();

  // If stopped while on a break, finalize that break first
  if (appState.activeTimer.activeBreak) {
    const elapsedBreak = Date.now() - appState.activeTimer.activeBreak.startTime + appState.activeTimer.activeBreak.durationAcc;
    if (!appState.activeTimer.completedBreaks) appState.activeTimer.completedBreaks = [];
    appState.activeTimer.completedBreaks.push({
      reason: appState.activeTimer.activeBreak.reason,
      durationMs: elapsedBreak
    });
    appState.activeTimer.activeBreak = null;
  }

  // Combine breaks heavily into the note, consolidating same reasons
  if (appState.activeTimer.completedBreaks && appState.activeTimer.completedBreaks.length > 0) {
    const breakMap = new Map<string, { duration: number; count: number }>();
    appState.activeTimer.completedBreaks.forEach(b => {
      const existing = breakMap.get(b.reason) || { duration: 0, count: 0 };
      existing.duration += b.durationMs;
      existing.count += 1;
      breakMap.set(b.reason, existing);
    });

    const breakStrings = Array.from(breakMap.entries()).map(([reason, stats]) => {
      const mins = Math.max(1, Math.floor(stats.duration / 60000));
      return stats.count > 1 ? `${reason} (${mins}m / ${stats.count}x)` : `${reason} (${mins}m)`;
    });

    if (note) note += ` | `;
    note += `[Breaks: ${breakStrings.join(', ')}]`;
  }

  try {
    if (totalElapsed > 0 && appState.activeTimer.category !== null) {
      const colIdx = parseInt(appState.activeTimer.category);
      const sessionStart = appState.activeTimer.sessionStartClock ? new Date(appState.activeTimer.sessionStartClock) : new Date();
      const sessionEnd = new Date();

      const startDay = sessionStart.getDate();
      const endDay = sessionEnd.getDate();

      if (startDay !== endDay) {
        const midnight = new Date(sessionEnd);
        midnight.setHours(0, 0, 0, 0);

        const msBefore = midnight.getTime() - sessionStart.getTime();
        const msAfter = sessionEnd.getTime() - midnight.getTime();

        const hoursBefore = Math.max(0, msBefore / (1000 * 60 * 60));
        const hoursAfter = Math.max(0, msAfter / (1000 * 60 * 60));

        saveSessionToDate(colIdx, hoursBefore, note, sessionStart);
        saveSessionToDate(colIdx, hoursAfter, note, sessionEnd);

        showToast(`🛡️ MIDNIGHT SECTOR SPLIT: ${formatDuration(hoursBefore)} (Yesterday) + ${formatDuration(hoursAfter)} (Today)`, 'success');

        // 🌐 CLOUD SESSION LOG — two separate records, matching the local split exactly
        if (hoursBefore > 0) {
          await logStudySessionCloud(hoursBefore, appState.activeTimer.colName || 'GENERAL', sessionStart, note);
        }
        if (hoursAfter > 0) {
          await logStudySessionCloud(hoursAfter, appState.activeTimer.colName || 'GENERAL', midnight, note);
        }
        
        // 🛡️ LIVE BUFFER: Update local verified total immediately to prevent Trust Score drop
        appState.verifiedHours += (hoursBefore + hoursAfter);
      } else {
        saveSessionToDate(colIdx, totalHours, note, sessionEnd);
        showToast(autoNote ? `Auto-Safe Triggered: ${formatMsToTime(totalElapsed)}` : `Session saved: ${formatMsToTime(totalElapsed)}`, 'success');

        // 🌐 CLOUD SESSION LOG (UTC)
        await logStudySessionCloud(totalHours, appState.activeTimer.colName || 'GENERAL', sessionStart, note);
        
        // 🛡️ LIVE BUFFER: Update local verified total immediately
        appState.verifiedHours += totalHours;
      }
    }
  } catch (error) {
    log.error('Error saving session:', error);
    showToast('Session data could not be saved', 'error');
  } finally {
    isStopping = false;
  }

  // Clear focus mode
  document.body.classList.remove('focus-mode', 'focus-minimized', 'is-focusing');

  // Reset timer state fully
  appState.activeTimer.elapsedAcc = 0;
  appState.activeTimer.startTime = null;
  appState.activeTimer.category = null;
  appState.activeTimer.colName = '';
  appState.activeTimer.sessionStartClock = null;
  appState.activeTimer.activeBreak = null;
  appState.activeTimer.completedBreaks = [];
  appState.activeTimer.overrunCapMs = undefined;
  appState.activeTimer.hasWarnedOverrun1 = false;
  appState.activeTimer.hasWarnedOverrun2 = false;

  // 🎙️ AMBIENT AUDIO: Safety stop
  notificationService.stopAmbient();

  // Broadcast status update
  syncProfileBroadcast();

  saveTimerState();

  const section = document.getElementById('activeTimerSection');
  if (section) section.style.display = 'none';
  document.getElementById('timerModal')?.classList.remove('active');

  updateTimerUI(false);
  toggleFocusHUD(false);
  updateDashboard();
  renderHeatmap();
  renderPerformanceCurve();
  releaseWakeLock();
  generateTable();
}

/** Kills the session instantly — no note, no data saved.
 * Uses clearTimerStateDB() to guarantee the DB record is zeroed
 * before the user can refresh, eliminating the resurrection bug. */
export async function terminateTimer(): Promise<void> {
  if (!appState.activeTimer.isRunning && appState.activeTimer.elapsedAcc === 0) return;

  const confirmed = await showTerminateConfirmModal();
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
  appState.activeTimer.activeBreak = null;
  appState.activeTimer.completedBreaks = [];
  appState.activeTimer.overrunCapMs = undefined;
  appState.activeTimer.hasWarnedOverrun1 = false;
  appState.activeTimer.hasWarnedOverrun2 = false;

  // 🎙️ AMBIENT AUDIO: Safety stop
  notificationService.stopAmbient();

  // ✅ ATOMIC DB CLEAR: await guarantees cloud is zeroed before any refresh can happen
  await clearTimerStateDB();

  // Dismiss HUD
  document.body.classList.remove('focus-mode', 'focus-minimized', 'is-focusing');
  const section = document.getElementById('activeTimerSection');
  if (section) section.style.display = 'none';
  document.getElementById('timerModal')?.classList.remove('active');

  updateTimerUI(false);
  toggleFocusHUD(false);
  releaseWakeLock();
  showToast('Session terminated. No data recorded.', 'error');

  // Broadcast Idle telemetry so leaderboard/HUD reflects Idle state
  syncProfileBroadcast();
}

async function showTerminateConfirmModal(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal active';
    overlay.style.zIndex = '999999'; // higher than HUD

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <h3 style="color: #ef4444; margin-bottom: 12px; font-weight: bold; letter-spacing: 1px;">TERMINATE SESSION?</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem;">
          This will discard all your study time. Nothing will be saved to your dashboard or the World Stage.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="cancelTermBtn" class="btn btn-outline" style="flex: 1;">Cancel</button>
          <button id="confirmTermBtn" class="btn glow-danger" style="flex: 1; background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444;">Terminate</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result: boolean) => {
      document.body.removeChild(overlay);
      resolve(result);
    };

    overlay.querySelector('#cancelTermBtn')?.addEventListener('click', () => cleanup(false));
    overlay.querySelector('#confirmTermBtn')?.addEventListener('click', () => cleanup(true));
  });
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
    log.warn(`[Timer] Could not find date ${targetDate.toDateString()} in tracker data.`);
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

  // Log session - ONLY save to local vault if NOT logged in (Cloud-Dominant Rule)
  const syncId = getCurrentUserId();
  if (!syncId) {
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
  }
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
        } catch (e) { /* silent fail */ }
      }

      // 🛑 OVERRUN GUARD: HARD CAP LIVE SESSIONS (Default 3 hours)
      const currentCapMs = appState.activeTimer.overrunCapMs || (3 * 60 * 60 * 1000);
      const remainingMs = currentCapMs - totalElapsedMs;

      // Warning 1: 10 mins before
      const extendBtn = document.getElementById('timerExtendBtn');
      if (remainingMs <= 10 * 60 * 1000 && remainingMs > 0) {
        if (extendBtn) extendBtn.style.display = 'block';
      } else {
        if (extendBtn) extendBtn.style.display = 'none';
      }

      if (remainingMs <= 10 * 60 * 1000 && remainingMs > 9 * 60 * 1000 && !appState.activeTimer.hasWarnedOverrun1) {
        appState.activeTimer.hasWarnedOverrun1 = true;
        notificationService.sendAlert(
          "Grind Guard: 10m Left ⚠️",
          "Bhai 3 ghante hone wale hain! Are you still studying? HUD check karlo extension ke liye."
        );
        showToast("Overrun Guard: 10 minutes remaining. Check HUD to extend.", "warning");
      }

      // Warning 2: 2 mins before
      if (remainingMs <= 2 * 60 * 1000 && remainingMs > 0 && !appState.activeTimer.hasWarnedOverrun2) {
        appState.activeTimer.hasWarnedOverrun2 = true;
        notificationService.sendAlert(
          "FINAL WARNING 🛑",
          "Session auto-stopping in 2 mins to protect your stats! Extend now if you are still here."
        );
      }

      if (totalElapsedMs > currentCapMs) {
        log.warn(`[Timer] Hard cap reached (${currentCapMs/3600000}h). Auto-stopping.`);
        appState.activeTimer.startTime = Date.now() - (currentCapMs - appState.activeTimer.elapsedAcc);
        stopTimer('[AUTO-SAFE] Overrun Guard Triggered');
        return;
      }

      // 💓 HEARBEAT SYNC: Every 30 seconds, push the live state to Supabase for "Perfect Sync"
      if (elapsedSeconds > 0 && elapsedSeconds % 30 === 0) {
        saveTimerState();
        // Live Leaderboard Push: Broadcast active hours so the World Stage updates in real-time
        import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());
        
        // 🛡️ ANTI-SLEEP HEARTBEAT: Re-verify wake lock every 30s
        if (!wakeLock) requestWakeLock();
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
  const subjectLabel = document.getElementById('timerSubject');
  
  if (appState.activeTimer.activeBreak) {
    // If on a break, display the break clock count-up instead
    const breakMs = Date.now() - appState.activeTimer.activeBreak.startTime + appState.activeTimer.activeBreak.durationAcc;
    const timeStr = formatMsToTime(breakMs);
    if (display) display.textContent = timeStr;
    if (subjectLabel) subjectLabel.textContent = `ON BREAK: ${appState.activeTimer.activeBreak.reason.toUpperCase()}`;
    document.title = `[BREAK: ${timeStr}] All Tracker`;
  } else {
    // Standard Timer flow
    const timeStr = formatMsToTime(totalMs);
    if (display) display.textContent = timeStr;
    if (subjectLabel) subjectLabel.textContent = 'DEEP FOCUS';

    if (appState.activeTimer.isRunning) {
      toggleFocusHUD(true, appState.activeTimer.colName || 'STUDYING', timeStr);
      document.title = `[${timeStr}] All Tracker | Elite Study Dashboard`;
    } else {
      document.title = `All Tracker | Elite Study Dashboard, DSA Rituals & World Stage`;
    }

    if (!appState.activeTimer.isRunning) {
      updateSessionProgress(Math.floor(totalMs / 1000));
    }
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
      pauseBtn.textContent = 'Break ☕';
      display.classList.remove('blink');
      document.body.classList.add('focus-mode');
      updateFocusTask();
    } else {
      section.classList.add('paused');
      pauseBtn.textContent = 'Resume ▶️';
      // If activeBreak exists, we DO NOT blink, it operates as a live timer logic on screen
      if (appState.activeTimer.activeBreak) {
        display.classList.remove('blink');
      } else {
        display.classList.add('blink');
      }
    }
  } else {
    section.style.display = 'none';
    document.body.classList.remove('focus-mode', 'focus-minimized');
    
    // 🎙️ AMBIENT AUDIO: Safety stop
    notificationService.stopAmbient();
  }

  // 🎙️ SYNC AMBIENT UI
  const soundLabel = document.getElementById('ambientSoundLabel');
  const volumeSlider = document.getElementById('ambientVolumeSlider') as HTMLInputElement | null;
  
  if (soundLabel) {
    const current = appState.settings.ambientSound || 'none';
    soundLabel.textContent = current.replace('-', ' ').toUpperCase();
    
    const btn = document.getElementById('ambientSoundToggle');
    if (btn) {
      if (current !== 'none') btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }
  
  if (volumeSlider) {
    const isMuted = notificationService.getMuteState();
    volumeSlider.value = isMuted ? '0' : String(appState.settings.ambientVolume ?? 0.5);
    notificationService.setAmbientVolume(parseFloat(volumeSlider.value));

    // Sync Mute Icons
    const iconOn = document.getElementById('volumeIconOn');
    const iconOff = document.getElementById('volumeIconOff');
    if (iconOn && iconOff) {
      iconOn.style.display = isMuted ? 'none' : 'block';
      iconOff.style.display = isMuted ? 'block' : 'none';
    }
  }

  // Sync Visualizer
  const viz = document.getElementById('audioVisualizer');
  if (viz) {
    const isPlaying = appState.activeTimer.isRunning && (appState.settings.ambientSound || 'none') !== 'none';
    viz.style.display = isPlaying ? 'flex' : 'none';
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

  // 🔔 TACTICAL ALERT: Goal Reached
  if (percent >= 100 && !appState.activeTimer.hasNotifiedGoal) {
    appState.activeTimer.hasNotifiedGoal = true;
    
    // 🎭 ELITE CELEBRATION
    startConfetti();
    
    notificationService.sendAlert(
      'Goal Reached! 🚀',
      `Mission accomplished for ${appState.activeTimer.colName || 'Study'}. Session complete.`
    );
  }

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
  const next = getNextRoutine(appState.routines || []);
  const container = document.getElementById('focusActiveTaskContainer');
  const taskDisplay = document.getElementById('nowPlayingTask');
  
  if (next && container && taskDisplay) {
    container.style.display = 'block';
    taskDisplay.textContent = next.title + (next.title.includes('(Coming Up)') ? '' : ' (Active)');
    // Note: getNextRoutine logic already handles finding the next uncompleted task.
    // If it's already past the time, it's the current task.
  } else if (container) {
    container.style.display = 'none';
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

/** Proves user presence and pushes the auto-stop guard back by 1 hour */
export function extendTimerCap(): void {
  const DEFAULT_CAP = 3 * 60 * 60 * 1000;
  const current = appState.activeTimer.overrunCapMs || DEFAULT_CAP;
  appState.activeTimer.overrunCapMs = current + (60 * 60 * 1000); // +1 Hour
  
  // Reset warning flags so they fire again for the new cap
  appState.activeTimer.hasWarnedOverrun1 = false;
  appState.activeTimer.hasWarnedOverrun2 = false;

  const extendBtn = document.getElementById('timerExtendBtn');
  if (extendBtn) extendBtn.style.display = 'none';

  showToast("Grind Guard Extended: 1 more hour granted! 🚀", "success");
  saveTimerState();
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
      log.warn('[Timer] Self-healing: Detected abandoned session (>5h). Auto-Save Triggered.');
      // Prevent 90-hour bugs: hard-cap the startTime to exactly 5 hours ago so stopTimer safely logs exactly 5.0 hours.
      appState.activeTimer.startTime = Date.now() - FIVE_HOURS_MS;
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
        log.info(`[Timer] Self-healed colName: "${appState.activeTimer.colName}"`);
      }
    }

    if (isRunning) {
      startTimerInterval();
      // Re-broadcast with the correct (possibly self-healed) colName
      import('@/features/profile/profile.manager').then(m => m.syncProfileBroadcast());

      // 🎶 AUDIO AUTO-RESUME: Browser policy blocks autoplay on refresh.
      if (appState.settings.ambientSound && appState.settings.ambientSound !== 'none') {
        const resumeAudio = () => {
          if (appState.activeTimer.isRunning) notificationService.startAmbient();
          document.removeEventListener('click', resumeAudio, true);
        };
        document.addEventListener('click', resumeAudio, true);
      }
    } else if (appState.activeTimer.activeBreak) {
      // It wasn't running, but a break was actively tracking
      startBreakInterval();
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

  // 🎙️ AMBIENT AUDIO LISTENERS
  const soundToggle = document.getElementById('ambientSoundToggle');
  const volumeSlider = document.getElementById('ambientVolumeSlider') as HTMLInputElement | null;

  if (soundToggle) {
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = appState.settings.ambientSound || 'none';
      const next = current === 'none' ? 'interstellar' : 'none';
      
      appState.settings.ambientSound = next;
      notificationService.setAmbientSound(next);
      
      if (appState.activeTimer.isRunning) {
        notificationService.startAmbient();
      }
      
      updateTimerUI(true);
      saveSettingsToStorage(appState.settings);
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      appState.settings.ambientVolume = val;
      notificationService.setAmbientVolume(val);
      saveSettingsToStorage(appState.settings);
    });
    // Prevent dragging HUD when adjusting volume
    volumeSlider.addEventListener('mousedown', (e) => e.stopPropagation());
    volumeSlider.addEventListener('touchstart', (e) => e.stopPropagation());
  }

  // 🎙️ MUTE TOGGLE
  const muteBtn = document.getElementById('muteToggleBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationService.toggleMute();
      updateTimerUI(true);
    });
  }

  // Wire up Terminate Button
  const terminateBtn = document.getElementById('timerTerminateBtn');
  const extendBtn = document.getElementById('timerExtendBtn');
  if (terminateBtn) terminateBtn.addEventListener('click', () => terminateTimer());
  if (extendBtn) extendBtn.addEventListener('click', () => extendTimerCap());

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
