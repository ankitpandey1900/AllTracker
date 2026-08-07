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
  
  // Unified data source: Mirror the Dashboard/Leaderboard's logic
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

  let displayName = 'ALL TRACKER';
  let realName = 'Agent';
  let avatar = '👤';
  
  const profileRaw = getSecureLocalProfileString();
  if (profileRaw) {
    try {
      const profile = JSON.parse(profileRaw);
      displayName = profile.displayName || 'ALL TRACKER';
      realName = profile.realName || profile.displayName || 'Agent';
      avatar = profile.avatar || '👤';
    } catch (e) {}
  }

  // --- HEATMAP (LAST 7 CALENDAR DAYS) ---
  const today = new Date();
  const heatmapDotsArr = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getLocalIsoDate(d);
    const dayData = appState.trackerData.find(day => day.date === dateStr);
    
    let border = 'rgba(255,255,255,0.05)';
    let bg = 'transparent';
    let shadow = 'none';
    if (dayData) {
      if (dayData.completed) {
        border = 'rgba(255,138,0,0.8)';
        bg = 'rgba(255,138,0,0.15)';
        shadow = '0 0 8px rgba(255,138,0,0.3)';
      }
      else if (dayData.restDay) {
        border = 'rgba(139,92,246,0.6)';
        bg = 'transparent';
      }
    }
    heatmapDotsArr.push(`<div style="width: 5px; height: 5px; border-radius: 50%; border: 1px solid ${border}; background: ${bg}; box-shadow: ${shadow};"></div>`);
  }
  const heatmapDots = heatmapDotsArr.join('');

  container.innerHTML = `
    <div id="arenaShareCardCapture" style="
      width: 540px;
      height: 675px;
      background: #070709;
      color: #F5F5F7;
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    ">

      <!-- ▸ BACKGROUND & LIGHTING -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 70%); pointer-events: none; z-index: 0;"></div>
      <!-- Subtle technical grid -->
      <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(139,92,246,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.015) 1px, transparent 1px); background-size: 24px 24px; pointer-events: none; z-index: 0;"></div>
      <!-- Micro noise overlay -->
      <div style="position: absolute; inset: 0; opacity: 0.02; background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E'); z-index: 0;"></div>

      <!-- ▸ BACKGROUND PLANET -->
      <div style="position: absolute; top: -80px; right: -80px; width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, rgba(21,17,36,1) 0%, rgba(10,8,18,1) 45%, #070709 75%); box-shadow: inset -15px -15px 45px rgba(0,0,0,0.9), 0 0 100px rgba(139,92,246,0.05); z-index: 0;"></div>
      <!-- Cinematic atmosphere rim -->
      <div style="position: absolute; top: -82px; right: -82px; width: 344px; height: 344px; border-radius: 50%; border: 1px solid rgba(139,92,246,0.08); z-index: 0; pointer-events: none; filter: drop-shadow(0 0 10px rgba(139,92,246,0.1));"></div>
      
      <!-- Stars & Orbital Lines -->
      <div style="position: absolute; top: 120px; right: 100px; width: 200px; height: 200px; border-radius: 50%; border-top: 1px dashed rgba(255,255,255,0.03); transform: rotate(-15deg); z-index: 0;"></div>
      <div style="position: absolute; top: 180px; left: 80px; width: 1px; height: 1px; background: #fff; opacity: 0.1; box-shadow: 0 0 4px #fff;"></div>
      <div style="position: absolute; top: 340px; right: 40px; width: 1px; height: 1px; background: #fff; opacity: 0.05;"></div>

      <!-- ════════════════════════════════════════════ -->
      <!-- TOP AREA                                     -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; padding: 40px 45px 0;">
        <div style="font-weight: 800; font-size: 0.8rem; letter-spacing: 5px;">
          <span style="color: #F5F5F7;">ALL</span><span style="color: #8B5CF6;">TRACKER</span>
        </div>
        <div style="margin-top: 12px; width: 45px; height: 1px; background: rgba(139,92,246,0.25);"></div>
      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- HERO SECTION (Avatar & Name)                 -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; margin: 55px 45px 0; display: flex; flex-direction: column; align-items: flex-start;">
        <div style="position: relative;">
          <!-- Orbital rings -->
          <div style="position: absolute; inset: -14px; border-radius: 50%; border: 1px solid rgba(139,92,246,0.05); border-top: 1px solid rgba(139,92,246,0.3); transform: rotate(15deg);"></div>
          <div style="position: absolute; inset: -6px; border-radius: 50%; border: 1px solid rgba(139,92,246,0.03); border-left: 1px solid rgba(139,92,246,0.15); transform: rotate(-45deg);"></div>
          <!-- Avatar container -->
          <div style="width: 88px; height: 88px; border-radius: 50%; background: #0A0A0C; border: 1px solid rgba(139,92,246,0.2); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 35px rgba(139,92,246,0.1), inset 0 0 15px rgba(139,92,246,0.05);">
            <span style="font-size: 44px; display: flex; line-height: 1;">${avatar}</span>
          </div>
        </div>
        
        <div style="margin-top: 28px;">
          <div style="font-family: 'Inter', sans-serif; font-weight: 900; font-size: 2.2rem; letter-spacing: -0.5px; color: #F5F5F7; text-transform: uppercase; line-height: 1;">${realName}</div>
          <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 500; font-size: 0.65rem; color: #3a3a42; margin-top: 6px; letter-spacing: 1px;">@${displayName}</div>
        </div>

        <div style="margin-top: 16px; display: inline-flex; align-items: center; background: rgba(139,92,246,0.03); border: 1px solid rgba(139,92,246,0.15); padding: 5px 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);">
          <div style="width: 3px; height: 3px; background: #8B5CF6; margin-right: 8px;"></div>
          <div style="font-size: 0.5rem; font-weight: 700; color: #8B5CF6; letter-spacing: 2px;">LEVEL ${xpData.level} <span style="color: #4a4a55; margin-left: 8px; letter-spacing: 1px;">// XP-ACTIVE</span></div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- MAIN ACHIEVEMENT PANEL (The Hero)            -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; margin: 40px 45px 0; display: flex; justify-content: space-between; align-items: flex-end;">
        <!-- Technical framing (left) -->
        <div style="position: absolute; left: -14px; top: 10px; bottom: 0; width: 1px; background: rgba(139,92,246,0.15);"></div>
        <div style="position: absolute; left: -14px; top: 10px; width: 4px; height: 1px; background: rgba(139,92,246,0.4);"></div>
        <div style="position: absolute; left: -14px; bottom: 0; width: 4px; height: 1px; background: rgba(139,92,246,0.4);"></div>

        <div>
          <div style="font-size: 0.5rem; font-weight: 700; color: rgba(139,92,246,0.6); letter-spacing: 5px; margin-bottom: 8px;">GLOBAL RANK</div>
          <div style="font-family: 'Inter', sans-serif; font-size: 6rem; font-weight: 900; line-height: 0.8; color: ${rank.color}; text-transform: uppercase; letter-spacing: -2.5px; text-shadow: 0 15px 40px rgba(139,92,246,0.15);">${rank.name}</div>
        </div>

        <div style="text-align: right; padding-bottom: 4px;">
          <div style="font-size: 0.45rem; font-weight: 700; color: #4a4a55; letter-spacing: 4px; margin-bottom: 10px;">ALL-TIME HOURS</div>
          <div style="font-family: 'Inter', sans-serif; font-size: 3.2rem; font-weight: 800; line-height: 0.8; color: #F5F5F7; letter-spacing: -1.5px;">
            ${totalHours.toFixed(1)}
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- BOTTOM CARDS                                 -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; margin: 55px 45px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        
        <!-- STREAK CARD -->
        <div style="position: relative; padding: 22px 24px; border: 1px solid rgba(255,138,0,0.08); background: linear-gradient(180deg, rgba(255,138,0,0.02) 0%, transparent 100%);">
          <!-- Premium Edge highlights -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,138,0,0.25), transparent);"></div>
          <!-- Sci-fi Corners -->
          <div style="position: absolute; bottom: 0; left: 0; width: 4px; height: 4px; border-bottom: 1px solid rgba(255,138,0,0.4); border-left: 1px solid rgba(255,138,0,0.4);"></div>
          <div style="position: absolute; top: 0; right: 0; width: 4px; height: 4px; border-top: 1px solid rgba(255,138,0,0.4); border-right: 1px solid rgba(255,138,0,0.4);"></div>

          <div style="font-size: 0.45rem; font-weight: 700; color: #7B7B88; letter-spacing: 4px; margin-bottom: 14px;">STREAK</div>
          <div style="font-family: 'Inter', sans-serif; font-size: 2.8rem; font-weight: 800; line-height: 1; color: #FF8A00;">${streak}</div>
          
          <div style="display: flex; gap: 6px; margin-top: 24px;">
            ${heatmapDots}
          </div>

          <!-- Ember Particles -->
          <div style="position: absolute; bottom: 25px; right: 25px; width: 2px; height: 2px; background: #FF8A00; box-shadow: 0 0 8px #FF8A00; border-radius: 50%; opacity: 0.7;"></div>
          <div style="position: absolute; bottom: 35px; right: 15px; width: 1px; height: 1px; background: #FF8A00; box-shadow: 0 0 4px #FF8A00; border-radius: 50%; opacity: 0.4;"></div>
          <div style="position: absolute; bottom: 15px; right: 40px; width: 1px; height: 1px; background: rgba(255,138,0,0.8); border-radius: 50%; opacity: 0.2;"></div>
        </div>

        <!-- RANK SCORE CARD -->
        <div style="position: relative; padding: 22px 24px; border: 1px solid rgba(139,92,246,0.08); background: linear-gradient(180deg, rgba(139,92,246,0.02) 0%, transparent 100%);">
          <!-- Premium Edge highlights -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.25), transparent);"></div>
          <!-- Sci-fi Corners -->
          <div style="position: absolute; bottom: 0; right: 0; width: 4px; height: 4px; border-bottom: 1px solid rgba(139,92,246,0.4); border-right: 1px solid rgba(139,92,246,0.4);"></div>
          <div style="position: absolute; top: 0; left: 0; width: 4px; height: 4px; border-top: 1px solid rgba(139,92,246,0.4); border-left: 1px solid rgba(139,92,246,0.4);"></div>

          <div style="font-size: 0.45rem; font-weight: 700; color: #7B7B88; letter-spacing: 4px; margin-bottom: 14px;">RANK SCORE</div>
          <div style="font-family: 'Inter', sans-serif; font-size: 2.8rem; font-weight: 800; line-height: 1; color: #8B5CF6;">${rankScore.toLocaleString()}</div>

          <!-- Wireframe Terrain -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 40px; overflow: hidden; pointer-events: none;">
            <!-- Radar grid -->
            <div style="position: absolute; bottom: -5px; left: -10%; right: -10%; height: 60px; background-image: linear-gradient(transparent 90%, rgba(139,92,246,0.12) 100%), linear-gradient(90deg, rgba(139,92,246,0.08) 1px, transparent 1px); background-size: 12px 12px; transform: perspective(80px) rotateX(60deg);"></div>
            <!-- Scanline -->
            <div style="position: absolute; top: 10px; left: 0; right: 0; height: 1px; background: rgba(139,92,246,0.3); box-shadow: 0 0 4px rgba(139,92,246,0.6);"></div>
          </div>
        </div>

      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- FOOTER                                       -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: absolute; bottom: 35px; left: 0; right: 0; text-align: center; z-index: 1;">
        <div style="font-size: 0.4rem; font-weight: 500; color: #3a3a42; letter-spacing: 12px; text-transform: uppercase;">TRACK • IMPROVE • CONQUER</div>
      </div>
      
    </div>
  `;

  const captureTarget = container.firstElementChild as HTMLElement;
  if (captureTarget) {
    try {
      await new Promise(res => setTimeout(res, 150));
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureTarget, {
        backgroundColor: '#070709',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 540,
        height: 675
      });
      openSharePreview(canvas.toDataURL('image/png'), 'SHARE YOUR PROGRESS');
    } catch (e) {
      console.error(e);
    }
  }
  document.body.removeChild(container);
}
