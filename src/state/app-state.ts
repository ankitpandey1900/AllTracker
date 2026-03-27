/**
 * Centralized application state
 *
 * Replaces all the scattered global `let` variables in the old script.js.
 * Every module imports `appState` and reads/writes the properties it needs.
 *
 * This is intentionally simple mutable state — not a full state management
 * library — to keep the migration straightforward.
 */

import type { TrackerDay, Settings, ColumnNames, ExtraColumn } from '@/types/tracker.types';
import type { ActiveTimer } from '@/types/timer.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import { DEFAULT_START_DATE, DEFAULT_END_DATE, DEFAULT_COLUMNS, STORAGE_KEYS } from '@/config/constants';

// ─── Default Settings ────────────────────────────────────────

function createDefaultSettings(): Settings {
  return {
    startDate: DEFAULT_START_DATE.toISOString().split('T')[0],
    endDate: DEFAULT_END_DATE.toISOString().split('T')[0],
    defaultColumns: { ...DEFAULT_COLUMNS },
    extraColumns: [],
    customRanges: [],
    beastMode: false,
    unlockedBadges: [],
    targets: { col1: 0, col2: 0, col3: 0, col4: 0 },
    sessionLogs: [],
  };
}

function createDefaultTimer(): ActiveTimer {
  return {
    isRunning: false,
    startTime: null,
    sessionStartClock: null,
    elapsedAcc: 0,
    category: null,
    colName: '',
  };
}

// ─── App State ───────────────────────────────────────────────

export const appState = {
  /** Daily tracker entries */
  trackerData: [] as TrackerDay[],

  /** Application settings */
  settings: createDefaultSettings(),

  /** Daily routine items */
  routines: JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES) || '[]') as RoutineItem[],



  /** Routine completion history by date */
  routineHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINE_HISTORY) || '{}') as RoutineHistory,

  /** Saved bookmarks */
  bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]') as Bookmark[],

  /** Active study timer */
  activeTimer: createDefaultTimer(),

  /** Timer interval reference */
  timerInterval: null as ReturnType<typeof setInterval> | null,

  /** Deadline countdown interval reference */
  deadlineInterval: null as ReturnType<typeof setInterval> | null,

  // ─── Computed date values ────────────────────────────────

  startDate: new Date(DEFAULT_START_DATE),
  endDate: new Date(DEFAULT_END_DATE),
  totalDays: 0,
  phase1End: 0,
  phase2End: 0,
  phase3End: 0,
};

// ─── Date Calculation ────────────────────────────────────────

/** Recalculates totalDays and phase boundaries from current settings */
export function calculateDates(): void {
  let sDate = new Date(appState.settings.startDate);
  let eDate = new Date(appState.settings.endDate);

  if (isNaN(sDate.getTime())) sDate = new Date(DEFAULT_START_DATE);
  if (isNaN(eDate.getTime())) eDate = new Date(DEFAULT_END_DATE);

  appState.startDate = sDate;
  appState.endDate = eDate;

  const timeDiff = eDate.getTime() - sDate.getTime();
  appState.totalDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1);

  appState.phase1End = Math.floor(appState.totalDays / 3);
  appState.phase2End = Math.floor((appState.totalDays * 2) / 3);
  appState.phase3End = appState.totalDays;
}

// ─── Column Name Resolution ──────────────────────────────────

/** Returns the column names for a given day (custom range overrides first) */
export function getColumnNames(day: number): ColumnNames {
  for (const range of appState.settings.customRanges) {
    if (day >= range.startDay && day <= range.endDay) {
      return {
        col1: range.col1 || DEFAULT_COLUMNS.col1,
        col2: range.col2 || DEFAULT_COLUMNS.col2,
        col3: range.col3 || DEFAULT_COLUMNS.col3,
        col4: range.col4 || DEFAULT_COLUMNS.col4,
      };
    }
  }

  return {
    col1: appState.settings.defaultColumns.col1 || DEFAULT_COLUMNS.col1,
    col2: appState.settings.defaultColumns.col2 || DEFAULT_COLUMNS.col2,
    col3: appState.settings.defaultColumns.col3 || DEFAULT_COLUMNS.col3,
    col4: appState.settings.defaultColumns.col4 || DEFAULT_COLUMNS.col4,
  };
}

/** Returns extra columns config for a given day (custom range overrides first) */
function getExtraColumns(day: number): ExtraColumn[] {
  for (const range of appState.settings.customRanges) {
    if (day >= range.startDay && day <= range.endDay) {
      return Array.isArray(range.extraColumns) ? range.extraColumns : [];
    }
  }
  return Array.isArray(appState.settings.extraColumns) ? appState.settings.extraColumns : [];
}

/** Returns full hour column labels (default 4 + extras) */
export function getAllHourColumnLabels(day: number): string[] {
  const base = getColumnNames(day);
  const extras = getExtraColumns(day);
  return [base.col1, base.col2, base.col3, base.col4, ...extras.map((c, i) => (c?.name || `Extra ${i + 1}`))];
}

// ─── Date Generation ─────────────────────────────────────────

/** Generates an array of Date objects from startDate to endDate */
function generateDates(): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(appState.startDate);
  const endDate = new Date(appState.endDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

/** Creates a fresh tracker data array for all days in the date range */
export function initializeData(): TrackerDay[] {
  const dates = generateDates();
  const extrasCount = (appState.settings.extraColumns || []).length;
  return dates.map((date, index) => ({
    day: index + 1,
    date: date.toISOString(),
    pythonHours: 0,
    dsaHours: 0,
    projectHours: 0,
    col4Hours: 0,
    extraHours: extrasCount > 0 ? Array.from({ length: extrasCount }, () => 0) : [],
    topics: '',
    dsaProblems: 0,
    project: '',
    completed: false,
  }));
}

/** Returns the phase CSS class for a given day number */
export function getPhase(day: number): string {
  if (day <= appState.phase1End) return 'phase-1';
  if (day <= appState.phase2End) return 'phase-2';
  return 'phase-3';
}
