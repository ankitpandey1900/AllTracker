/**
 * All Tracker Calculation Engine
 * 
 * Centralized logic for:
 * - XP & Leveling (1 Level = 10 Study Hours)
 * - Streak Tracking (Dynamic scanning with Rest-Day freeze support)
 * - Rank Tiers (Iron -> Eternal)
 * - Pace Analysis
 */

import { RANK_TIERS, TIER_TITLES } from '@/config/constants';
import type { TrackerDay, RankDetails } from '@/types/tracker.types';
import type { RoutineItem } from '@/types/routine.types';
import { formatTime12h, formatDate } from '@/utils/date.utils';
import { appState } from '@/state/app-state';

/** 
 * XP & Leveling Engine
 * 1 Level = 10 Study Hours (1000 XP)
 */
export function calculateXP(totalHours: number): { xp: number; level: number; nextLevelXP: number; progress: number } {
  const level = Math.floor(totalHours / 10) + 1;
  const hoursIntoLevel = totalHours % 10;
  const progress = (hoursIntoLevel / 10) * 100;
  const totalXP = Math.round(totalHours * 100);
  
  return { 
    xp: totalXP, 
    level, 
    nextLevelXP: 1000 - (totalXP % 1000), 
    progress 
  };
}

/** 
 * Streak Engine
 * Scans tracker data backwards to find the current active streak.
 * Supports "Rest Day" freezes (streak doesn't break, but doesn't increment).
 */
export function calculateStreak(trackerData: TrackerDay[]): number {
  if (!trackerData || trackerData.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Scan backwards from today
  for (let i = trackerData.length - 1; i >= 0; i--) {
    const day = trackerData[i];
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    // Skip future days
    if (dayDate > today) continue;

    if (day.completed) {
      streak++;
    } else if (day.restDay) {
      // Rest Day: Freeze streak (don't break, but don't increment)
      continue;
    } else {
      // If we are looking at precisely "Today", don't break yet if it's not done
      if (dayDate.getTime() === today.getTime()) continue;
      break;
    }
  }
  return streak;
}

/** 
 * Best Streak Engine
 * Scans tracker data to find the all-time highest record streak.
 */
export function calculateBestStreak(trackerData: TrackerDay[]): number {
  if (!trackerData || trackerData.length === 0) return 0;

  let maxStreak = 0;
  let running = 0;

  for (const day of trackerData) {
    if (day.completed) {
      running++;
      if (running > maxStreak) maxStreak = running;
    } else if (day.restDay) {
      // Rest day preserves streak but doesn't increment
      continue;
    } else {
      running = 0;
    }
  }
  return maxStreak;
}

/** 
 * Rank Progression Engine
 * Maps total hours to a specific competitive tier and division.
 */
export function getRankDetails(totalHours: number): RankDetails {
  for (let i = 0; i < RANK_TIERS.length; i++) {
    const tier = RANK_TIERS[i];
    if (totalHours >= tier.min && totalHours < tier.max) {
      const tierRange = tier.max - tier.min;
      const tierProgress = totalHours - tier.min;
      const divisionSize = tierRange / 5;
      const divIndex = Math.min(4, Math.floor(tierProgress / divisionSize));
      const divNames = ['V', 'IV', 'III', 'II', 'I'];
      const division = divNames[divIndex];

      const titles = TIER_TITLES[tier.name] || ['Unknown'];
      const title = titles[divIndex] || titles[0];
      const pct = Math.max(0.01, (100 * Math.exp(-totalHours / 250)));
      const worldPos = `Top ${pct < 1 ? pct.toFixed(2) : Math.round(pct)}%`;
      const tierXP = Math.round((tierProgress / tierRange) * 100);
      const level = i * 5 + divIndex + 1;

      return {
        name: tier.name,
        min: tier.min,
        max: tier.max,
        color: tier.color,
        division,
        title,
        worldPos,
        tierXP,
        level,
        absolutePos: Math.floor(40000000 / (1 + Math.pow(totalHours / 20, 1.6))),
      };
    }
  }

  // Fallback for max hours
  const last = RANK_TIERS[RANK_TIERS.length - 1];
  return {
    name: last.name,
    min: last.min,
    max: last.max,
    color: last.color,
    division: 'I',
    title: TIER_TITLES[last.name]?.[4] || 'LIMITLESS',
    worldPos: 'Top 0.01%',
    tierXP: 100,
    level: 50,
    absolutePos: 1,
  };
}

/**
 * Daily Stats Engine
 * Aggregates hours for a specific date (usually today).
 */
export function calculateTodayStudyHours(trackerData: TrackerDay[], targetDate: Date = new Date()): number {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const entry = trackerData.find(d => {
    const dDate = new Date(d.date);
    dDate.setHours(0, 0, 0, 0);
    return dDate.getTime() === target.getTime();
  });

  if (!entry || !Array.isArray(entry.studyHours)) return 0;
  return entry.studyHours.reduce((sum, h) => sum + (h || 0), 0);
}

/**
 * Lifetime Stats Engine
 * Aggregates total hours across the entire history.
 */
export function calculateTotalStudyHours(trackerData: TrackerDay[]): number {
  return trackerData.reduce((sum, d) => {
    const dayTotal = Array.isArray(d.studyHours) ? d.studyHours.reduce((s, h) => s + (h || 0), 0) : 0;
    return sum + dayTotal;
  }, 0);
}

/**
 * COMPREHENSIVE STATS ENGINE
 * Returns { totalHours, completedDays, studyDays, maxStreak } in a single pass.
 */
export function calculateSummaryStats(trackerData: TrackerDay[]): { 
  totalHours: number; 
  completedDays: number; 
  studyDays: number; 
  maxStreak: number;
} {
  let totalHours = 0;
  let completedDays = 0;
  let studyDays = 0;
  let maxStreak = 0;
  let running = 0;

  for (const day of trackerData) {
    const dayTotal = Array.isArray(day.studyHours) ? day.studyHours.reduce((s, n) => s + (n || 0), 0) : 0;
    totalHours += dayTotal;
    
    if (day.completed) {
      completedDays++;
      running++;
      if (running > maxStreak) maxStreak = running;
    } else if (day.restDay) {
      // Rest day preserves streak but doesn't increment
      continue;
    } else {
      running = 0;
    }
    
    if (dayTotal > 0) studyDays++;
  }

  return { totalHours, completedDays, studyDays, maxStreak };
}

/**
 * UNIFIED ROUTINE SCHEDULER
 * Finds the next uncompleted routine for the current day.
 */
export function getNextRoutine(routines: RoutineItem[]): { title: string; time: string } | null {
  if (!routines || routines.length === 0) return null;

  const now = new Date();
  const currentDay = now.getDay();
  const nowStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  // Filter for today's uncompleted routines
  const todayRoutines = routines.filter(r => {
    const activeToday = !r.days || r.days.length === 0 || r.days.includes(currentDay);
    return activeToday && !r.completed;
  });

  if (todayRoutines.length === 0) return null;

  // Sort by time
  const sorted = [...todayRoutines].sort((a, b) => a.time.localeCompare(b.time));

  // Find first one upcoming, or first uncompleted if all are past
  let next = sorted.find(r => r.time >= nowStr);
  if (!next) next = sorted[0];

  return {
    title: next.title,
    time: `@ ${formatTime12h(next.time)}`
  };
}

/**
 * RANK PROGRESSION ENGINE
 * Returns { current, next, percent, label } for holographic bars.
 */
export function getRankProgression(totalHours: number) {
  const levels = [
    { h: 0,    l: 'RECRUIT' },
    { h: 10,   l: 'CADET' },
    { h: 30,   l: 'PILOT' },
    { h: 70,   l: 'OFFICER' },
    { h: 150,  l: 'COMMANDER' },
    { h: 300,  l: 'CAPTAIN' },
    { h: 600,  l: 'VETERAN' },
    { h: 1200, l: 'ELITE' },
    { h: 2500, l: 'LEGEND' },
    { h: 5000, l: 'ETERNAL' },
    { h: 10000,l: 'DEITY' },
    { h: 20000,l: 'SINGULARITY' }
  ];

  let currentIdx = levels.findIndex((lv, i) => totalHours < (levels[i+1]?.h ?? Infinity));
  if (currentIdx === -1) currentIdx = levels.length - 1;

  const current = levels[currentIdx];
  const next = levels[currentIdx + 1] || current;
  
  const range = next.h - current.h;
  const progress = totalHours - current.h;
  const percent = range > 0 ? Math.min(100, (progress / range) * 100) : 100;

  return {
    current: current.l,
    next: next.l,
    percent: Math.round(percent),
    totalHours
  };
}

/** 
 * SUBJECT MASTERY AGGREGATOR
 * Returns top 3 categories by total duration across all recorded sessions.
 */
export function getTopCategories(trackerData: TrackerDay[], activeColumns: { name: string }[], limit: number = 3) {
  const categoryMap: Record<string, number> = {};

  trackerData.forEach(day => {
    if (!Array.isArray(day.studyHours)) return;
    day.studyHours.forEach((hours, i) => {
      const label = activeColumns[i]?.name;
      if (label && (hours || 0) > 0) {
        categoryMap[label] = (categoryMap[label] || 0) + (hours || 0);
      }
    });
  });

  return Object.entries(categoryMap)
    .map(([label, hours]) => ({ label, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
}

/**
 * MISSION VELOCITY ENGINE
 * Returns an array of total hours per day for the last N days.
 * Used for tactical sparklines.
 */
export function getRecentVelocity(trackerData: TrackerDay[], days: number = 14): number[] {
  const result: number[] = [];
  const start = Math.max(0, trackerData.length - days);
  for (let i = start; i < trackerData.length; i++) {
    const day = trackerData[i];
    const total = Array.isArray(day.studyHours) ? day.studyHours.reduce((s, h) => s + (h || 0), 0) : 0;
    result.push(total);
  }
  return result;
}

/**
 * SUSTAINABILITY & BURNOUT ENGINE
 * Analyzes session entropy, rest frequency, and output spikes.
 */
/**
 * INTERNAL: STRATEGIC EQUILIBRIUM ENGINE (Sustainability 2.0)
 * Calculates a multi-factor score based on consistency, momentum, and burnout risk.
 */
function evaluateStrategicEquilibrium(recent: any[]): { 
  score: number; 
  consistency: number; 
  momentum: number; 
  isVolatile: boolean;
  hasRecoveryDebt: boolean;
} {
  if (recent.length < 3) return { score: 100, consistency: 100, momentum: 1, isVolatile: false, hasRecoveryDebt: false };

  const hoursList = recent.map(day => 
    Array.isArray(day.studyHours) ? day.studyHours.reduce((s: number, h: number) => s + (h || 0), 0) : 0
  );

  const avg = hoursList.reduce((a, b) => a + b, 0) / hoursList.length;
  
  // 1. Consistency (Coefficient of Variation)
  const variance = hoursList.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / hoursList.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? stdDev / avg : 0; 
  const consistencyScore = Math.max(0, 100 - (cv * 60)); // CV of 1.0 reduces score by 60
  
  // 2. Momentum (Last 3 days vs Last 14 days)
  const last3 = hoursList.slice(-3);
  const avg3 = last3.reduce((a, b) => a + b, 0) / 3;
  const momentum = avg > 0 ? avg3 / avg : 1;

  // 3. Recovery Debt (Checks if a spike > 10h was followed by proper deload)
  let hasRecoveryDebt = false;
  const spikeIndex = hoursList.findIndex((h, i) => h > 10 && i < hoursList.length - 1);
  if (spikeIndex !== -1) {
    const postSpike = hoursList.slice(spikeIndex + 1);
    const minPost = Math.min(...postSpike);
    if (minPost > 6) hasRecoveryDebt = true; // No "deload" (<6h) after a 10h spike
  }

  // 4. Burnout Penalties (Rest & Grinding)
  let burnoutPenalty = 0;
  let restDays = 0;
  let consecutiveHigh = 0;
  let maxConsecHigh = 0;

  recent.forEach((day, i) => {
    const h = hoursList[i];
    if (day.restDay || h === 0) restDays++;
    if (h > 8) {
      consecutiveHigh++;
      if (consecutiveHigh > maxConsecHigh) maxConsecHigh = consecutiveHigh;
    } else {
      consecutiveHigh = 0;
    }
  });

  const expectedRest = Math.floor(recent.length / 7);
  if (restDays < expectedRest) burnoutPenalty += (expectedRest - restDays) * 20;
  if (maxConsecHigh > 4) burnoutPenalty += (maxConsecHigh - 4) * 15;

  // Final Equilibrium Score Calculation
  const isVolatile = cv > 0.8;
  const rawScore = (consistencyScore * 0.4) + (Math.min(100, momentum * 100) * 0.2) + (100 - burnoutPenalty);
  const finalScore = Math.max(0, Math.min(100, hasRecoveryDebt ? rawScore * 0.8 : rawScore));

  return { 
    score: finalScore, 
    consistency: consistencyScore, 
    momentum, 
    isVolatile, 
    hasRecoveryDebt 
  };
}

/**
 * SUSTAINABILITY & BURNOUT ENGINE (v2.0)
 * Strategic Equilibrium Protocol (SEP)
 */
export function calculateSustainability(trackerData: TrackerDay[]): { 
  score: number; 
  label: string; 
  color: string; 
  description: string; 
  trend: 'up' | 'down' | 'stable';
  details: { consistency: number; momentum: number; isVolatile: boolean }
} {
  const recent = trackerData.slice(-14);
  const sep = evaluateStrategicEquilibrium(recent);

  // Trend Analysis
  const last7 = trackerData.slice(-7);
  const prev7 = trackerData.slice(-14, -7);
  const sepLast = evaluateStrategicEquilibrium(last7);
  const sepPrev = evaluateStrategicEquilibrium(prev7);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (sepLast.score > sepPrev.score + 5) trend = 'up';
  else if (sepLast.score < sepPrev.score - 5) trend = 'down';

  // Industry-Standard Status Logic
  let label = 'OPTIMAL';
  let color = '#22c55e';
  let description = 'Sustainable pace maintained.';

  if (sep.score < 40) {
    label = 'CRITICAL';
    color = '#ef4444';
    description = 'High burnout risk. Deploy Rest Day immediately.';
  } else if (sep.isVolatile) {
    label = 'VOLATILE';
    color = '#f59e0b';
    description = 'Pattern unstable. Focus on consistent timing.';
  } else if (sep.momentum < 0.7) {
    label = 'DECAYING';
    color = '#f59e0b';
    description = 'Momentum loss detected. Deload recommended.';
  } else if (sep.hasRecoveryDebt) {
    label = 'DEBTED';
    color = '#f59e0b';
    description = 'Spike detected without deload. High fatigue risk.';
  } else if (sep.score > 85 && sep.consistency > 80) {
    label = 'EQUILIBRIUM';
    color = '#bc13fe'; // Elite Purple
    description = 'Elite strategic balance achieved.';
  } else if (sep.score < 70) {
    label = 'CAUTION';
    color = '#f59e0b';
    description = 'Output spike or low rest detected.';
  } else {
    // Check for low activity (Coasting)
    const avgRecent = recent.reduce((sum, day) => {
      const h = Array.isArray(day.studyHours) ? day.studyHours.reduce((s: number, h: number) => s + (h || 0), 0) : 0;
      return sum + h;
    }, 0) / 14;
    
    if (avgRecent < 1) {
      label = 'COASTING';
      color = '#94a3b8';
      description = 'Activity below tactical thresholds.';
    }
  }

  return { 
    score: sep.score, 
    label, 
    color, 
    description, 
    trend,
    details: { 
      consistency: sep.consistency, 
      momentum: sep.momentum, 
      isVolatile: sep.isVolatile 
    }
  };
}

/**
 * MISSION ETA ENGINE
 * Calculates estimated finish date based on current pace vs yesterday's pace.
 */
export function calculateEstimatedFinishWithTrend(currentDayNumber: number, completedDays: number): { date: string; trend: 'up' | 'down' | 'stable' } {
  if (currentDayNumber <= 0) return { date: 'Analyzing...', trend: 'stable' };
  if (completedDays <= 0) return { date: 'Need 1 session', trend: 'stable' };

  const pace = completedDays / currentDayNumber;
  if (pace <= 0) return { date: 'Studying...', trend: 'stable' };

  const remainingCompletions = Math.max(0, (appState.totalDays || 365) - completedDays);
  if (remainingCompletions === 0) return { date: 'Goal Completed! 🏆', trend: 'stable' };

  const daysNeeded = Math.ceil(remainingCompletions / pace);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysNeeded);

  const yesterdayDayNumber = currentDayNumber - 1;
  const wasCompletedToday = appState.trackerData[appState.trackerData.length - 1]?.completed || false;
  const yesterdayCompletedDays = wasCompletedToday ? completedDays - 1 : completedDays;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (yesterdayDayNumber > 0 && yesterdayCompletedDays > 0) {
    const yesterdayPace = yesterdayCompletedDays / yesterdayDayNumber;
    if (pace > yesterdayPace + 0.01) trend = 'up';
    else if (pace < yesterdayPace - 0.01) trend = 'down';
  }

  return { date: formatDate(eta), trend };
}

// Cached status message — only re-randomised when the pace category changes.
let _cachedStatusMsg = '';
let _cachedPaceCategory = '';

/**
 * PSYCHOLOGICAL STATUS ENGINE
 * Generates dynamic feedback based on study pace and consistency.
 */
export function getDynamicStatusMessage(currentDay: number, completedDays: number): string {
  const totalDays = appState.totalDays || 365;
  const expectedPace = currentDay / totalDays;
  const actualPace = completedDays / totalDays;
  const diff = actualPace - expectedPace;

  let category: string;
  if (diff < -0.05) category = 'behind';
  else if (diff > 0.10) category = 'ahead-high';
  else if (diff > 0) category = 'ahead-low';
  else category = 'steady';

  if (category === _cachedPaceCategory && _cachedStatusMsg) {
    return _cachedStatusMsg;
  }

  const taunts = [
    "The clock is ticking. Get moving!",
    "You're slipping behind. Pick up the pace!",
    "Another day wasted? Do it fast!",
    "Laziness is the enemy. Start now.",
    "Is this your best? Prove it.",
    "Your future self is disappointed. Fix it."
  ];

  const steadyArr = [
    "Staying consistent. Keep going.",
    "Steady progress. Don't stop.",
    "On track. Maintain the discipline.",
    "The grind continues. Stay focused."
  ];

  const appreciation = [
    "Crushing it! Keep this energy.",
    "Eternity awaits. You're ahead of schedule.",
    "Legend in the making. Exceptional work!",
    "Pure focus. Most people can't do this.",
    "Ahead of the game. Keep leading.",
    "God tier discipline. Unstoppable!"
  ];

  let msg: string;
  if (category === 'behind') msg = taunts[Math.floor(Math.random() * taunts.length)];
  else if (category === 'ahead-high') msg = appreciation[Math.floor(Math.random() * appreciation.length)];
  else if (category === 'ahead-low') msg = appreciation[Math.floor(Math.random() * 3)];
  else msg = steadyArr[Math.floor(Math.random() * steadyArr.length)];

  _cachedPaceCategory = category;
  _cachedStatusMsg = msg;
  return msg;
}
