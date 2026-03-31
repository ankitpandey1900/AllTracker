import { appState } from '@/state/app-state';
import { saveTrackerDataToStorage } from '@/services/data-bridge';
import { showToast } from '@/utils/dom.utils';

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
  // Check every minute for the 11:59 PM auto-seal
  setInterval(() => {
    runMidnightAutoSeal();
  }, 1000 * 60);

  // Initial check
  runMidnightAutoSeal();
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
 * Auto-marks the current day as "Done" if any hours are logged before midnight.
 */
function runMidnightAutoSeal(): void {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // We only seal at the very end of the day (11:59 PM)
  // Or if we detect the day has changed but the previous day isn't sealed
  if (now.getHours() === 23 && now.getMinutes() >= 58) {
    if (lastAutoSealDate === todayStr) return;

    const todayData = appState.trackerData.find(d => d.date.startsWith(todayStr));
    if (todayData && !todayData.completed && !todayData.restDay) {
      const totalHours = (todayData.studyHours || []).reduce((a, b) => a + (b || 0), 0);
      
      if (totalHours > 0) {
        todayData.completed = true;
        saveTrackerDataToStorage(appState.trackerData);
        lastAutoSealDate = todayStr;
        console.log(`[Integrity] Auto-sealed Day ${todayData.day} at ${now.toLocaleTimeString()}`);
        
        // Refresh UI if tracker is visible
        import('@/features/tracker/tracker').then(m => m.generateTable());
      }
    }
  }
}
