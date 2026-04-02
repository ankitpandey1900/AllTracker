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
  
  // Mentor Expansion Phase 2
  taskHealth: {
    backlog: number;
    completionRate: number;
    debtScore: number; // 0-100
    status: 'OPTIMAL' | 'STABLE' | 'WARNING' | 'CRITICAL';
  };
  routineConsistency: number; // Daily Snap
  disciplineTrend: number;    // 14-day Rolling Average
  sustainabilityScore: number; // 0-100 (Sleep/Health)
  mentorMessage: string;
  mentorPersona: string;
  actionPlan: { task: string; reason: string; priority: 'HIGH' | 'MED' | 'LOW' }[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Analyzes study patterns to generate tactical advice */
export function getTacticalBriefing(): TacticalBriefing {
  const logs = appState.settings.sessionLogs || [];
  const trackerData = appState.trackerData || [];
  const tasks = appState.tasks || [];
  const routines = appState.routines || [];
  const routineHistory = appState.routineHistory || {};

  const peakHour = calculatePeakHour(logs);
  const vulnerableDay = identifyVulnerableDay(trackerData);
  const neglectedTopic = checkTopicAttention(trackerData);
  const momentumData = calculateMomentum(trackerData);
  const taskHealth = calculateTaskHealth(tasks);
  const routineConsistency = calculateRoutineConsistency(routines);
  const disciplineTrend = calculateDisciplineTrend(routineHistory, routines.length);
  const sustainabilityScore = calculateSustainability(logs);
  
  const context = getStrategicContext(trackerData, logs, taskHealth, routineConsistency, sustainabilityScore);

  // Mentor Persona & Message Logic (V2: Professional Minimalist Tone)
  const { message, persona } = generateMentorAdvice(taskHealth, sustainabilityScore, disciplineTrend, momentumData.value);

  let insight = `Your peak performance window is around ${formatHour(peakHour)}. `;
  if (vulnerableDay) {
    insight += `Consistency typically drops on ${vulnerableDay}s.`;
  }

  let recommendation = neglectedTopic 
    ? `You've allocated time for ${neglectedTopic} but aren't giving it enough attention. Study this during your ${formatHour(peakHour)} peak to maximize output.`
    : `Keep pushing. Your next mission: maintain the ${formatHour(peakHour)} momentum.`;

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
    strategicContext: context,
    taskHealth,
    routineConsistency,
    disciplineTrend,
    sustainabilityScore,
    mentorMessage: message,
    mentorPersona: persona,
    actionPlan: generateActionPlan(tasks, neglectedTopic, peakHour)
  };
}

/** Summarizes the current state for the AI Mentor */
export function getTacticalBriefingString(): string {
  const b = getTacticalBriefing();
  
  const last7Days = (appState.trackerData || []).slice(-7).map(d => ({
    dayNumber: d.day,
    completed: d.completed,
    totalHours: (d.studyHours || []).reduce((sum, h) => sum + (h || 0), 0),
    problems: d.problemsSolved || 0,
    topics: d.topics
  }));

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = (appState.tasks || []).filter(t => !t.completed).map(t => ({
    text: t.text,
    priority: t.priority,
    overdue: t.date < todayStr
  }));

  const activeRoutines = (appState.routines || []).map(r => ({
    title: r.title,
    doneToday: r.completed
  }));

  const recentNotes = (appState.settings.sessionLogs || [])
    .slice(-10)
    .map(log => ({
      date: log.date,
      category: log.categoryName,
      duration: log.duration,
      note: log.note || "No note provided."
    }));

  return JSON.stringify({
    beastModeActive: !!appState.settings.beastMode,
    stats: {
      sustainability: `${b.sustainabilityScore}%`,
      disciplineTrend: `${b.disciplineTrend}%`,
      momentum: `${b.momentum}% (${b.momentumLabel})`,
      taskIntegrity: `${b.taskHealth.debtScore}% debt / Status: ${b.taskHealth.status}`
    },
    observations: b.strategicContext,
    vulnerabilities: {
      weakDay: b.vulnerableDay,
      neglectedTopic: b.neglectedTopic
    },
    peakWindow: b.peakHourStr,
    recentHabits_Last7Days: last7Days,
    unclearedTasks: pendingTasks,
    dailyRoutines: activeRoutines,
    recentSessionNotes: recentNotes
  }, null, 2);
}

/** Finds the most productive hour (sum of durations) */
function calculatePeakHour(logs: SessionLog[]): number {
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

/** Sustainability: Analyzes session timing for sleep hygiene (11 PM - 5 AM is risky) */
function calculateSustainability(logs: SessionLog[]): number {
  if (logs.length === 0) return 100;
  
  let riskScore = 0;
  // Scan last 15 sessions for recent behavior
  logs.slice(-15).forEach(log => {
    // Extract times. Format expected: "HH:MM AM/PM - HH:MM AM/PM"
    const times = log.timeRange.match(/(\d+):(\d+)\s*(AM|PM)/gi);
    if (!times || times.length < 2) {
      // Fallback to start hour if range parsing fails
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

    // Check if range enters 11 PM (23:00) to 5 AM (05:00)
    // Basic overlap check
    const isLate = (start >= 23 || start < 5 || end > 23 || end <= 5 || (start < 23 && end > 23));
    if (isLate) {
      riskScore += 12;
    }
  });
  
  return Math.max(10, 100 - riskScore);
}

/** 14-Day Discipline Trend: Calculates rolling average of routine completion */
function calculateDisciplineTrend(history: Record<string, number>, dailyRoutineLength: number): number {
  if (dailyRoutineLength === 0) return 100;
  
  const today = new Date();
  let totalComp = 0;
  let count = 0;

  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    if (history[dateStr] !== undefined) {
      totalComp += (history[dateStr] / dailyRoutineLength) * 100;
      count++;
    }
  }
  
  if (count === 0) return 100;
  return Math.round(totalComp / count);
}

/** Calculates task backlog and overall health */
function calculateTaskHealth(tasks: any[]): TacticalBriefing['taskHealth'] {
  const today = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => !t.completed);
  const backlog = activeTasks.filter(t => t.date < today).length;
  const todayTasks = activeTasks.filter(t => t.date === today).length;
  
  const completedToday = tasks.filter(t => t.completed && t.date === today).length;
  const totalToday = completedToday + todayTasks;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100;
  
  const debtScore = Math.min(100, (backlog * 15) + (totalToday > 0 ? (100 - completionRate) / 2 : 0));
  
  let status: TacticalBriefing['taskHealth']['status'] = 'OPTIMAL';
  if (debtScore > 70) status = 'CRITICAL';
  else if (debtScore > 40) status = 'WARNING';
  else if (debtScore > 15) status = 'STABLE';
  
  return { backlog, completionRate, debtScore, status };
}

/** Calculates today's completion percentage of daily routines */
function calculateRoutineConsistency(routines: any[]): number {
  if (routines.length === 0) return 100;
  const completed = routines.filter(r => r.completed).length;
  return Math.round((completed / routines.length) * 100);
}

function generateMentorAdvice(taskHealth: any, sustainability: number, trend: number, momentum: number): { message: string; persona: string } {
  if (sustainability < 65) {
    return {
      persona: 'THE MAAMU',
      message: `Critical Sustainability Flaw: Your recent session timing is unsustainable. Pushing past 11:00 PM creates significant cognitive debt. Excellence is built on high-fidelity recovery, not just high-intensity input. Prioritize sleep hygiene tonight.`
    };
  }
  
  if (taskHealth.status === 'CRITICAL') {
    return {
      persona: 'THE MAAMU',
      message: `System Alert: Your Task Integrity is compromised with a debt score of ${taskHealth.debtScore}%. You are losing structural control over your objectives. Stop all elective learning and clear the backlog immediately.`
    };
  }
  
  if (trend < 60) {
    return {
      persona: 'THE MAAMU',
      message: `Pattern Variance Detected: Your 14-day discipline trend is ${trend}%. Your output is volatile. A professional routine is the only path to mastery—eliminate the high-effort/low-effort oscillation.`
    };
  }
  
  if (momentum < -15) {
    return {
      persona: 'THE MAAMU',
      message: `Velocity Regression: Your momentum has cooled. This is the 'Trough of Disillusionment' where most learners regress to the mean. Refuse to be average. Restore your 100% routine adherence.`
    };
  }
  
  if (sustainability > 85 && trend > 85 && momentum > 10) {
    return {
      persona: 'THE MAAMU',
      message: `Optimal State Achieved: Core metrics indicate peak operational synergy. Your current trajectory is elite. Maintain this equilibrium between high-fidelity output and sustainable recovery.`
    };
  }
  
  return {
    persona: 'THE MAAMU',
    message: `Operational Stability Confirmed. You are meeting baseline consistency requirements. Focus on incremental focus adjustments to further improve your peak efficiency window.`
  };
}

/** Generates 3 tactical actions */
function generateActionPlan(tasks: any[], neglected: string | null, peakHour: number): TacticalBriefing['actionPlan'] {
  const plan: TacticalBriefing['actionPlan'] = [];
  const today = new Date().toISOString().split('T')[0];
  const backlogTasks = tasks.filter(t => !t.completed && t.date < today).sort((a,b) => b.priority - a.priority);
  
  if (backlogTasks.length > 0) {
    plan.push({
      task: `Clear Backlog Item: ${backlogTasks[0].text}`,
      reason: 'Reducing task debt is priority one.',
      priority: 'HIGH'
    });
  }
  
  if (neglected) {
    plan.push({
      task: `Restore focus on ${neglected}`,
      reason: `Deficit detected. Target this during your ${formatHour(peakHour)} peak.`,
      priority: 'MED'
    });
  }
  
  plan.push({
    task: 'Discipline Reset',
    reason: 'Verify remaining daily routine items to protect your 14-day trend.',
    priority: 'LOW'
  });
  
  return plan.slice(0, 3);
}

/** Finds the day of the week with the lowest completion rate */
function identifyVulnerableDay(data: TrackerDay[]): string | null {
  if (data.length < 7) return null;

  const dayMisses: Record<number, { missed: number; total: number }> = {};
  
  data.forEach(day => {
    const d = new Date(day.date).getDay();
    if (!dayMisses[d]) dayMisses[d] = { missed: 0, total: 0 };
    
    dayMisses[d].total++;
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

  const categories = appState.settings.columns || [];
  if (categories.length === 0) return null;

  const actuals: Record<string, number> = {};

  categories.forEach((cat, idx) => {
    actuals[cat.name] = data.reduce((sum, day) => sum + (day.studyHours ? (day.studyHours[idx] || 0) : 0), 0);
  });

  let mostNeglected: string | null = null;
  let maxDeficit = 0;

  categories.forEach(cat => {
    const totalTarget = cat.target * data.length;
    if (totalTarget === 0) return;
    
    const deficit = (totalTarget - actuals[cat.name]) / totalTarget;
    if (deficit > maxDeficit && deficit > 0.3) {
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
    days.reduce((sum, day) => sum + (day.studyHours || []).reduce((a: number, b: number) => a + (b || 0), 0), 0);

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

/** Generates tactical context points focusing on sustainability and trend */
export function getStrategicContext(data: TrackerDay[], logs: SessionLog[], taskHealth: any, routine: number, sustainability: number): string[] {
  const context: string[] = [];
  const peakHour = calculatePeakHour(logs);
  const momentum = calculateMomentum(data);

  context.push(`Sustainability: Monitoring health equilibrium (${sustainability}%).`);
  context.push(`Task Integrity: Backlog status is ${taskHealth.status} with debt index at ${taskHealth.debtScore}.`);
  context.push(`Daily Intensity: Current session cycle adherence at ${routine}%.`);
  
  if (data.length > 3) {
    const last3 = data.slice(-3);
    const avg3 = last3.reduce((sum, d) => sum + (d.studyHours || []).reduce((a: number, b: number) => a + (b || 0), 0), 0) / 3;
    context.push(`Efficiency Snapshot: ${avg3.toFixed(1)}h average capacity (last 72h).`);
  }

  return context;
}

function formatHour(h: number | string): string {
  const hr = parseInt(h as string);
  const suffix = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 || 12;
  return `${displayHr}:00 ${suffix}`;
}


