/**
 * INTELLIGENCE PROMPTS & MESSAGES
 * 
 * Handles the AI's 'Vocabulary' and the JSON context generation.
 */

export function generateMentorAdvice(taskHealth: any, sustainability: number, trend: number, momentum: number, vulnerableDay: string | null, neglectedTopic: string | null): { message: string; persona: string } {
  const p = 'MAAMU (PEAK ROAST MODE) 🤡🔥';

  if (sustainability < 55) {
    return {
      persona: p,
      message: `Bhai, your brain is currently a fried pakoda. 🍳🧠 Sustainability sirf ${sustainability}% hai. Itna burnout mat kar ki kal uth hi na paye. 💀 Go to sleep or your next session will have the IQ of a brick. 🧱🔌`
    };
  }
  
  if (taskHealth.status === 'CRITICAL' || taskHealth.debtScore > 70) {
    return {
      persona: p,
      message: `System Alert: Your Task Debt is ${taskHealth.debtScore}%. Backlog dekh ke rona aa raha hai. 📂📉 Motivation videos band kar aur kaam shuru kar. 🤡 Motivation is for losers; discipline is for legends. Clean the mess now! 🧹🔥`
    };
  }
  
  if (trend < 45) {
    return {
      persona: p,
      message: `14-day consistency: ${trend}%. Bhai, padhai kar rahe ho ya lottery khel rahe ho? 📉📉 One day you're Einstein, the next day you're a pure potato. 🥔 Discipline laao life mein, warna sirf sapne hi reh jayenge. 🎯💀`
    };
  }
  
  if (momentum < -15) {
    return {
      persona: p,
      message: `Momentum is at ${momentum}%. You're basically moonwalking away from success. 🕺💩 Agle mahine regret track karne ka plan hai kya? Wake up! ⏰🚨 Time pass mat kar.`
    };
  }
  
  if (sustainability > 88 && trend > 88 && momentum > 20) {
    return {
      persona: p,
      message: `Wait, stats actually decent hain? 🤨 Momentum up, consistency high... Kaunsa nasha kar rahe ho? 🚀🔥 Zyada khush mat ho, ek "chilling session" aur tum wapas zero pe aa jaoge. Keep the pressure on! 😤🛠️`
    };
  }
  if (neglectedTopic) {
    return {
      persona: p,
      message: `System Alert: You are completely ignoring '${neglectedTopic}'. 🚨 Sirf wahi padhoge jo aasan lagta hai? If you don't face your weak points, you will fail. Start studying it today. 💀`
    };
  }

  if (vulnerableDay) {
    return {
      persona: p,
      message: `Pattern Detected: You always slack off on ${vulnerableDay}s. 📉 Calendar dekh ke aalas aata hai kya? Break the pattern this week, or stay mediocre forever. ⏰🤡`
    };
  }
  
  return {
    persona: p,
    message: `Operational Stability... barely. 📉 Bare minimum karke hero mat bano. ${momentum > 0 ? 'Momentum thoda up hai, par 3-hour reel session se celebration mat karna. 📱🤡' : 'Overthinking band kar aur output dikha. 🧠💩'} Potential ki koi value nahi hai, sirf result matter karta hai. 🌍🔨`
  };
}

export function generateActionPlan(tasks: any[], neglected: string | null, peakHourStr: string): { task: string; reason: string; priority: 'HIGH' | 'MED' | 'LOW' }[] {
  const plan: any[] = [];
  const today = new Date().toISOString().split('T')[0];
  const backlogTasks = tasks.filter(t => !t.completed && t.date < today).sort((a,b) => b.priority - a.priority);
  if (backlogTasks.length > 0) {
    plan.push({ task: `Clear Backlog Item: ${backlogTasks[0].text}`, reason: 'Reducing task debt is priority one.', priority: 'HIGH' });
  }
  if (neglected) {
    plan.push({ task: `Restore focus on ${neglected}`, reason: `Deficit detected. Target this during your ${peakHourStr} peak.`, priority: 'MED' });
  }
  plan.push({ task: 'Discipline Reset', reason: 'Verify remaining daily routine items to protect your 14-day trend.', priority: 'LOW' });
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

  // 4. Capped Backlog with Priorities (Top 10 only)
  const priorityMap: Record<number, string> = { 1: 'L', 2: 'M', 3: 'H' };
  const pendingTasks = data.tasks
    .filter(t => !t.completed)
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
    back: pendingTasks,
    rout: routinesContext,
    lb: data.leaderboard,
    tmr: data.activeTimer
  });
}
