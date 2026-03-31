/**
 * Study Task Types
 *
 * One-off daily study goals (e.g., "Complete Lec 1 of React").
 * Unlike Routines, these represent specific milestones for a date.
 */

export interface StudyTask {
  id: number;
  text: string;
  completed: boolean;
  /** ISO string of the date (YYYY-MM-DD) */
  date: string;
  /** Timestamp when created */
  createdAt: number;
  /** Timestamp when completed (if applicable) */
  completedAt?: number;
  /** Importance level: 1 (Low), 2 (Med), 3 (High) */
  priority?: 1 | 2 | 3;
}
