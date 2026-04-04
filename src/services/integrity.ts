import { appState } from '@/state/app-state';
import { saveTrackerDataToStorage } from '@/services/data-bridge';


/**
 * Integrity Service
 * 
 * Enforces "Eternity Mode" rules:
 * 1. 4:00 AM Grace Period for previous day editing.
 * 2. Midnight Auto-Seal: Ticks "Done" if hours > 0 at 11:59:59 PM.
 * 3. Iron-Gate Locking: Disallows editing of past/future rows.
 */

// Daily Auto-Seal Tracking to avoid redundant storage writes
let lastAutoSealDate = '';

export function initIntegrityService(): void {
  // Check every minute for integrity rules
  setInterval(() => {
    runIntegrityChecks();
  }, 1000 * 60);

  // Initial check
  runIntegrityChecks();
}

/**
 * Determines if a specifically dated row is editable.
 * Allows current date always.
 * Allows previous date until 4:00 AM of the current date.
 */
export function isRowEditable(dateStr: string): boolean {
  const now = new Date();
  const rowDate = new Date(dateStr);
  
  // Normalize both to start of day
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const formattedRowDate = new Date(rowDate);
  formattedRowDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - formattedRowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Future dates are always locked
  if (diffDays < 0) return false;

  // Today is always editable
  if (diffDays === 0) return true;

  // Yesterday is editable if it's before 4:00 AM today
  if (diffDays === 1 && now.getHours() < 4) return true;

  // Everything else is locked
  return false;
}

/**
 * Robust Integrity Checks:
 * 1. Auto-seals current day at 11:59 PM.
 * 2. Catch-up: Seals any previous days that were missed.
 * 3. Syncs results to the global leaderboard.
 */
function runIntegrityChecks(): void {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  let needsSync = false;

  // 1. Midnight Auto-Seal (11:59 PM window)
  if (now.getHours() === 23 && now.getMinutes() >= 58) {
    if (lastAutoSealDate !== todayStr) {
      const todayData = appState.trackerData.find(d => d.date.startsWith(todayStr));
      if (todayData && !todayData.completed && !todayData.restDay) {
        const totalHours = (todayData.studyHours || []).reduce((a, b) => a + (b || 0), 0);
        if (totalHours > 0) {
          todayData.completed = true;
          needsSync = true;
          lastAutoSealDate = todayStr;
          console.log(`[Integrity] Auto-sealed Day ${todayData.day} at ${now.toLocaleTimeString()}`);
        }
      }
    }
  }

  // 2. Catch-up Sealing (Previous Days)
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);

  appState.trackerData.forEach(day => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    // If day is in the past, uncompleted, and has hours logged -> SEAL IT
    if (dayDate < todayDate && !day.completed && !day.restDay) {
      const totalHours = (day.studyHours || []).reduce((a, b) => a + (b || 0), 0);
      if (totalHours > 0) {
        day.completed = true;
        needsSync = true;
        console.log(`[Integrity] Catch-up Seal for Day ${day.day} (${day.date})`);
      }
    }
  });

  if (needsSync) {
    saveTrackerDataToStorage(appState.trackerData);
    
    // Refresh Global Leaderboard
    import('@/features/dashboard/leaderboard').then(m => m.syncProfileBroadcast());
    
    // Refresh Local UI if visible
    import('@/features/tracker/tracker').then(m => m.generateTable());
  }
}
