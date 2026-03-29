/**
 * Core tracker data types
 *
 * Every day in the tracker is represented by a `TrackerDay`.
 * Column names are customizable per date range via `ColumnNames` and `CustomRange`.
 */

// ─── Day Entry ───────────────────────────────────────────────

/** A single day's worth of study data */
export interface TrackerDay {
  day: number;
  date: string;
  /** Array of hours for each study category. Index matches Settings.columns. */
  studyHours: number[];
  topics: string;
  problemsSolved: number;
  project: string;
  completed: boolean;
}

// ─── Column Configuration ────────────────────────────────────

/** A study category with its target hours */
export interface StudyCategory {
  name: string;
  target: number;
}

/** A date-range override for column names and targets */
export interface CustomRange {
  startDay: number;
  endDay: number;
  /** Overridden categories for this range. */
  columns: StudyCategory[];
}

// ─── Session Logging ─────────────────────────────────────────

/** A recorded study session (from the timer) */
export interface SessionLog {
  date: string;
  category: string;
  categoryName: string;
  duration: number;
  timeRange: string;
}

// ─── Settings ────────────────────────────────────────────────

/** Application-wide settings persisted to storage */
export interface Settings {
  startDate: string;
  endDate: string;
  /** Unified list of study categories. */
  columns: StudyCategory[];
  customRanges: CustomRange[];
  beastMode: boolean;
  unlockedBadges: string[];
  sessionLogs: SessionLog[];
}

// ─── Badges ──────────────────────────────────────────────────

/** A badge that can be unlocked by meeting a condition */
export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (data: TrackerDay[]) => boolean;
}

// ─── Rank System ─────────────────────────────────────────────

/** Tier definition for the gamified rank system */
export interface RankTier {
  name: string;
  min: number;
  max: number;
  color: string;
}

/** Computed rank details for a given hour total */
export interface RankDetails extends RankTier {
  division: string;
  title: string;
  worldPos: string;
  tierXP: number;
  level: number;
  absolutePos: number;
}

