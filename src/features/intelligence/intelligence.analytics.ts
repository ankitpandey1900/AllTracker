import { appState } from '@/state/app-state';
import type { TrackerDay, SessionLog } from '@/types/tracker.types';

/**
 * INTELLIGENCE ANALYTICS ENGINE
 * 
 * Handles all the heavy math for momentum, discipline, and sustainability.
 */

export function calculatePeakHour(logs: SessionLog[]): number {
  if (logs.length === 0) return 6;
  const hourStats: Record<number, number> = {};
  logs.forEach(log => {
    const timeMatch = log.timeRange.match(/^(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hr = parseInt(timeMatch[1]);
      const isPM = timeMatch[3].toUpperCase() === 'PM';
      if (isPM && hr < 12) hr += 12;
      if (!isPM && hr === 12) hr = 0;
      hourStats[hr] = (hourStats[hr] || 0) + log.duration;
    }
  });
  if (Object.keys(hourStats).length === 0) return 6;
  return Object.entries(hourStats).reduce((a, b) => (b[1] > (a[1] as number) ? b : a), [-1, 0] as [any, number])[0] as unknown as number;
}

export function calculateSustainability(logs: SessionLog[]): number {
  if (logs.length === 0) return 100;
  let riskScore = 0;
  logs.slice(-15).forEach(log => {
    const times = log.timeRange.match(/(\d+):(\d+)\s*(AM|PM)/gi);
    if (!times || times.length < 2) {
      const startMatch = log.timeRange.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (startMatch) {
        let hr = parseInt(startMatch[1]);
        const isPM = startMatch[3].toUpperCase() === 'PM';
        if (isPM && hr < 12) hr += 12;
        if (!isPM && hr === 12) hr = 0;
        if (hr >= 23 || hr <= 4) riskScore += 8;
      }
      return;
    }
    const parseTo24 = (tStr: string) => {
      const m = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return 0;
      let hr = parseInt(m[1]);
      const isPM = m[3].toUpperCase() === 'PM';
      if (isPM && hr < 12) hr += 12;
      if (!isPM && hr === 12) hr = 0;
      return hr + (parseInt(m[2]) / 60);
    };
    const start = parseTo24(times[0]);
    const end = parseTo24(times[1]);
    if (start >= 23 || start < 5 || end > 23 || end <= 5 || (start < 23 && end > 23)) riskScore += 12;
  });
  return Math.max(10, 100 - riskScore);
}

export function calculateDisciplineTrend(history: Record<string, number>, allRoutines: any[]): number {
  if (allRoutines.length === 0) return 100;
  const today = new Date();
  let totalComp = 0;
  let count = 0;
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    if (history[dateStr] !== undefined) {
      const expectedOnDay = allRoutines.filter(r => !r.days || r.days.length === 0 || r.days.includes(dayOfWeek)).length;
      if (expectedOnDay > 0) {
        totalComp += (history[dateStr] / expectedOnDay) * 100;
        count++;
      }
    }
  }
  return count === 0 ? 100 : Math.round(totalComp / count);
}

export function calculateTaskHealth(tasks: any[]) {
  const today = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => !t.completed);
  const backlog = activeTasks.filter(t => t.date < today).length;
  const todayTasks = activeTasks.filter(t => t.date === today).length;
  const completedToday = tasks.filter(t => t.completed && t.date === today).length;
  const totalToday = completedToday + todayTasks;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100;
  const debtScore = Math.min(100, (backlog * 15) + (totalToday > 0 ? (100 - completionRate) / 2 : 0));
  let status: 'OPTIMAL' | 'STABLE' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  if (debtScore > 70) status = 'CRITICAL';
  else if (debtScore > 40) status = 'WARNING';
  else if (debtScore > 15) status = 'STABLE';
  return { backlog, completionRate, debtScore, status };
}

export function calculateRoutineConsistency(routines: any[]): number {
  if (routines.length === 0) return 100;
  const todayDay = new Date().getDay();
  const relevant = routines.filter(r => !r.days || r.days.length === 0 || r.days.includes(todayDay));
  if (relevant.length === 0) return 100;
  const completed = relevant.filter(r => r.completed).length;
  return Math.round((completed / relevant.length) * 100);
}

export function calculateMomentum(data: TrackerDay[]): { value: number; label: string } {
  if (data.length < 2) return { value: 0, label: 'Initializing...' };
  const last7 = data.slice(-7);
  const prev7 = data.slice(-14, -7);
  const sumHours = (days: TrackerDay[]) => days.reduce((sum, day) => sum + (day.studyHours || []).reduce((a: number, b: number) => a + (b || 0), 0), 0);
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

export function identifyVulnerableDay(data: TrackerDay[]): string | null {
  if (data.length < 7) return null;
  const dayMisses: Record<number, { missed: number; total: number }> = {};
  data.forEach(day => {
    const d = new Date(day.date).getDay();
    if (!dayMisses[d]) dayMisses[d] = { missed: 0, total: 0 };
    dayMisses[d].total++;
    if (!day.completed && !day.restDay) dayMisses[d].missed++;
  });
  const worstDayEntry = Object.entries(dayMisses).filter(([_, stats]) => stats.total > 0).reduce((a, b) => (b[1].missed / b[1].total > a[1].missed / a[1].total ? b : a), ['-1', { missed: -1, total: 1 }] as [string, any]);
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dId = parseInt(worstDayEntry[0]);
  return dId >= 0 ? DAYS[dId] : null;
}

export function checkTopicAttention(data: TrackerDay[]): string | null {
  if (data.length === 0) return null;
  const categories = appState.settings.columns || [];
  if (categories.length === 0) return null;
  const actuals: Record<string, number> = {};
  categories.forEach((cat, idx) => {
    actuals[cat.name] = data.reduce((sum, day) => sum + (day.studyHours ? (day.studyHours[idx] || 0) : 0), 0);
  });
  let mostNeglected: string | null = null;
  let maxDeficit = 0;
  const trackedDays = data.filter(d => d.studyHours && d.studyHours.some(h => (h || 0) > 0)).length;
  const elapsedDays = Math.max(7, trackedDays);
  categories.forEach(cat => {
    const totalTarget = cat.target * elapsedDays;
    if (totalTarget === 0) return;
    const deficit = (totalTarget - actuals[cat.name]) / totalTarget;
    if (deficit > maxDeficit && deficit > 0.3) {
      maxDeficit = deficit;
      mostNeglected = cat.name;
    }
  });
  return mostNeglected;
}
