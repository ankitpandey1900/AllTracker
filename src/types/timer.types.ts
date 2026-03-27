/**
 * Timer state types
 *
 * The timer runs a study session against one of the four
 * customizable columns (col1–col4).
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
