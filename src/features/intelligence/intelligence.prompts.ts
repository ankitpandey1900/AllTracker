/**
 * INTELLIGENCE PROMPTS & MESSAGES
 * 
 * Handles the AI's 'Vocabulary' and the JSON context generation.
 */

export function generateMentorAdvice(taskHealth: any, sustainability: number, trend: number, momentum: number, vulnerableDay: string | null, neglectedTopic: string | null): { message: string; persona: string } {
  const p = 'MAAMU (Professional Strategy Coach)';

  if (sustainability < 55) {
    return {
      persona: p,
      message: `Sustainability is currently ${sustainability}%. Your workload may not be recoverable at this pace. Prioritize sleep, reduce intensity for the next session, and focus on consistency over volume.`
    };
  }
  
  if (taskHealth.status === 'CRITICAL' || taskHealth.debtScore > 70) {
    return {
      persona: p,
      message: `Task debt is elevated at ${taskHealth.debtScore}%. Clear overdue items first, then execute today’s priorities in order of impact.`
    };
  }
  
  if (trend < 45) {
    return {
      persona: p,
      message: `14-day discipline is ${trend}%, which indicates unstable execution. A fixed daily minimum and end-of-day review will improve reliability.`
    };
  }
  
  if (momentum < -15) {
    return {
      persona: p,
      message: `Momentum is ${momentum}%, indicating a downward trend. Adjust your next 7 days with smaller but non-negotiable study blocks to reverse drift quickly.`
    };
  }
  
  if (sustainability > 88 && trend > 88 && momentum > 20) {
    return {
      persona: p,
      message: `Performance indicators are strong: sustainability, discipline, and momentum are all healthy. Maintain your current routine and increase difficulty gradually to avoid regression.`
    };
  }
  if (neglectedTopic) {
    return {
      persona: p,
      message: `Coverage gap detected in '${neglectedTopic}'. Allocate a focused block this week to restore balanced progress across subjects.`
    };
  }

  if (vulnerableDay) {
    return {
      persona: p,
      message: `Pattern detected: consistency drops on ${vulnerableDay}s. Schedule a shorter, guaranteed session on that day to protect your weekly rhythm.`
    };
  }
  
  return {
    persona: p,
    message: `System performance is stable. ${momentum > 0 ? 'Momentum is improving; keep your process steady.' : 'Focus on measurable output and avoid plan-only days.'} Consistent execution remains the priority.`
  };
}

export function generateActionPlan(tasks: any[], neglected: string | null, peakHourStr: string): { task: string; reason: string; priority: 'HIGH' | 'MED' | 'LOW' }[] {
  const plan: any[] = [];
  const today = new Date().toISOString().split('T')[0];
  const backlogTasks = tasks.filter(t => !t.completed && t.date < today).sort((a,b) => b.priority - a.priority);
  if (backlogTasks.length > 0) {
    plan.push({ task: `Clear overdue task: ${backlogTasks[0].text}`, reason: 'Reducing overdue debt prevents rollover and improves execution quality.', priority: 'HIGH' });
  }
  if (neglected) {
    plan.push({ task: `Restore focus on ${neglected}`, reason: `Coverage deficit detected. Schedule this during your ${peakHourStr} peak window.`, priority: 'MED' });
  }
  plan.push({ task: 'Daily consistency check', reason: 'Review remaining routine items and close at least one high-value objective today.', priority: 'LOW' });
  return plan.slice(0, 3);
}

export function buildDeepContextJSON(data: {
  username: string;
  totalHours: number;
  rank: string;
  briefing: any;
  trackerData: any[];
  sessionLogs: any[];
  tasks: any[];
  routines: any[];
  activeTimer: any;
  beastModeActive: boolean;
  leaderboard: any;
}): string {
  // Use local ISO date (YYYY-MM-DD) to prevent timezone bugs for night-owls
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const pastData = data.trackerData.filter(d => {
    try {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      const dStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`;
      return dStr <= todayStr;
    } catch {
      return false; // ignore invalid dates
    }
  });

  // 1. Hybrid History: Last 30 days daily (tracker grid hours)
  const last30Days = pastData.slice(-30).map(d => {
    const dt = new Date(d.date);
    const dtStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return {
      dt: dtStr,
      h: (d.studyHours || []).reduce((s: number, h: number) => s + (h || 0), 0),
      c: d.completed ? 1 : 0
    };
  });

  // Older data -> Weekly summaries (7-day buckets)
  const olderData = pastData.slice(0, -30);
  const weeklySummaries: any[] = [];
  for (let i = 0; i < olderData.length; i += 7) {
    const week = olderData.slice(i, i + 7);
    const totalH = week.reduce((s, d) => s + (d.studyHours || []).reduce((sh: number, h: number) => sh + (h || 0), 0), 0);
    const avgH = totalH / week.length;
    weeklySummaries.push({ w: Math.floor(i / 7) + 1, h: avgH.toFixed(1) });
  }

  // 2. Real session logs: group by date for the last 30 days
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  
  const sessionByDate: Record<string, { mins: number; cats: string[] }> = {};
  (data.sessionLogs || []).forEach((log: any) => {
    if (!log.date || log.date < cutoffStr) return;
    if (!sessionByDate[log.date]) sessionByDate[log.date] = { mins: 0, cats: [] };
    sessionByDate[log.date].mins += Math.round((log.duration || 0) * 60);
    if (log.categoryName && !sessionByDate[log.date].cats.includes(log.categoryName)) {
      sessionByDate[log.date].cats.push(log.categoryName);
    }
  });
  const sessions30d = Object.entries(sessionByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, v]) => ({ date, mins: v.mins, cats: v.cats.join(',') }));

  // 3. Total hours from real sessions (source of truth)
  const realTotalMins = (data.sessionLogs || []).reduce((s: number, l: any) => s + Math.round((l.duration || 0) * 60), 0);

  // 4. Pending vs overdue task split (Top 10 each)
  const priorityMap: Record<number, string> = { 1: 'L', 2: 'M', 3: 'H' };
  const pendingCount = data.tasks.filter(t => !t.completed).length;
  const overdueCount = data.tasks.filter(t => !t.completed && t.date < todayStr).length;
  const pendingTasks = data.tasks
    .filter(t => !t.completed)
    .sort((a, b) => (b.priority || 1) - (a.priority || 1))
    .slice(0, 10)
    .map(t => `[${priorityMap[t.priority as number] || 'M'}] ${t.text}`);
  const overdueTasks = data.tasks
    .filter(t => !t.completed && t.date < todayStr)
    .sort((a, b) => (b.priority || 1) - (a.priority || 1))
    .slice(0, 10)
    .map(t => `[${priorityMap[t.priority as number] || 'M'}] ${t.text}`);

  // 5. Routines with Streaks
  const routinesContext = data.routines.slice(0, 8).map(r => ({
    t: r.title,
    d: r.completed,
    s: r.streak || 0 // pass the streak!
  }));

  return JSON.stringify({
    user: { 
      handle: "@" + data.username, 
      total_hours_grid: data.totalHours.toFixed(1), 
      verified_mins_timer: realTotalMins,
      verified_hours_timer: (realTotalMins / 60).toFixed(2),
      timer_logs_count: (data.sessionLogs || []).length,
      timer_data_available: realTotalMins > 0,
      rank: data.rank 
    },
    beast: data.beastModeActive,
    st: { 
      s: data.briefing.sustainabilityScore, 
      d: data.briefing.disciplineTrend, 
      m: data.briefing.momentumLabel 
    },
    hist: { 
      daily_30d: last30Days,
      weekly_old: weeklySummaries 
    },
    sessions_30d: sessions30d,
    tasks: {
      pending_count: pendingCount,
      overdue_count: overdueCount,
      pending_top: pendingTasks,
      overdue_top: overdueTasks
    },
    rout: routinesContext,
    lb: data.leaderboard,
    tmr: data.activeTimer
  });
}
