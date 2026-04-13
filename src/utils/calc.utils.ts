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
export function calculateSustainability(trackerData: TrackerDay[]): { score: number; label: string; color: string; description: string } {
  const recent = trackerData.slice(-14); // Analyze last 2 weeks
  if (recent.length === 0) return { score: 100, label: 'Stable', color: '#22c55e', description: 'Mission initiated.' };

  let totalHours = 0;
  let restDays = 0;
  let consecutiveHighDays = 0;
  let maxConsecHigh = 0;

  recent.forEach(day => {
    const hours = Array.isArray(day.studyHours) ? day.studyHours.reduce((s, h) => s + (h || 0), 0) : 0;
    totalHours += hours;
    if (day.restDay || hours === 0) restDays++;
    
    if (hours > 8) {
      consecutiveHighDays++;
      if (consecutiveHighDays > maxConsecHigh) maxConsecHigh = consecutiveHighDays;
    } else {
      consecutiveHighDays = 0;
    }
  });

  const avgRecent = totalHours / 14;
  
  // Scoring Logic
  let score = 100;
  
  // Penalty for zero rest in 2 weeks
  if (restDays === 0) score -= 30;
  else if (restDays === 1) score -= 15;
  
  // Penalty for over-grinding (> 4 consecutive 8h+ days)
  if (maxConsecHigh > 4) score -= (maxConsecHigh - 4) * 15;

  // Penalty for extreme daily output (> 12h)
  const extremeDays = recent.filter(d => (Array.isArray(d.studyHours) ? d.studyHours.reduce((s, h) => s + (h || 0), 0) : 0) > 12).length;
  score -= extremeDays * 10;

  score = Math.max(0, score);

  let label = 'OPTIMAL';
  let color = '#22c55e';
  let description = 'Sustainable pace maintained.';

  if (score < 40) {
    label = 'CRITICAL';
    color = '#ef4444';
    description = 'High burnout risk. Deploy Rest Day immediately.';
  } else if (score < 70) {
    label = 'CAUTION';
    color = '#f59e0b';
    description = 'Output spike detected. Monitor energy levels.';
  } else if (avgRecent < 1) {
    label = 'COASTING';
    color = '#94a3b8';
    description = 'Mission activity below tactical threshold.';
  }

  return { score, label, color, description };
}
