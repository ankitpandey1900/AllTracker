import { appState } from '@/state/app-state';
import { formatDuration } from '@/utils/date.utils';
import { getCurrentUserLeaderboardContext } from '@/features/dashboard/leaderboard';
import { getTacticalBriefing } from './intelligence.service';

/**
 * INTELLIGENCE LOCAL HANDLER
 * 
 * Provides instant, offline-first replies for common greetings 
 * and data snapshots to keep the UI snappy.
 */

export function getLocalSmallTalkReply(query: string, username: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (/^(hi|hello|hey|yo)$/.test(q)) return `Oh, look who decided to show up. 👋 ${username}, unless you're here to log 4+ hours, why are we talking? Go study. 💀`;
  if (/^(thanks|thank you|thx)$/.test(q)) return `Don't thank me. Thank your past self for actually working. Now keep that momentum before you lose it. 🚀`;
  if (/^(ok|okay)$/.test(q)) return `Less 'okay', more focus. The clock is ticking. ⏰`;
  if (/^(bye|good night)$/.test(q)) return `Finally. Recover your brain cells and don't be a potato tomorrow. 🔋🤡`;
  if (/^(good morning|good evening|kaise ho|kya haal)$/.test(q)) return `Systems are active. My status is 'Savage'. Your status is 'Currently Wasting Time'. What's the mission? 🧠🛠️`;
  return null;
}

export function getLocalDataContextReply(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const leaderboardCtx = getCurrentUserLeaderboardContext();
  const totalHours = (appState.trackerData || []).reduce(
    (sum, day) => sum + (day.studyHours || []).reduce((s, h) => s + (h || 0), 0),
    0
  );
  const brief = getTacticalBriefing();
  const last30 = (appState.trackerData || []).slice(-30);
  const bestDay = last30.reduce((best, d) => {
    const hrs = (d.studyHours || []).reduce((s, h) => s + (h || 0), 0);
    return hrs > best.hrs ? { day: d.day, hrs } : best;
  }, { day: 0, hrs: -1 });
  
  const todayDay = appState.trackerData.length ? appState.trackerData[appState.trackerData.length - 1].day : 1;
  const activeRange = (appState.settings.customRanges || []).find(r => todayDay >= r.startDay && todayDay <= r.endDay);
  const activeCategories = (activeRange?.columns?.length ? activeRange.columns : appState.settings.columns || []);

  if (/(leaderboard|rank|standing|position)/.test(q)) {
    if (!leaderboardCtx) {
      return `I cannot read live leaderboard snapshot right now, but your data shows **${formatDuration(totalHours) || '0h'}** total and **${brief.momentumLabel}** momentum. 📉`;
    }
    return `Your rank is **${leaderboardCtx.position} out of ${leaderboardCtx.totalUsers}**. 🏆\n\n- **Hours:** ${formatDuration(totalHours) || '0h'}\n- **#1:** ${formatDuration(leaderboardCtx.topHours) || '0h'}\n- **Gap:** ${formatDuration(leaderboardCtx.gapToTopHours) || '0h'}\n- **Peak Window:** ${brief.peakHourStr}`;
  }

  if (/(how many.*categor|what.*categor|my categor|category list|categories)/.test(q)) {
    const list = activeCategories.map((c, i) => `${i + 1}. ${c.name} (${c.target}h target)`).join('\n');
    return `You have **${activeCategories.length} active categories**. 🛠️\n\n${list || 'No categories configured.'}`;
  }

  if ((q.includes('detail') || q.includes('complete') || q.includes('full')) && (q.includes('analysis') || q.includes('analytic') || q.includes('my data'))) {
    return `## Your Data Snapshot 📊\n\n- **Momentum:** ${brief.momentum}% (${brief.momentumLabel})\n- **Discipline:** ${brief.disciplineTrend}%\n- **Sustainability:** ${brief.sustainabilityScore}%\n- **Best Day (30d):** Day ${bestDay.day} (${formatDuration(bestDay.hrs) || '0h'})\n- **Pending Tasks:** ${(appState.tasks || []).filter(t => !t.completed).length}`;
  }

  return null;
}
