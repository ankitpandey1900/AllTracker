/**
 * All the 'magic values' and defaults for the app.
 * 
 * This is the central place for things like storage keys, 
 * default dates, column names, and badge rules.
 */

import type { Badge, TrackerDay } from '@/types/tracker.types';

// --- Storage Keys ---

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
  SYNC_METADATA: 'all-tracker-sync-metadata',
} as const;

// --- Default Dates ---

export const DEFAULT_START_DATE = new Date();
export const DEFAULT_END_DATE = new Date(new Date().getFullYear(), 11, 31); // End of the current year

// --- Default Study Groups ---

export const DEFAULT_COLUMNS = [
  { name: 'Python',           target: 100 },
  { name: 'DSA',              target: 150 },
  { name: 'Python(2)',        target: 80 },
  { name: 'College/Backends', target: 200 },
];

/** Colors for the different study categories in the analytics */
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

// --- Supabase Tables ---

export const SUPABASE_TABLES = {
  PROFILES: 'operative_profiles',
  STATS: 'operative_stats',
  TRACKER: 'vault_tracker',
  SETTINGS: 'vault_settings',
  ROUTINES: 'vault_routines',
  TASKS: 'vault_tasks',
  BOOKMARKS: 'vault_bookmarks',
  TIMER: 'vault_timer',
  HISTORY: 'vault_history',
  SESSIONS: 'operative_sessions',
} as const;

// --- Badge Condition Helpers ---

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

// --- Badge Rules ---

export const BADGES: Badge[] = [
  { id: 'streak_3',        name: 'Momentum Builder',  icon: '🔥', description: '3 Day Streak',         condition: (data) => getStreak(data) >= 3 },
  { id: 'streak_7',        name: 'Unstoppable',       icon: '⚡', description: '7 Day Streak',         condition: (data) => getStreak(data) >= 7 },
  { id: 'streak_30',       name: 'Code Warrior',      icon: '⚔️', description: '30 Day Streak',        condition: (data) => getStreak(data) >= 30 },
  { id: 'hours_10',        name: 'Getting Serious',   icon: '📚', description: '10 Total Hours',       condition: (data) => getTotalHours(data) >= 10 },
  { id: 'hours_50',        name: 'Deep Dive',         icon: '🌊', description: '50 Total Hours',       condition: (data) => getTotalHours(data) >= 50 },
  { id: 'hours_100',       name: 'Mastery Path',      icon: '🎓', description: '100 Total Hours',      condition: (data) => getTotalHours(data) >= 100 },
  { id: 'weekend_warrior', name: 'Weekend Warrior',   icon: '🛡️', description: 'Study on a Weekend',   condition: (data) => hasWeekendStudy(data) },
];

// --- Bookmark Folders ---

export const BOOKMARK_CATEGORIES = [
  'Development',
  'Learning',
  'Work',
  'Social',
  'Personal',
  'Random',
  'Other',
] as const;

// --- World Stage Tiers ---

export const RANK_TIERS = [
  { name: 'IRON',        min: 0,     max: 50,     color: '#71717a' },
  { name: 'BRONZE',      min: 50,    max: 200,    color: '#a85d44' },
  { name: 'SILVER',      min: 200,   max: 500,    color: '#94a3b8' },
  { name: 'GOLD',        min: 500,   max: 1000,   color: '#fbbf24' },
  { name: 'PLATINUM',    min: 1000,  max: 1750,   color: '#2dd4bf' },
  { name: 'DIAMOND',     min: 1750,  max: 3000,   color: '#60a5fa' },
  { name: 'MASTER',      min: 3000,  max: 5000,   color: '#c084fc' },
  { name: 'ETERNAL',     min: 5000,  max: 9000,   color: '#ffffff' },
  { name: 'ASCENDED',    min: 9000,  max: 14000,  color: '#ef4444' },
  { name: 'DEITY',       min: 14000, max: 20000,  color: '#f97316' },
  { name: 'SINGULARITY', min: 20000, max: 500000, color: '#000000' },
] as const;

export const TIER_TITLES: Record<string, string[]> = {
  IRON:        ['Code Neophyte', 'Syntax Shuffler', 'Bug Magnet', 'Script Scrawler', 'Debugger I'],
  BRONZE:      ['Script Kiddy', 'Function Finder', 'Loop Legate', 'Void Voyager', 'Logic Limiter'],
  SILVER:      ['Syntax Explorer', 'Class Crafter', 'Feature Fabricator', 'Async Aspirant', 'Prop Prophet'],
  GOLD:        ['Logic Weaver', 'Backend Bard', 'Git Guardian', 'Fullstack Friar', 'State Saint'],
  PLATINUM:    ['Algorithm Apprentice', 'Byte Architect', 'Vector Virtuoso', 'Kernel Knight', 'Stack Sovereign'],
  DIAMOND:     ['Binary Baron', 'Source Seer', 'Neural Nomad', 'Cloud Commander', 'The Singularity'],
  MASTER:      ['Digital Deity', 'Universal Uplink', 'Source Code Supreme', 'Data Druid', 'Memory Monarch'],
  ETERNAL:     ['ETERNAL ARCHITECT', 'THE SOURCE', 'CONSTRUCTOR OF WORLDS', 'OMNIPRESENT LOGIC', 'LIMITLESS'],
  ASCENDED:    ['VOID WALKER', 'DIMENSIONAL CODER', 'REALITY SHAPER', 'QUANTUM SYNC', 'IMMORTAL LOGIC'],
  DEITY:       ['THE ARCHITECT', 'UNIVERSE COMPILED', 'GOD-MODE ACTIVE', 'CORE OF CREATION', 'OMEGA'],
  SINGULARITY: ['POINT ZERO', 'THE ABSOLUTE', 'BEYOND TIME', 'ONE WITH THE CODE', 'NULL POINTER GOD'],
};

// --- Field Mapping ---

/** Maps CSS class names to TrackerDay property names (for table inputs) */
export const NUMBER_FIELD_MAP: Record<string, keyof TrackerDay> = {
  'topics-solved': 'problemsSolved',
};

// --- Nation Flags ---
export const NATION_FLAGS: Record<string, string> = {
  'Global': 'un',
  'India': 'in',
  'USA': 'us',
  'UK': 'gb',
  'Canada': 'ca',
  'Germany': 'de',
  'Japan': 'jp',
  'Other': 'un'
};
