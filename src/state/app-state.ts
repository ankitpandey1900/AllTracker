/**
 * The App's Memory (State).
 * 
 * Instead of having variables scattered everywhere, we keep everything 
 * in this 'appState' object. This makes it easy for any part of the 
 * app to see or change data.
 */

import type { TrackerDay, Settings, StudyCategory } from '@/types/tracker.types';
import type { ActiveTimer } from '@/types/timer.types';
import type { RoutineItem, RoutineHistory } from '@/types/routine.types';
import type { Bookmark } from '@/types/bookmark.types';
import type { StudyTask } from '@/types/task.types';
import { DEFAULT_START_DATE, DEFAULT_END_DATE, DEFAULT_COLUMNS, STORAGE_KEYS } from '@/config/constants';

// --- Starting Defaults ---

function createDefaultSettings(): Settings {
  return {
    startDate: DEFAULT_START_DATE.toISOString().split('T')[0],
    endDate: DEFAULT_END_DATE.toISOString().split('T')[0],
    columns: [...DEFAULT_COLUMNS],
    customRanges: [],
    beastMode: false,
    unlockedBadges: [],
    sessionLogs: [],
    groqApiKey: '',
    maamuModel: 'openai/gpt-oss-20b',
    theme: 'default',
    timerStyle: 'ring',
  };
}

/** Applies the theme class to the HTML tag */
export function applyThemeToDOM(themeName: string = 'default') {
  document.documentElement.setAttribute('data-theme', themeName);
}

/** Applies the timer style class to the body */
export function applyTimerStyleToDOM(timerStyle: string = 'ring') {
  document.body.classList.remove('timer-style-ring', 'timer-style-block');
  document.body.classList.add(`timer-style-${timerStyle}`);
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

// --- The Main State Object ---

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

  /** Study tasks (To-Do list) */
  tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]') as StudyTask[],

  /** Active study timer */
  activeTimer: createDefaultTimer(),

  /** Timer interval reference */
  timerInterval: null as ReturnType<typeof setInterval> | null,

  /** Deadline countdown interval reference */
  deadlineInterval: null as ReturnType<typeof setInterval> | null,

  // --- Dates for internal use ---

  startDate: new Date(DEFAULT_START_DATE),
  endDate: new Date(DEFAULT_END_DATE),
  totalDays: 0,
  phase1End: 0,
  phase2End: 0,
  phase3End: 0,
};

// --- Calculating Dates and Phases ---

/** Works out the total days and phase splits based on start/end dates */
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

/** Fixes old data formats to match the new dynamic Category system */
export function migrateDataFormat(): void {
  let modified = false;

  // Migration for Tracker Data
  appState.trackerData.forEach((day: any) => {
    // 1. Rename dsaProblems to problemsSolved
    if ('dsaProblems' in day) {
      day.problemsSolved = day.dsaProblems;
      delete day.dsaProblems;
      modified = true;
    }

    // 2. Migrate named hour columns to studyHours array
    if (!day.studyHours) {
      const hours = [
        day.pythonHours || 0,
        day.dsaHours || 0,
        day.projectHours || 0,
        day.col4Hours || 0,
      ];
      if (Array.isArray(day.extraHours)) {
        hours.push(...day.extraHours);
      }
      day.studyHours = hours;

      // Clean up old fields
      delete day.pythonHours;
      delete day.dsaHours;
      delete day.projectHours;
      delete day.col4Hours;
      delete day.extraHours;
      modified = true;
    }
  });

  // 3. Migrate Global Categories to a Default Range
  const s = appState.settings as any;
  if (s.columns && s.columns.length > 0 && (!s.customRanges || s.customRanges.length === 0)) {
    // Determine the max day
    const maxDay = appState.totalDays > 0 ? appState.totalDays : 365;
    s.customRanges = [
      {
        startDay: 1,
        endDay: maxDay,
        columns: [...s.columns]
      }
    ];
    // Keep internal columns for now to avoid breaking existing data migration, 
    // but clear them after confirm
  }

  // 4. Migrate Theme IDs
  if (s.theme === 'midnight') {
    s.theme = 'kaala';
    modified = true;
  }
  if (s.theme === 'himavat') {
    s.theme = 'default';
    modified = true;
  }

  if (modified) {
    console.log('Data migration to new Theme System and Range Management completed.');
  }
}

/** Returns the study categories for a given day (custom range overrides first) */
export function getColumnsForDay(day: number): StudyCategory[] {
  for (const range of appState.settings.customRanges) {
    if (day >= range.startDay && day <= range.endDay) {
      return Array.isArray(range.columns) ? range.columns : [];
    }
  }
  return []; // No range, no categories.
}

/** Returns full hour column labels */
export function getAllHourColumnLabels(day: number): string[] {
  const cols = getColumnsForDay(day);
  return cols.map((c) => c.name);
}

// --- Building the Calendar ---

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
  const colCount = (appState.settings.columns || []).length;
  return dates.map((date, index) => ({
    day: index + 1,
    date: date.toISOString(),
    studyHours: Array.from({ length: colCount }, () => 0),
    topics: '',
    problemsSolved: 0,
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
