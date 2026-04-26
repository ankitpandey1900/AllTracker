import html2canvas from 'html2canvas';
import { appState } from '@/state/app-state';
import { getRank } from '@/features/dashboard/dashboard';
import { openSharePreview } from '@/features/dashboard/share-preview';
import { calculateVerificationScore, calculateCompetitiveXP, calculateXP, calculateTotalStudyHours } from '@/utils/calc.utils';
import { getSecureLocalProfileString } from '@/utils/security';
import { getLocalIsoDate } from '@/utils/date.utils';

/**
 * Reverted to Legacy Arena Style Stats Card with Added Tactical Heatmap.
 * FIXED: Level calculation now syncs with Dashboard XP levels.
 * FIXED: Heatmap now correctly reflects the last 7 calendar days.
 */
export async function generateShareCard(): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const localTotal = calculateTotalStudyHours(appState.trackerData);
  
  // 🛰️ UNIFIED DATA SOURCE: Mirror the Dashboard/Leaderboard's logic
  const totalHours = Math.max(localTotal, appState.verifiedTotalHours);
  const rank = getRank(totalHours);
  const xpData = calculateXP(totalHours);
  
  let currentStreak = 0;
  for (let i = appState.trackerData.length - 1; i >= 0; i--) {
    const day = appState.trackerData[i];
    if (day.date > new Date().toISOString().split('T')[0]) continue; 
    if (day.completed) currentStreak++;
    else if (!day.restDay) break;
  }
  
  const streak = currentStreak;
  const verificationScore = calculateVerificationScore(appState.verifiedHours, localTotal);
  const localRankScore = calculateCompetitiveXP(totalHours, streak, verificationScore);
  const rankScore = Math.max(localRankScore, appState.verifiedRankScore);

  const profileRaw = getSecureLocalProfileString();
  let displayName = 'ALL TRACKER';
  let avatar = '👨‍🚀'; 

  if (profileRaw) {
    try {
      const profile = JSON.parse(profileRaw);
      displayName = profile.displayName || 'ALL TRACKER';
      avatar = profile.avatar || '👨‍🚀';
    } catch (e) {}
  }

  // --- 📅 TACTICAL HEATMAP (LAST 7 CALENDAR DAYS) ---
  const today = new Date();
  const heatmapDotsArr = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getLocalIsoDate(d);
    const dayData = appState.trackerData.find(day => day.date === dateStr);
    
    let color = '#27272a'; // Default (not studied)
    if (dayData) {
      if (dayData.completed) color = '#10b981';
      else if (dayData.restDay) color = '#6366f1';
    }
    heatmapDotsArr.push(`<div style="width: 12px; height: 12px; border-radius: 3px; background: ${color}; border: 1px solid rgba(255,255,255,0.05);"></div>`);
  }
  const heatmapDots = heatmapDotsArr.join('');

  container.innerHTML = `
    <div id="arenaShareCardCapture" style="
      width: 600px;
      padding: 40px;
      background: linear-gradient(145deg, #09090b, #18181b);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      font-family: 'Outfit', sans-serif;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 30px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 50px; height: 50px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px;">${avatar}</div>
          <div>
            <div style="font-family: 'Tektur'; font-weight: 800; font-size: 1.25rem; letter-spacing: 1px;">@${displayName}</div>
            <div style="font-size: 0.75rem; color: #a1a1aa; letter-spacing: 4px;">NEON ARENA</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.8rem; font-weight: 600; color: #6366f1;">LVL ${xpData.level}</div>
          <div style="font-size: 0.6rem; color: #a1a1aa;">XP SYSTEM ACTIVE</div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 30px; background: rgba(0,0,0,0.4); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
        <div style="flex: 1;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 8px;">GLOBAL RANK</div>
          <div style="font-family: 'Tektur'; font-size: 3rem; font-weight: 900; line-height: 1; color: ${rank.color}; text-shadow: 0 0 20px ${rank.color}40;">${rank.name}</div>
          <div style="font-size: 0.9rem; font-weight: 600; margin-top: 8px;">LEVEL ${xpData.level} OPERATIVE</div>
        </div>
        <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 30px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 4px;">ALL-TIME HOURS</div>
          <div style="font-family: 'Tektur'; font-size: 2.5rem; font-weight: 900; line-height: 1;">${totalHours.toFixed(1)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.65rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 4px;">STREAK</div>
            <div style="font-family: 'Tektur'; font-size: 1.8rem; font-weight: 900; color: #f59e0b;">${streak} 🔥</div>
          </div>
          <div style="display: flex; gap: 4px;">${heatmapDots}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
          <div style="font-size: 0.65rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 8px;">RANK SCORE</div>
          <div style="font-family: 'Tektur'; font-size: 1.8rem; font-weight: 900; color: #10b981;">${rankScore.toLocaleString()}</div>
        </div>
      </div>
    </div>
  `;

  const captureTarget = document.getElementById('arenaShareCardCapture');
  if (captureTarget) {
    try {
      await new Promise(res => setTimeout(res, 100));
      const canvas = await html2canvas(captureTarget, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        width: 600
      });
      openSharePreview(canvas.toDataURL('image/png'), 'SHARE YOUR PROGRESS');
    } catch (e) {
      console.error(e);
    }
  }
  document.body.removeChild(container);
}
