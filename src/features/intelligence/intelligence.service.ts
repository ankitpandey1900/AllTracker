import { appState } from '@/state/app-state';
import type { SessionLog, TrackerDay, ChatSession, MentorMessage } from '@/types/tracker.types';
import { formatDateDMY } from '@/utils/date.utils';

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

/** Analyzes your study data to give you advice */
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
  const disciplineTrend = calculateDisciplineTrend(routineHistory, routines);
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

/** Gets a summary of your data for the AI to read */
export function getTacticalBriefingString(): string {
  const b = getTacticalBriefing();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIdx = appState.trackerData.findIndex(d => d.date === todayStr);
  const endIdx = todayIdx === -1 ? appState.trackerData.length : todayIdx + 1;
  const startIdx = Math.max(0, endIdx - 30); // 30 Day Snapshot

  const last30Days = appState.trackerData.slice(startIdx, endIdx).map(d => ({
    dateStr: formatDateDMY(new Date(d.date)),
    dayNumber: d.day,
    completed: d.completed,
    totalHours: (d.studyHours || []).reduce((sum, h) => sum + (h || 0), 0),
    problems: d.problemsSolved || 0,
    topics: d.topics
  }));

  const pendingTasks = (appState.tasks || []).filter(t => !t.completed).map(t => ({
    text: t.text,
    priority: t.priority,
    overdue: t.date < todayStr,
    dueDate: formatDateDMY(new Date(t.date))
  }));

  const activeRoutines = (appState.routines || []).map(r => ({
    title: r.title,
    doneToday: r.completed
  }));

  const recentNotes = (appState.settings.sessionLogs || [])
    .slice(-30)
    .map(log => ({
      date: formatDateDMY(new Date(log.date)),
      category: log.categoryName,
      duration: log.duration,
      note: log.note || "No note provided."
    }));

  const activeTimer = appState.activeTimer && appState.activeTimer.isRunning ? {
    subject: appState.activeTimer.colName,
    elapsed: Math.floor(appState.activeTimer.elapsedAcc / 60000) + "m",
    category: appState.activeTimer.category
  } : "IDLE";

  const username = localStorage.getItem('tracker_username') || "New Participant";
  
  // Re-calculate some rank info for AI context
  const totalHours = (appState.trackerData || []).reduce((sum, day) => {
    return sum + (day.studyHours || []).reduce((s, h) => s + (h || 0), 0);
  }, 0);

  return JSON.stringify({
    identity: {
      handle: "@" + username,
      totalHours: totalHours.toFixed(1),
      rank: b.strategicContext.find(s => s.includes('Rank')) || "IRON V (Pilot)"
    },
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
    activeTimer,
    recentHabits_Last30Days: last30Days, // Renamed and expanded
    unclearedTasks: pendingTasks,
    dailyRoutines: activeRoutines,
    recentSessionNotes: recentNotes
    // Bookmarks removed as requested
  }, null, 2);
}

/** Calculates your 'Peak Hour' based on when you study most */
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

/** Checks if you're overworking or sleeping late (11 PM - 5 AM is risky) */
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

/** Checks how consistent you've been with routines lately */
function calculateDisciplineTrend(history: Record<string, number>, allRoutines: any[]): number {
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
      // Find how many routines were active on that specific day
      const expectedOnDay = allRoutines.filter(r => 
        !r.days || r.days.length === 0 || r.days.includes(dayOfWeek)
      ).length;

      if (expectedOnDay > 0) {
        totalComp += (history[dateStr] / expectedOnDay) * 100;
        count++;
      }
    }
  }
  
  if (count === 0) return 100;
  return Math.round(totalComp / count);
}

/** Checks how many tasks are overdue */
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

/** Calculates today's completion percentage of daily routines (day-aware) */
function calculateRoutineConsistency(routines: any[]): number {
  if (routines.length === 0) return 100;
  
  const todayDay = new Date().getDay();
  const relevant = routines.filter(r => 
    !r.days || r.days.length === 0 || r.days.includes(todayDay)
  );

  if (relevant.length === 0) return 100;
  
  const completed = relevant.filter(r => r.completed).length;
  return Math.round((completed / relevant.length) * 100);
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
  
  // Add Rank context if possible
  const totalHours = data.reduce((sum, day) => sum + (day.studyHours || []).reduce((a: number, b: number) => a + (b || 0), 0), 0);
  context.push(`All Tracker Standing: Rank analysis active at ${totalHours.toFixed(1)} capacity.`);

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
/** Analyzes habit patterns to provide a 1-sentence Maamu-style insight */
export function getHabitPulse(): string {
  const history = appState.routineHistory || {};
  const dates = Object.keys(history).sort();
  if (dates.length < 3) return "Data streams initializing. Maintain your baseline consistency to enable pattern analysis.";

  const last7Days = dates.slice(-7);
  const completions = last7Days.map(d => history[d]);
  const avg = completions.reduce((a, b) => a + b, 0) / last7Days.length;
  
  const routines = appState.routines || [];
  const expected = routines.length;
  if (expected === 0) return "Sector is empty. Design your primary routine to begin architectural optimization.";

  const completionRate = (avg / expected) * 100;

  if (completionRate > 90) return "Exceptional Habit Fidelity. Your current structural adherence is at God-Tier levels. Maintain this frequency.";
  if (completionRate > 70) return "Operational Stability Confirmed. You are meeting baseline discipline requirements. Look for minor friction points to eliminate.";
  if (completionRate > 40) return "Pattern Oscillation Detected: Your routine adherence is volatile. Mastery requires boring, repetitive excellence, not bursts of effort.";
  
  return "Systemic Discipline Failure: Your routine integrity is compromised. Prioritize 'Easy Wins' to restore your momentum today.";
}

export function getChatSessions(): ChatSession[] {
  return appState.settings.chatSessions || [];
}

export function getActiveSession(): ChatSession | null {
  const s = appState.settings;
  if (!s.chatSessions || s.chatSessions.length === 0) return null;
  return s.chatSessions.find(sess => sess.id === s.activeSessionId) || s.chatSessions[0];
}

export function createNewSession(title: string = 'New Mission Strategy'): string {
  if (!appState.settings.chatSessions) appState.settings.chatSessions = [];
  
  const newSession: ChatSession = {
    id: 'session-' + Date.now(),
    title,
    messages: [],
    createdAt: Date.now(),
    lastActive: Date.now()
  };

  appState.settings.chatSessions.unshift(newSession); // Newest first
  appState.settings.activeSessionId = newSession.id;
  return newSession.id;
}

export function deleteSession(id: string): void {
  const s = appState.settings;
  if (!s.chatSessions) return;
  s.chatSessions = s.chatSessions.filter(sess => sess.id !== id);
  if (s.activeSessionId === id) {
    s.activeSessionId = s.chatSessions[0]?.id || '';
  }
  if (s.chatSessions.length === 0) createNewSession();
}

export function switchSession(id: string): void {
  appState.settings.activeSessionId = id;
  const session = getActiveSession();
  if (session) session.lastActive = Date.now();
}
