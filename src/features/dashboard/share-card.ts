import html2canvas from 'html2canvas';
import { appState } from '@/state/app-state';
import { getRank } from '@/features/dashboard/dashboard';

export async function generateShareCard(): Promise<void> {
  // 1. Create a hidden container for the card
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  // 2. Fetch current stats
  const totalHours = appState.trackerData.reduce((acc, current) => {
    return acc + (current.studyHours || []).reduce((a, b) => a + (b || 0), 0);
  }, 0);
  
  const rank = getRank(totalHours);
  
  let currentStreak = 0;
  for (let i = appState.trackerData.length - 1; i >= 0; i--) {
    const day = appState.trackerData[i];
    if (day.date > new Date().toISOString().split('T')[0]) continue; // skip future
    if (day.completed) currentStreak++;
    else if (!day.restDay) break;
  }

  // 3. User Identity
  const { STORAGE_KEYS } = await import('@/config/constants');
  const profileRaw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  let displayName = 'ALL TRACKER';
  let initial = 'A';

  if (profileRaw) {
    try {
      const profile = JSON.parse(profileRaw);
      displayName = (profile.displayName || 'ALL TRACKER').toUpperCase();
      initial = displayName.charAt(0);
    } catch (e) {}
  }

  // 4. Build the DOM Layout (LeetCode/Neon Arena Style)
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
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: #6366f1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-family: 'Tektur'; font-weight: 900; font-size: 24px;">${initial}</div>
          <div>
            <div style="font-family: 'Tektur'; font-weight: 800; font-size: 1.2rem; letter-spacing: 2px;">${displayName}</div>
            <div style="font-size: 0.75rem; color: #a1a1aa; letter-spacing: 4px;">NEON ARENA</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.8rem; font-weight: 600; color: #6366f1;">LVL ${rank.level}</div>
          <div style="font-size: 0.6rem; color: #a1a1aa;">${rank.tierXP} / 1000 XP</div>
        </div>
      </div>

      <!-- Hero Rank Section -->
      <div style="display: flex; align-items: center; gap: 30px; background: rgba(0,0,0,0.4); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
        <div style="flex: 1;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 8px;">GLOBAL RANK</div>
          <div style="font-family: 'Tektur'; font-size: 3rem; font-weight: 900; line-height: 1; color: ${rank.color}; text-shadow: 0 0 20px ${rank.color}40;">${rank.name}</div>
          <div style="font-size: 0.9rem; font-weight: 600; margin-top: 8px;">${rank.division} Division</div>
        </div>
        <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 30px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 4px;">ALL-TIME HOURS</div>
          <div style="font-family: 'Tektur'; font-size: 2.5rem; font-weight: 900; line-height: 1;">${totalHours.toFixed(1)}</div>
        </div>
      </div>

      <!-- Sub Metrics -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
          <div style="font-size: 0.65rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 8px;">CURRENT STREAK</div>
          <div style="font-family: 'Tektur'; font-size: 2rem; font-weight: 900; color: #f59e0b;">${currentStreak} 🔥</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
          <div style="font-size: 0.65rem; font-weight: 800; color: #a1a1aa; letter-spacing: 2px; margin-bottom: 8px;">WORLD POSITION</div>
          <div style="font-family: 'Tektur'; font-size: 2rem; font-weight: 900; color: #10b981;">${rank.worldPos}</div>
        </div>
      </div>
    </div>
  `;

  // 4. Capture Canvas
  const captureTarget = document.getElementById('arenaShareCardCapture');
  
  if (captureTarget) {
    try {
      // Small timeout to ensure DOM paints before capture
      await new Promise(res => setTimeout(res, 100));
      
      const canvas = await html2canvas(captureTarget, {
        backgroundColor: null,
        scale: 2, // High resolution
        logging: false
      });
  
      // 5. Trigger Download
      const link = document.createElement('a');
      link.download = `Arena_Stats_Lvl${rank.level}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error("Error generating share card:", e);
      alert("Failed to generate Share Card. Check console.");
    }
  }

  // 6. Cleanup
  document.body.removeChild(container);
}
