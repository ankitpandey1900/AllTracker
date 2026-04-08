/**
 * Types for study tasks.
 *
 * These are one-off goals for a specific day (like "Finish Homework").
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
