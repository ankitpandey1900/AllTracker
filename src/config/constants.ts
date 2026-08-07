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

export const DEFAULT_START_DATE = new Date(new Date().getFullYear(), 0, 1); // Jan 1st
export const DEFAULT_END_DATE = new Date(new Date().getFullYear(), 11, 31); // Dec 31st

// --- Default Study Groups ---

export const DEFAULT_COLUMNS = [
  // Empty by default as per user request
];

/** Colors for the different study categories in the analytics */
export const CATEGORY_COLORS = [
  '#2dd4bf', // Teal
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#8b5cf6', // purple
  '#f97316', // Orange
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#6366f1', // Indigo
];

// --- Database Registry (Internal Metadata) ---
// Note: These are for server-side mapping and documentation only.
// The frontend interacts via secure API routes.

// --- Badge Condition Helpers ---

function getStreak(data: TrackerDay[]): number {
  let streak = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = data.length - 1; i >= 0; i--) {
    const day = data[i];
    if (day.completed || day.restDay) {
      streak++;
    } else {
      // If it's today and not completed yet, don't break the streak
      if (day.date >= todayStr) continue;
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
  // --- Early Game (Easy Dopamine Hits) ---
  { id: 'streak_3', name: 'Momentum Builder', icon: '🔥', description: '3 Day Streak', condition: (data) => getStreak(data) >= 3 },
  { id: 'hours_10', name: 'Getting Serious', icon: '📚', description: '10 Total Hours', condition: (data) => getTotalHours(data) >= 10 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', icon: '🛡️', description: 'Study on a Weekend', condition: (data) => hasWeekendStudy(data) },
  { id: 'iron_will', name: 'Strategic Rest', icon: '🔋', description: 'Used a Rest Day', condition: (data) => data.some((d) => d.restDay === true) },
  { id: 'streak_7', name: 'Unstoppable', icon: '⚡', description: '7 Day Streak', condition: (data) => getStreak(data) >= 7 },
  
  // --- Mid Game (Building Habits) ---
  { id: 'problem_solver', name: 'Problem Solver', icon: '🧩', description: '10+ Problems in a Day', condition: (data) => data.some((d) => (d.problemsSolved || 0) >= 10) },
  { id: 'streak_14', name: 'Consistency King', icon: '👑', description: '14 Day Streak', condition: (data) => getStreak(data) >= 14 },
  { id: 'hours_50', name: 'Deep Dive', icon: '🌊', description: '50 Total Hours', condition: (data) => getTotalHours(data) >= 50 },
  { id: 'overachiever', name: 'Overachiever', icon: '🚀', description: '8+ Hours in a Day', condition: (data) => data.some((d) => (Array.isArray(d.studyHours) ? d.studyHours.reduce((s, n) => s + (n || 0), 0) : 0) >= 8) },
  
  // --- Late Game (Serious Dedication) ---
  { id: 'streak_30', name: 'Code Warrior', icon: '⚔️', description: '30 Day Streak', condition: (data) => getStreak(data) >= 30 },
  { id: 'problems_100', name: 'Algorithm Master', icon: '🧠', description: '100 Problems Solved', condition: (data) => data.reduce((s, d) => s + (d.problemsSolved || 0), 0) >= 100 },
  { id: 'hours_100', name: 'Mastery Path', icon: '🎓', description: '100 Total Hours', condition: (data) => getTotalHours(data) >= 100 },
  { id: 'streak_50', name: 'Unbroken', icon: '💎', description: '50 Day Streak', condition: (data) => getStreak(data) >= 50 },
  { id: 'hours_250', name: 'Dedicated', icon: '💡', description: '250 Total Hours', condition: (data) => getTotalHours(data) >= 250 },
  
  // --- End Game (Legends Only) ---
  { id: 'streak_100', name: 'Centennial', icon: '🏆', description: '100 Day Streak', condition: (data) => getStreak(data) >= 100 },
  { id: 'problems_500', name: 'Consistent Coder', icon: '💻', description: '500 Problems Solved', condition: (data) => data.reduce((s, d) => s + (d.problemsSolved || 0), 0) >= 500 },
  { id: 'hours_500', name: 'Elite Status', icon: '🏅', description: '500 Total Hours', condition: (data) => getTotalHours(data) >= 500 },
  { id: 'hours_1000', name: 'Living Legend', icon: '♾️', description: '1000 Total Hours', condition: (data) => getTotalHours(data) >= 1000 },
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
  { name: 'RECRUIT', min: 0, max: 10, color: '#71717a' },
  { name: 'CADET', min: 10, max: 30, color: '#94a3b8' },
  { name: 'PILOT', min: 30, max: 70, color: '#60a5fa' },
  { name: 'OFFICER', min: 70, max: 150, color: '#818cf8' },
  { name: 'COMMANDER', min: 150, max: 300, color: '#c084fc' },
  { name: 'CAPTAIN', min: 300, max: 600, color: '#fbbf24' },
  { name: 'VETERAN', min: 600, max: 1200, color: '#f59e0b' },
  { name: 'ELITE', min: 1200, max: 2500, color: '#ef4444' },
  { name: 'LEGEND', min: 2500, max: 5000, color: '#ffffff' },
  { name: 'ETERNAL', min: 5000, max: 10000, color: '#bc13fe' },
  { name: 'DEITY', min: 10000, max: 20000, color: '#f97316' },
  { name: 'SINGULARITY', min: 20000, max: 500000, color: '#000000' },
] as const;

export const TIER_TITLES: Record<string, string[]> = {
  RECRUIT: ['Code Initiate', 'Syntax Student', 'Drafted Operative', 'Logic Learner', 'Script Rookie'],
  CADET: ['Junior Developer', 'Function Explorer', 'Module Miner', 'Bug Hunter', 'Component Crafter'],
  PILOT: ['System Navigator', 'Feature Pilot', 'Interface Engineer', 'Logic Leader', 'Vector Voyager'],
  OFFICER: ['Strategic Coder', 'Command Center Lead', 'Architecture Officer', 'Deploy Specialist', 'Data Guardian'],
  COMMANDER: ['Fleet Architect', 'Legacy Leader', 'System Commander', 'Refactor Regent', 'Nexus Knight'],
  CAPTAIN: ['Project Captain', 'Source Sovereign', 'Master Maintainer', 'Execution Expert', 'Binary Baron'],
  VETERAN: ['Hardened Coder', 'Optimization Expert', 'Battle-Tested dev', 'Code Sentinel', 'Legacy Warden'],
  ELITE: ['Tactical Architect', 'Precision Engineer', 'High-Octane Coder', 'System Specialist', 'Elite Operative'],
  LEGEND: ['LIVING LEGEND', 'ARCHITECT OF LIGHT', 'SOURCE SEEKER', 'IMMORTAL LOGIC', 'UNSTOPPABLE'],
  ETERNAL: ['ETERNAL ARCHITECT', 'THE SOURCE', 'CONSTRUCTOR OF WORLDS', 'OMNIPRESENT LOGIC', 'LIMITLESS'],
  DEITY: ['THE ARCHITECT', 'UNIVERSE COMPILED', 'GOD-MODE ACTIVE', 'CORE OF CREATION', 'OMEGA'],
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
