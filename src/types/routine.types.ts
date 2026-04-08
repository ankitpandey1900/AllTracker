/**
 * Types for the daily routine.
 *
 * Routines are things you do every day that reset each morning.
 */

/** A single routine item in the daily schedule */
export interface RoutineItem {
  id: number;
  title: string;
  time: string;
  note: string;
  completed: boolean;
  isNext?: boolean;
  /** Days of week (0-6, Sun-Sat). If empty, active every day. */
  days?: number[];
  /** Consecutive completion streak */
  streak?: number;
  /** ISO date of last completion for streak calculation */
  lastCompletedIso?: string;
}

/** Completion count keyed by ISO date string (e.g. "2026-03-26") */
export type RoutineHistory = Record<string, number>;
