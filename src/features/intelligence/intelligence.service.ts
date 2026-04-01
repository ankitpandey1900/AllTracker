import { appState } from '@/state/app-state';
import type { SessionLog, TrackerDay } from '@/types/tracker.types';

export interface TacticalBriefing {
  peakHour: number;
  peakHourStr: string;
  vulnerableDay: string;
  neglectedTopic: string | null;
  insight: string;
  recommendation: string;
  momentum: number;
  momentumLabel: string;
  strategicContext: string[];
}

export interface PeakHourMatrixItem {
  hour: number;
  hourStr: string;
  duration: number;
  percentage: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Analyzes study patterns to generate tactical advice */
export function getTacticalBriefing(): TacticalBriefing {
  const logs = appState.settings.sessionLogs || [];
  const trackerData = appState.trackerData || [];

  const peakHour = calculatePeakHour(logs);
  const vulnerableDay = identifyVulnerableDay(trackerData);
  const neglectedTopic = checkTopicAttention(trackerData);
  const momentumData = calculateMomentum(trackerData);
  const context = getStrategicContext(trackerData, logs);

  let insight = `Your peak performance window is around ${formatHour(peakHour)}. `;
  if (vulnerableDay) {
    insight += `Consistency typically drops on ${vulnerableDay}s.`;
  }

  let recommendation = neglectedTopic 
    ? `You've allocated time for ${neglectedTopic} but aren't giving it enough attention. Study this during your ${formatHour(peakHour)} peak to maximize output.`
    : `Keep pushing. Your next mission: maintain the ${formatHour(peakHour)} momentum.`;

  // Special Tuesday handling as per user's example if detected
  if (vulnerableDay === 'Tuesday') {
    recommendation = `Prepare a 15-min Routine 'Quick Mission' for Tuesday to protect your streak.`;
  }

  return {
    peakHour,
    peakHourStr: formatHour(peakHour),
    vulnerableDay: vulnerableDay || 'None',
    neglectedTopic,
    insight,
    recommendation,
    momentum: momentumData.value,
    momentumLabel: momentumData.label,
    strategicContext: context
  };
}

/** Finds the most productive hour (sum of durations) */
function calculatePeakHour(logs: SessionLog[]): number {
  if (logs.length === 0) return 6; // Default to morning bird

  const hourStats: Record<number, number> = {};
  logs.forEach(log => {
    const startHour = parseInt(log.timeRange.split(':')[0]);
    if (!isNaN(startHour)) {
      hourStats[startHour] = (hourStats[startHour] || 0) + log.duration;
    }
  });

  return Object.entries(hourStats).reduce((a, b) => (b[1] > a[1] ? b : a), ['6', 0] as [string, number])[0] as unknown as number;
}

/** Calculates the 24-hour study distribution for visualization */
export function calculatePeakHourMatrix(): PeakHourMatrixItem[] {
  const logs = appState.settings.sessionLogs || [];
  const hourMap: Record<number, number> = {};
  
  // Init 24 hours
  for (let i = 0; i < 24; i++) hourMap[i] = 0;

  logs.forEach(log => {
    const startHour = parseInt(log.timeRange.split(':')[0]);
    if (!isNaN(startHour)) {
      hourMap[startHour] += log.duration;
    }
  });

  const maxDuration = Math.max(...Object.values(hourMap), 1);
  
  return Object.entries(hourMap).map(([h, duration]) => {
    const hour = parseInt(h);
    return {
      hour,
      hourStr: formatHour(hour),
      duration,
      percentage: (duration / maxDuration) * 100
    };
  });
}

/** Finds the day of the week with the lowest completion rate */
function identifyVulnerableDay(data: TrackerDay[]): string | null {
  if (data.length < 7) return null;

  const dayMisses: Record<number, { missed: number; total: number }> = {};
  
  data.forEach(day => {
    const d = new Date(day.date).getDay();
    if (!dayMisses[d]) dayMisses[d] = { missed: 0, total: 0 };
    
    dayMisses[d].total++;
    // If not completed and not a rest day, it's a "miss"
    if (!day.completed && !day.restDay) {
      dayMisses[d].missed++;
    }
  });

  const worstDayEntry = Object.entries(dayMisses)
    .filter(([_, stats]) => stats.total > 0)
    .reduce((a, b) => (b[1].missed / b[1].total > a[1].missed / a[1].total ? b : a), ['-1', { missed: -1, total: 1 }] as [string, any]);

  const dId = parseInt(worstDayEntry[0]);
  return dId >= 0 ? DAYS[dId] : null;
}

/** Compares targeted vs actual study hours */
function checkTopicAttention(data: TrackerDay[]): string | null {
  if (data.length === 0) return null;

  // Get current categories from settings
  const categories = appState.settings.columns || [];
  if (categories.length === 0) return null;

  const actuals: Record<string, number> = {};
  const targets: Record<string, number> = {};

  categories.forEach((cat, idx) => {
    targets[cat.name] = cat.target;
    actuals[cat.name] = data.reduce((sum, day) => sum + (day.studyHours[idx] || 0), 0);
  });

  // Find the one with the biggest relative deficit
  let mostNeglected: string | null = null;
  let maxDeficit = 0;

  categories.forEach(cat => {
    const totalTarget = cat.target * data.length;
    if (totalTarget === 0) return;
    
    const deficit = (totalTarget - actuals[cat.name]) / totalTarget;
    if (deficit > maxDeficit && deficit > 0.3) { // Threshold: 30% behind
      maxDeficit = deficit;
      mostNeglected = cat.name;
    }
  });

  return mostNeglected;
}

/** Determines study momentum: last 7 days vs previous 7 days */
export function calculateMomentum(data: TrackerDay[]): { value: number; label: string } {
  if (data.length < 2) return { value: 0, label: 'Initializing...' };

  const last7 = data.slice(-7);
  const prev7 = data.slice(-14, -7);

  const sumHours = (days: TrackerDay[]) => 
    days.reduce((sum, day) => sum + (day.studyHours || []).reduce((a, b) => a + (b || 0), 0), 0);

  const lastSum = sumHours(last7);
  const prevSum = sumHours(prev7);

  if (prevSum === 0) return { value: lastSum > 0 ? 100 : 0, label: 'New Streak 🚀' };

  const velocity = ((lastSum - prevSum) / prevSum) * 100;
  let label = 'Stable Momentum';
  if (velocity > 15) label = 'Trending Up 🚀';
  if (velocity > 40) label = 'Beast Mode Active 🔥';
  if (velocity < -15) label = 'Slowing Down ⚠️';
  if (velocity < -40) label = 'Mission at Risk 🚨';

  return { value: Math.round(velocity), label };
}

/** Generates 3 tactical context points based on data */
export function getStrategicContext(data: TrackerDay[], logs: SessionLog[]): string[] {
  const context: string[] = [];
  const peakHour = calculatePeakHour(logs);
  const momentum = calculateMomentum(data);

  context.push(`Velocity: ${momentum.value > 0 ? '+' : ''}${momentum.value}% Momentum Gain`);
  context.push(`Peak Window: ${formatHour(peakHour)} is your most effective session.`);
  
  if (data.length > 3) {
    const last3 = data.slice(-3);
    const avg3 = last3.reduce((sum, d) => sum + (d.studyHours || []).reduce((a, b) => a + (b || 0), 0), 0) / 3;
    context.push(`Active Pace: ${avg3.toFixed(1)} hrs/day average (last 72h).`);
  }

  return context;
}

function formatHour(h: number | string): string {
  const hr = parseInt(h as string);
  const suffix = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 || 12;
  return `${displayHr}:00 ${suffix}`;
}
