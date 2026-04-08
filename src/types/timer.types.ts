/**
 * Types for the study timer.
 * 
 * The timer tracks how long you study a specific category.
 */

/** Current state of the active study timer */
export interface ActiveTimer {
  isRunning: boolean;
  startTime: number | null;
  sessionStartClock: number | null;
  elapsedAcc: number;
  category: string | null;
  colName: string;
}
