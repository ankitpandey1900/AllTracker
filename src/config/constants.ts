/**
 * Application constants
 *
 * Central place for all magic values, storage keys, default dates,
 * column names, and badge definitions.
 */

import type { Badge, TrackerDay } from '@/types/tracker.types';

// ─── Storage Keys ────────────────────────────────────────────

export const STORAGE_KEYS = {
  TRACKER_DATA: 'programmingTrackerData',
  SETTINGS: 'programmingTrackerSettings',
  TIMER: 'programmingTrackerTimer',
  ROUTINES: 'studyTrackerRoutine',
  ROUTINE_HISTORY: 'studyTrackerRoutineHistory',
  ROUTINE_RESET: 'studyTrackerLastReset',
  BOOKMARKS: 'studyTrackerBookmarks',
  SYNC_ID: 'tracker_sync_id',
  DEADLINE: 'trackerDeadline',
  DEADLINE_TITLE: 'trackerDeadlineTitle',
  SESSION_GOAL: 'trackerSessionGoal',
  TASKS: 'studyTrackerTasks',
  USER_PROFILE: 'studyTrackerUserProfile',
} as const;

// ─── Default Dates ───────────────────────────────────────────

export const DEFAULT_START_DATE = new Date('2026-01-13');
export const DEFAULT_END_DATE = new Date('2026-12-31');

// ─── Default Column Names ────────────────────────────────────

export const DEFAULT_COLUMNS = [
  { name: 'Python',           target: 100 },
  { name: 'DSA',              target: 150 },
  { name: 'Python(2)',        target: 80 },
  { name: 'College/Backends', target: 200 },
];

/** Shared palette for dashboard analytics and category tokens. Index-aligned. */
export const CATEGORY_COLORS = [
  '#2dd4bf', // Teal (accent-teal)
  '#60a5fa', // Blue (accent-blue)
  '#818cf8', // Indigo (accent-purple)
  '#fbbf24', // Amber (accent-gold)
  '#f87171', // Red (accent-red)
  '#22d3ee', // Cyan
  '#c084fc', // Purple
  '#f472b6', // Pink
];

// ─── Supabase Table Names ────────────────────────────────────

export const SUPABASE_TABLES = {
  TRACKER_DATA: 'tracker_data',
  SETTINGS: 'settings',
  ROUTINES: 'routines',
  BOOKMARKS: 'bookmarks',
  ROUTINE_HISTORY: 'routine_history',
  TIMER_STATE: 'timer_state',
  ROUTINE_RESET: 'routine_reset',
  TASKS: 'tasks',
  GLOBAL_PROFILES: 'global_profiles',
} as const;

// ─── Helper functions needed by badge conditions ─────────────

function getStreak(data: TrackerDay[]): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].completed) {
      streak++;
    } else {
      const dayDate = new Date(data[i].date);
      dayDate.setHours(0, 0, 0, 0);
      if (dayDate >= today) continue;
      break;
    }
  }
  return streak;
}

function getTotalHours(data: TrackerDay[]): number {
  return data.reduce(
    (sum, day) =>
      sum + (Array.isArray(day.studyHours) ? day.studyHours.reduce((s, n) => s + (n || 0), 0) : 0),
    0,
  );
}

function hasWeekendStudy(data: TrackerDay[]): boolean {
  return data.some((d) => {
    const date = new Date(d.date);
    const dayOfWeek = date.getDay();
    const hours = Array.isArray(d.studyHours) ? d.studyHours.reduce((s, n) => s + (n || 0), 0) : 0;
    return (dayOfWeek === 0 || dayOfWeek === 6) && hours > 0;
  });
}

// ─── Badge Definitions ───────────────────────────────────────

export const BADGES: Badge[] = [
  { id: 'streak_3',        name: 'Momentum Builder',  icon: '🔥', description: '3 Day Streak',         condition: (data) => getStreak(data) >= 3 },
  { id: 'streak_7',        name: 'Unstoppable',       icon: '⚡', description: '7 Day Streak',         condition: (data) => getStreak(data) >= 7 },
  { id: 'streak_30',       name: 'Code Warrior',      icon: '⚔️', description: '30 Day Streak',        condition: (data) => getStreak(data) >= 30 },
  { id: 'hours_10',        name: 'Getting Serious',   icon: '📚', description: '10 Total Hours',       condition: (data) => getTotalHours(data) >= 10 },
  { id: 'hours_50',        name: 'Deep Dive',         icon: '🌊', description: '50 Total Hours',       condition: (data) => getTotalHours(data) >= 50 },
  { id: 'hours_100',       name: 'Mastery Path',      icon: '🎓', description: '100 Total Hours',      condition: (data) => getTotalHours(data) >= 100 },
  { id: 'weekend_warrior', name: 'Weekend Warrior',   icon: '🛡️', description: 'Study on a Weekend',   condition: (data) => hasWeekendStudy(data) },
];

// ─── Bookmark Categories ─────────────────────────────────────

export const BOOKMARK_CATEGORIES = [
  'Development',
  'Learning',
  'Work',
  'Social',
  'Personal',
  'Random',
  'Other',
] as const;

// ─── Rank System Tiers ───────────────────────────────────────

export const RANK_TIERS = [
  { name: 'IRON',        min: 0,    max: 50,     color: '#71717a' },
  { name: 'BRONZE',      min: 50,   max: 150,    color: '#a85d44' },
  { name: 'SILVER',      min: 150,  max: 350,    color: '#94a3b8' },
  { name: 'GOLD',        min: 350,  max: 650,    color: '#fbbf24' },
  { name: 'PLATINUM',    min: 650,  max: 1050,   color: '#2dd4bf' },
  { name: 'DIAMOND',     min: 1050, max: 1650,   color: '#60a5fa' },
  { name: 'MASTER',      min: 1650, max: 2450,   color: '#c084fc' },
  { name: 'GRANDMASTER', min: 2450, max: 3450,   color: '#f43f5e' },
  { name: 'CHALLENGER',  min: 3450, max: 5000,   color: '#fb923c' },
  { name: 'ETERNAL',     min: 5000, max: 100000, color: '#ffffff' },
] as const;

export const TIER_TITLES: Record<string, string[]> = {
  IRON:        ['Code Neophyte', 'Syntax Shuffler', 'Bug Magnet', 'Script Scrawler', 'Debugger I'],
  BRONZE:      ['Script Kiddy', 'Function Finder', 'Loop Legate', 'Void Voyager', 'Logic Limiter'],
  SILVER:      ['Syntax Explorer', 'Class Crafter', 'Feature Fabricator', 'Async Aspirant', 'Prop Prophet'],
  GOLD:        ['Logic Weaver', 'Backend Bard', 'Git Guardian', 'Fullstack Friar', 'State Saint'],
  PLATINUM:    ['Algorithm Apprentice', 'Byte Architect', 'Vector Virtuoso', 'Kernel Knight', 'Stack Sovereign'],
  DIAMOND:     ['Binary Baron', 'Source Seer', 'Neural Nomad', 'Cloud Commander', 'The Singularity'],
  MASTER:      ['Digital Deity', 'Universal Uplink', 'Source Code Supreme', 'Data Druid', 'Memory Monarch'],
  GRANDMASTER: ['Reality Rewriter', 'Protocol Paladin', 'V8 Vanguard', 'Silicon Sovereign', 'Quantum Master'],
  CHALLENGER:  ['Kernel Overlord', 'Transcendent Architect', 'System Sage', 'Binary Wraith', 'God-Tier Dev'],
  ETERNAL:     ['ETERNAL ARCHITECT', 'THE SOURCE', 'CONSTRUCTOR OF WORLDS', 'OMNIPRESENT LOGIC', 'LIMITLESS'],
};

// ─── Field Mappings ──────────────────────────────────────────

/** Maps CSS class names to TrackerDay property names (for table inputs) */
export const NUMBER_FIELD_MAP: Record<string, keyof TrackerDay> = {
  'topics-solved': 'problemsSolved',
};


