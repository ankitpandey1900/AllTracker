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
  pythonHours: number;
  dsaHours: number;
  projectHours: number;
  col4Hours: number;
  /** Extra dynamic hour columns beyond the default 4 (col5+). Index 0 => col5 */
  extraHours?: number[];
  topics: string;
  dsaProblems: number;
  project: string;
  completed: boolean;
}

// ─── Column Configuration ────────────────────────────────────

/** Names for the four customizable hour-tracking columns */
export interface ColumnNames {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}

/** A date-range override for column names and targets */
export interface CustomRange extends ColumnNames {
  startDay: number;
  endDay: number;
  col1Target: number;
  col2Target: number;
  col3Target: number;
  col4Target: number;
  /** Extra dynamic hour columns for this range (col5+). Overrides defaults. */
  extraColumns?: ExtraColumn[];
}

export interface ExtraColumn {
  name: string;
  target: number;
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
  defaultColumns: ColumnNames;
  /** Extra dynamic hour columns beyond the default 4 (col5+). */
  extraColumns?: ExtraColumn[];
  customRanges: CustomRange[];
  beastMode: boolean;
  unlockedBadges: string[];
  targets: Record<string, number>;
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
}

