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
import { getLocalIsoDate } from '@/utils/date.utils';

// --- Starting Defaults ---

function createDefaultSettings(): Settings {
  return {
    startDate: getLocalIsoDate(DEFAULT_START_DATE),
    endDate: getLocalIsoDate(DEFAULT_END_DATE),
    columns: [...DEFAULT_COLUMNS],
    customRanges: [],
    beastMode: false,
    unlockedBadges: [],
    sessionLogs: [],
    groqApiKey: '',
    maamuModel: 'openai/gpt-oss-20b',
    theme: 'stealth-midnight',
    timerStyle: 'block',
    ambientSound: 'none',
    ambientVolume: 0.5,
  };
}

/** Applies the theme class to the HTML tag */
export function applyThemeToDOM(themeName: string = 'stealth-midnight') {
  document.documentElement.setAttribute('data-theme', themeName);
}

/** Applies the timer style class to the body */
export function applyTimerStyleToDOM(timerStyle: string = 'block') {
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

// --- Reactive State Engine (Senior Developer Practice) ---

type StateListener = (path: string, value: any) => void;
const listeners = new Set<StateListener>();

/** Subscribe to state changes at the property level */
export function subscribeToState(callback: StateListener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify(path: string, value: any) {
  listeners.forEach(fn => fn(path, value));
}

const rawState = {
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

  /** Cloud-synchronized stats (Source of Truth) */
  verifiedTotalHours: 0,
  verifiedRankScore: 0,

  /** Deadline countdown interval reference */
  deadlineInterval: null as ReturnType<typeof setInterval> | null,

  // --- Dates for internal use ---
  startDate: new Date(DEFAULT_START_DATE),
  endDate: new Date(DEFAULT_END_DATE),
  totalDays: 0,
  phase1End: 0,
  phase2End: 0,
  phase3End: 0,
  
  /** Sum of all timer-verified session durations (Cloud + Local) */
  verifiedHours: 0,
};

/** 
 * 🚀 High-Fidelity Reactive State
 * Uses a Proxy to intercept writes and notify subscribers.
 */
export const appState = new Proxy(rawState, {
  set(target, prop, value) {
    const key = prop as string;
    (target as any)[key] = value;
    notify(key, value);
    return true;
  }
});

// --- Calculating Dates and Phases ---

/** Works out the total days and phase splits based on start/end dates */
export function calculateDates(): void {
  const ranges = appState.settings.customRanges;
  
  // If we have custom ranges, they drive the start/end dates
  if (ranges && ranges.length > 0) {
    const allStarts = ranges.map(r => r.startDate).filter(Boolean).sort();
    const allEnds = ranges.map(r => r.endDate).filter(Boolean).sort();
    
    if (allStarts.length > 0) {
      appState.settings.startDate = allStarts[0];
    }
    if (allEnds.length > 0) {
      appState.settings.endDate = allEnds[allEnds.length - 1];
    }
  }

  let sDate = new Date(appState.settings.startDate);
  let eDate = new Date(appState.settings.endDate);

  // Validation: Guard against 'Invalid Date' objects
  if (isNaN(sDate.getTime()) || sDate.getFullYear() < 2000) sDate = new Date(DEFAULT_START_DATE);
  if (isNaN(eDate.getTime()) || eDate.getFullYear() < 2000) eDate = new Date(DEFAULT_END_DATE);

  // Safety: Prevent impossible ranges
  if (eDate < sDate) eDate = new Date(sDate.getTime() + 86400000);

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

  // 4. Migrate Theme IDs to Professional Names
  const themeMap: Record<string, string> = {
    'kaala': 'stealth-midnight',
    'midnight': 'stealth-midnight',
    'default': 'obsidian-glass',
    'himavat': 'obsidian-glass',
    'chanakya-strategy': 'tactical-navy',
    'ayodhya': 'solar-gold',
    'kamala-grace': 'pristine-white',
    'vajra-shakti': 'quantum-purple'
  };

  if (s.theme && themeMap[s.theme]) {
    s.theme = themeMap[s.theme];
    modified = true;
  }

  // 5. Migrate Custom Ranges from Day Number to Date
  if (s.customRanges && s.customRanges.length > 0) {
    s.customRanges.forEach((range: any) => {
      if ('startDay' in range && !range.startDate) {
        // Use the global start date as the anchor for old day numbers
        const baseDate = new Date(appState.settings.startDate || DEFAULT_START_DATE);
        
        const sDate = new Date(baseDate);
        sDate.setDate(baseDate.getDate() + (range.startDay - 1));
        range.startDate = getLocalIsoDate(sDate);
        
        const eDate = new Date(baseDate);
        eDate.setDate(baseDate.getDate() + (range.endDay - 1));
        range.endDate = getLocalIsoDate(eDate);
        
        delete range.startDay;
        delete range.endDay;
        modified = true;
      }
    });
  }

  if (modified) {
    console.log('Data migration to new Theme System and Range Management completed.');
  }
}

/** Returns the study categories for a given day index */
export function getColumnsForDay(day: number): StudyCategory[] {
  const dayData = appState.trackerData[day - 1];
  if (!dayData) return appState.settings.columns || [];

  // Strip time component to ensure '2026-05-08T00:00' correctly matches '2026-05-08'
  const dateStr = dayData.date.split('T')[0];
  const hasCustomRanges = appState.settings.customRanges && appState.settings.customRanges.length > 0;

  if (hasCustomRanges) {
    for (const range of appState.settings.customRanges) {
      if (dateStr >= range.startDate && dateStr <= range.endDate) {
        return Array.isArray(range.columns) ? range.columns : [];
      }
    }
    // Strict phase enforcement: If custom ranges are used, dates outside of them get NO columns.
    return [];
  }

  // Fallback for users not using custom ranges
  return appState.settings.columns || [];
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

  // Cap timeline at 10 years (3653 days) to prevent infinite loops
  let safetyCounter = 0;
  while (currentDate <= endDate && safetyCounter < 3653) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
    safetyCounter++;
  }
  
  if (safetyCounter >= 3653) {
    console.error("[Infinite Loop Prevention]: Timeline generation capped at 10 years. Check your End Date settings.");
  }
  
  return dates;
}

/** Creates a fresh tracker data array for all days in the date range */
export function initializeData(): TrackerDay[] {
  const dates = generateDates();
  const colCount = (appState.settings.columns || []).length;
  return dates.map((date, index) => ({
    day: index + 1,
    date: getLocalIsoDate(date),
    studyHours: Array.from({ length: colCount }, () => 0),
    topics: '',
    problemsSolved: 0,
    project: '',
    completed: false,
  }));
}

/** Synchronizes the trackerData array with the current settings start/end dates, preserving data */
export function syncTrackerTimelineWithSettings(): void {
  const oldData = [...appState.trackerData];
  calculateDates();
  const newData = initializeData(); 
  
  const newStart = appState.startDate;
  const newEnd = appState.endDate;

  oldData.forEach((oldDay) => {
    const oldDate = new Date(oldDay.date);
    if (oldDate >= newStart && oldDate <= newEnd) {
      const dayIndex = Math.floor((oldDate.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < newData.length) {
        newData[dayIndex] = { ...newData[dayIndex], ...oldDay, day: dayIndex + 1 };
      }
    }
  });

  appState.trackerData = newData;
}

/** 
 * Infinite Timeline Logic
 * Ensures 'Today' always exists in the tracker data.
 * If the user hasn't opened the app in days, it auto-fills the gaps.
 */
export function ensureTimelineIntegrity(): void {
  const data = appState.trackerData;
  if (!data || data.length === 0) return;

  const lastEntry = data[data.length - 1];
  const lastDate = new Date(lastEntry.date);
  lastDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // We ensure the timeline includes Today and Tomorrow to prevent gaps at midnight
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 1);

  // RESPECT THE USER'S END DATE: Do not auto-extend past the configured End Date or Phase End
  const configuredEnd = new Date(appState.settings.endDate);
  const finalTargetDate = targetDate > configuredEnd ? configuredEnd : targetDate;

  if (lastDate < finalTargetDate) {
    console.log(`[Integrity]: Timeline check at ${new Date().toLocaleTimeString()}. Provisioning new cycle up to ${getLocalIsoDate(finalTargetDate)}...`);
    const missingDays: TrackerDay[] = [];
    let current = new Date(lastDate);
    current.setDate(current.getDate() + 1);

    while (current <= finalTargetDate) {
      const colCount = (appState.settings.columns || []).length;
      missingDays.push({
        day: data.length + missingDays.length + 1,
        date: getLocalIsoDate(current),
        studyHours: Array.from({ length: colCount }, () => 0),
        topics: '',
        problemsSolved: 0,
        project: '',
        completed: false,
      });
      current.setDate(current.getDate() + 1);
    }

    appState.trackerData = [...data, ...missingDays];
    
    calculateDates();
    import('@/services/data-bridge').then(m => m.saveTrackerDataToStorage(appState.trackerData));
  }
}

/** Returns the phase CSS class for a given day number */
export function getPhase(day: number): string {
  if (day <= appState.phase1End) return 'phase-1';
  if (day <= appState.phase2End) return 'phase-2';
  return 'phase-3';
}
