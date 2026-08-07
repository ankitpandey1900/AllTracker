import { appState } from '@/state/app-state';
import { getRank } from '@/features/dashboard/dashboard';
import { openSharePreview } from '@/features/dashboard/share-preview';
import { calculateVerificationScore, calculateCompetitiveXP, calculateXP, calculateTotalStudyHours } from '@/utils/calc.utils';
import { getSecureLocalProfileString } from '@/utils/security';
import { getLocalIsoDate } from '@/utils/date.utils';
import { toPng } from 'html-to-image';

/**
 * Reverted to Legacy Arena Style Stats Card with Added Tactical Heatmap.
 * FIXED: Level calculation now syncs with Dashboard XP levels.
 * FIXED: Heatmap now correctly reflects the last 7 calendar days.
 */
export async function generateShareCard(): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-9999';
  document.body.appendChild(container);

  const localTotal = calculateTotalStudyHours(appState.trackerData);
  const appFontFamily = (getComputedStyle(document.body).fontFamily || "'Space Grotesk', 'Inter', sans-serif").replace(/"/g, "'");
  
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
    
    let border = 'rgba(255,255,255,0.15)';
    let bg = 'rgba(255,255,255,0.02)';
    let shadow = 'none';
    if (dayData) {
      if (dayData.completed) {
        border = 'rgba(255,138,0,0.8)';
        bg = 'rgba(255,138,0,0.2)';
        shadow = '0 0 6px rgba(255,138,0,0.3)';
      }
      else if (dayData.restDay) {
        border = 'rgba(139,92,246,0.6)';
        bg = 'transparent';
      }
    }
    heatmapDotsArr.push(`<div style="width: 6px; height: 6px; border-radius: 50%; border: 1px solid ${border}; background: ${bg}; box-shadow: ${shadow};"></div>`);
  }
  const heatmapDots = heatmapDotsArr.join('');

  container.innerHTML = `
    <div id="arenaShareCardCapture" style="
      width: 540px;
      background: #070709;
      color: #F5F5F7;
      font-family: ${appFontFamily};
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 32px 44px;
    ">

      <!-- ▸ BACKGROUND & LIGHTING -->
      <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px); background-size: 32px 32px; z-index: 0; pointer-events: none;"></div>
      
      <!-- Cinematic lighting -->
      <div style="position: absolute; top: -200px; right: -150px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 40%, transparent 70%); z-index: 0; pointer-events: none;"></div>
      <div style="position: absolute; top: -50px; right: 0; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%); mix-blend-mode: screen; z-index: 0; pointer-events: none;"></div>

      <!-- Film Grain Overlay -->
      <div style="position: absolute; inset: 0; opacity: 0.04; mix-blend-mode: overlay; background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E'); z-index: 0; pointer-events: none;"></div>

      <!-- Subtle Stars -->
      <div style="position: absolute; top: 110px; right: 90px; width: 320px; height: 320px; border-radius: 50%; border-top: 1px solid rgba(255,255,255,0.02); transform: rotate(-15deg); z-index: 0; pointer-events: none;"></div>
      <div style="position: absolute; top: 160px; left: 100px; width: 1.5px; height: 1.5px; background: #fff; opacity: 0.2; box-shadow: 0 0 4px rgba(255,255,255,0.8); border-radius: 50%;"></div>
      <div style="position: absolute; top: 380px; right: 60px; width: 1px; height: 1px; background: rgba(255,255,255,0.4); border-radius: 50%;"></div>

      <!-- ════════════════════════════════════════════ -->
      <!-- HEADER (Brand)                               -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: absolute; top: 32px; right: 44px; z-index: 10; display: flex; align-items: center; gap: 12px;">
        <div style="font-weight: 700; font-size: 0.8rem; letter-spacing: 2.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
          <span style="color: rgba(245,245,247,0.9);">All</span><span style="color: rgba(139,92,246,0.9);">Tracker</span>
        </div>
        <div style="width: 12px; height: 1px; background: rgba(139,92,246,0.4);"></div>
      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- HERO SECTION (Identity)                      -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; margin-top: 0px; display: flex; flex-direction: column; align-items: flex-start;">
        <!-- Avatar Block -->
        <div style="position: relative; width: 90px; height: 90px;">
          <!-- Precision orbital rings -->
          <div style="position: absolute; inset: -10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.03); border-left: 1px solid rgba(139,92,246,0.2); transform: rotate(30deg);"></div>
          <!-- Anodized inner frame -->
          <div style="position: absolute; inset: 0; border-radius: 50%; background: #0F1014; border: 1px solid rgba(255,255,255,0.08); box-shadow: inset 0 2px 10px rgba(255,255,255,0.02), 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding-bottom: 12px; box-sizing: border-box;">
            <span style="font-size: 46px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));">${avatar}</span>
          </div>
          <div style="position: absolute; top: -10px; left: 50%; width: 1px; height: 4px; background: rgba(255,255,255,0.15); transform: translateX(-50%);"></div>
        </div>
        
        <div style="margin-top: 16px;">
          <div style="font-weight: 700; font-size: 2.2rem; letter-spacing: -0.5px; text-transform: uppercase; line-height: 0.9; background: linear-gradient(180deg, #FFFFFF 0%, #D1D5DB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${realName}</div>
          <div style="font-weight: 500; font-size: 0.75rem; color: #9CA3AF; margin-top: 4px; letter-spacing: 1.5px;"><span style="color: #8B5CF6; opacity: 0.8;">@</span>${displayName}</div>
        </div>

        <!-- Engineered Status Pill -->
        <div style="margin-top: 14px; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(139,92,246,0.2); padding: 6px 14px; border-radius: 100px; box-shadow: inset 0 0 12px rgba(139,92,246,0.05), 0 4px 12px rgba(0,0,0,0.2);">
          
          <!-- Pulsing Core -->
          <div style="position: relative; width: 6px; height: 6px;">
            <div style="position: absolute; inset: -2px; background: #8B5CF6; border-radius: 50%; opacity: 0.5; filter: blur(2px);"></div>
            <div style="position: absolute; inset: 0; background: #A78BFA; border-radius: 50%; box-shadow: 0 0 6px #A78BFA;"></div>
          </div>
          
          <div style="font-size: 0.55rem; font-weight: 700; color: #E5E7EB; letter-spacing: 2px; line-height: 1;">
            LEVEL <span style="color: #FFFFFF; font-weight: 900; margin-left: 2px; font-size: 0.65rem;">${xpData.level}</span>
          </div>
          
          <!-- Angled slash separator -->
          <div style="font-size: 0.6rem; color: rgba(255,255,255,0.2); margin: 0 2px; font-style: italic;">//</div>
          
          <div style="font-size: 0.45rem; font-weight: 600; color: rgba(139,92,246,0.8); letter-spacing: 2px; line-height: 1;">
            XP ACTIVE
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- ACHIEVEMENT PANEL (The Centerpiece)          -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; margin-top: 24px; display: flex; flex-direction: column;">
        <!-- Engineered Separator -->
        <div style="width: 100%; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); margin-bottom: 12px;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="flex: 1;">
            <div style="font-size: 0.5rem; font-weight: 600; color: rgba(138,140,149,0.8); letter-spacing: 6px; margin-bottom: 4px;">GLOBAL RANK</div>
            <div style="font-size: 5.6rem; font-weight: 900; line-height: 0.85; color: ${rank.color}; text-transform: uppercase; letter-spacing: -2px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin-left: -4px;">${rank.name}</div>
          </div>

          <div style="text-align: right; padding-bottom: 4px;">
            <div style="font-size: 0.45rem; font-weight: 600; color: rgba(138,140,149,0.6); letter-spacing: 4px; margin-bottom: 6px;">HOURS LOGGED</div>
            <div style="font-size: 3.2rem; font-weight: 800; line-height: 0.85; color: #F5F5F7; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              ${totalHours.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- STATISTICS AREA (Unified Surface)            -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; margin-top: 20px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.04);">
        
        <!-- Subtle engraved vertical divider -->
        <div style="position: absolute; top: 0; bottom: -10px; left: 50%; width: 1px; background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);"></div>

        <!-- STREAK SECTION -->
        <div style="position: relative; flex: 1; padding-right: 40px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 0.45rem; font-weight: 600; color: #8A8C95; letter-spacing: 5px;">CURRENT STREAK</div>
          
          <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 3.4rem; font-weight: 700; line-height: 0.9; color: #FF8A00; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${streak}</div>
            
            <!-- Engineered Pill for Heatmap -->
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 20px;">
              ${heatmapDots}
            </div>
          </div>
        </div>

        <!-- RANK SCORE SECTION -->
        <div style="position: relative; flex: 1; padding-left: 40px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 0.45rem; font-weight: 600; color: #8A8C95; letter-spacing: 5px;">RANK SCORE</div>
          
          <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 3.4rem; font-weight: 700; line-height: 0.9; color: #8B5CF6; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${rankScore.toLocaleString()}</div>
            
            <!-- Minimal Technical Graph -->
            <div style="display: flex; align-items: flex-end; gap: 3px; height: 20px; opacity: 0.4;">
              <div style="width: 3px; height: 40%; background: #8B5CF6; border-radius: 1px;"></div>
              <div style="width: 3px; height: 60%; background: #8B5CF6; border-radius: 1px;"></div>
              <div style="width: 3px; height: 30%; background: #8B5CF6; border-radius: 1px;"></div>
              <div style="width: 3px; height: 80%; background: #8B5CF6; border-radius: 1px;"></div>
              <div style="width: 3px; height: 100%; background: #8B5CF6; border-radius: 1px; box-shadow: 0 0 8px rgba(139,92,246,0.8);"></div>
            </div>
          </div>
        </div>

      </div>

      <!-- ════════════════════════════════════════════ -->
      <!-- FOOTER                                       -->
      <!-- ════════════════════════════════════════════ -->
      <div style="position: relative; z-index: 1; text-align: center; margin-top: 36px; display: flex; align-items: center; justify-content: center; gap: 16px;">
        <div style="width: 24px; height: 1px; background: rgba(255,255,255,0.1);"></div>
        <div style="font-size: 0.45rem; font-weight: 600; color: #8A8C95; letter-spacing: 8px;">TRACK // IMPROVE // CONQUER</div>
        <div style="width: 24px; height: 1px; background: rgba(255,255,255,0.1);"></div>
      </div>
      
    </div>
  `;

  const captureTarget = container.firstElementChild as HTMLElement;
  if (captureTarget) {
    try {
      await new Promise(res => setTimeout(res, 150));
      const dataUrl = await toPng(captureTarget, {
        backgroundColor: '#070709',
        pixelRatio: 2,
        width: 540
      });
      openSharePreview(dataUrl, 'SHARE YOUR PROGRESS');
    } catch (e) {
      console.error(e);
    }
  }
  document.body.removeChild(container);
}
