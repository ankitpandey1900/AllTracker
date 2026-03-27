/**
 * Routine types
 *
 * Routines are daily scheduled tasks that reset each day.
 * History tracks how many tasks were completed per date.
 */

/** A single routine item in the daily schedule */
export interface RoutineItem {
  id: number;
  title: string;
  time: string;
  note: string;
  completed: boolean;
  isNext?: boolean;
}

/** Completion count keyed by ISO date string (e.g. "2026-03-26") */
export type RoutineHistory = Record<string, number>;
