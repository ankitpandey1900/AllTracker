/**
 * INTELLIGENCE PROMPTS & MESSAGES
 * 
 * Handles the AI's 'Vocabulary' and the JSON context generation.
 */

export function generateMentorAdvice(taskHealth: any, sustainability: number, trend: number, momentum: number): { message: string; persona: string } {
  const p = 'MAAMU (PEAK ROAST MODE) 🤡🔥';

  if (sustainability < 60) {
    return {
      persona: p,
      message: `Bhai, your brain is currently a fried pakoda. 🍳🧠 Sustainability is at ${sustainability}%. Pushing past 11 PM isn't "hustle," it's just slow-motion suicide for your productivity. 💀 Go to sleep or your next study session will have the IQ of a toaster. 🍞🔌`
    };
  }
  
  if (taskHealth.status === 'CRITICAL') {
    return {
      persona: p,
      message: `System Alert: Your Task Debt is ${taskHealth.debtScore}%. You have more backlog than a government office. 📂📉 Stop looking for "motivation" videos on YouTube and clear your damn tasks. 🤡 Motivation is for losers; discipline is for legends. Clean the mess now! 🧹🔥`
    };
  }
  
  if (trend < 50) {
    return {
      persona: p,
      message: `14-day trend: ${trend}%. Your consistency is more unstable than a crypto market crash. 📉📉 One day you're Einstein, the next day you're a potato. 🥔 Pick a lane. Mastery isn't a part-time hobby, it's a full-time obsession. 🎯💀`
    };
  }
  
  if (momentum < -20) {
    return {
      persona: p,
      message: `Momentum is at ${momentum}%. You're not just slowing down; you're basically moonwalking away from your goals. 🕺💩 If you continue like this, the only thing you'll be tracking next month is your regret. Wake up! ⏰🚨`
    };
  }
  
  if (sustainability > 85 && trend > 85 && momentum > 15) {
    return {
      persona: p,
      message: `Wait, is this a glitch? Your stats actually look... good. 🤨 Momentum is up, sustainability is high, and you're actually doing your routines. 🚀🔥 Don't get cocky though. One "chilling session" and you're back to being a civilian. Keep the pressure on! 😤🛠️`
    };
  }
  
  return {
    persona: p,
    message: `Operational Stability... barely. 📉 You're doing the bare minimum to not feel guilty. ${momentum > 0 ? 'Momentum is slightly up, but don\'t celebrate with a 3-hour reel session. 📱🤡' : 'Stop overthinking your "Strategy" and just put in the hours. 🧠💩'} The world doesn't care about your potential, only your output. 🌍🔨`
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
  tasks: any[];
  routines: any[];
  activeTimer: any;
  beastMode: boolean;
  leaderboard: any;
}): string {
  // Full history condensed to avoid token overflow
  const fullHistory = data.trackerData.map(d => ({
    d: d.day,
    h: (d.studyHours || []).reduce((s: number, h: number) => s + (h || 0), 0),
    c: d.completed ? 1 : 0
  }));

  const last14 = data.trackerData.slice(-14).map(d => ({
    day: d.day,
    total: (d.studyHours || []).reduce((s: number, h: number) => s + (h || 0), 0),
    topics: d.topics || '',
    tasks_done: d.tasksDone || 0
  }));

  return JSON.stringify({
    identity: { handle: "@" + data.username, totalHours: data.totalHours.toFixed(1), rank: data.rank },
    beastModeActive: data.beastMode,
    stats: { 
      sustainability: data.briefing.sustainabilityScore, 
      discipline: data.briefing.disciplineTrend, 
      momentum: data.briefing.momentumLabel 
    },
    full_tracker_history: fullHistory,
    detailed_history_14d: last14,
    backlog: data.tasks.filter(t => !t.completed).map(t => t.text),
    routines: data.routines.map(r => ({ title: r.title, done: r.completed })),
    leaderboard: data.leaderboard,
    activeTimer: data.activeTimer
  }, null, 2);
}
