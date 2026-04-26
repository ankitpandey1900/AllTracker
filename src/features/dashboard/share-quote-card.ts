import html2canvas from 'html2canvas';
import { appState } from '@/state/app-state';
import { calculateStreak, calculateTotalStudyHours } from '@/utils/calc.utils';
import { openSharePreview } from '@/features/dashboard/share-preview';
import { QuotesManager } from '@/features/dashboard/quotes.manager';
import { getSecureLocalProfileString } from '@/utils/security';
import { getRank } from '@/features/dashboard/dashboard';

/**
 * Generates the "Cinematic Wisdom" Style Share Card.
 * UPDATED: Precise Author filtering to remove category-like placeholders.
 */
export async function generateQuoteShareCard(themeKey?: string, customText?: string): Promise<void> {
  const quote = QuotesManager.getInstance().getCurrentQuote();
  
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

  const finalQuoteText = customText || (quote ? quote.t : "Stay focused. Stay consistent.");
  
  /**
   * REFINED AUTHOR LOGIC:
   * Only show names of real people or sources. 
   * Filter out generic "Category-like" placeholders.
   */
  const rawAuthor = quote ? (quote.a || 'Unknown') : "ALL TRACKER";
  const genericKeywords = [
    'wisdom', 'mindset', 'culture', 'science', 'psychology', 'nature', 
    'coach', 'truth', 'code', 'logic', 'practice', 'human', 'nature', 
    'reality', 'self', 'empowerment', 'commitment', 'reframe', 'freedom', 
    'mental', 'choice', 'effort', 'upgrade', 'motivation', 'action', 
    'goal', 'destiny', 'success', 'productivity', 'growth', 'inner', 
    'aap ka shubh chintak', 'unknown', 'maxim', 'proverb', 'rule', 'code'
  ];

  const isGeneric = genericKeywords.some(kw => rawAuthor.toLowerCase().includes(kw));
  const finalAuthor = customText ? `@${displayName}` : (isGeneric ? 'ALL TRACKER' : rawAuthor);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const currentStreak = calculateStreak(appState.trackerData);
  
  const localTotal = calculateTotalStudyHours(appState.trackerData);
  
  // 🛰️ UNIFIED DATA SOURCE: Mirror the Dashboard/Leaderboard's logic
  const totalHours = Math.max(localTotal, appState.verifiedTotalHours);
  const userRank = getRank(totalHours);

  const themes: Record<string, { color: string; label: string; icon: string }> = {
    'default': { color: '#60a5fa', label: 'CODING CRAFT', icon: '💻' },
    'toxic':   { color: '#22c55e', label: 'OPTIMAL PACE', icon: '🌿' },
    'savage':  { color: '#a855f7', label: 'SAVAGE ROAST', icon: '🔥' },
    'gold':    { color: '#f59e0b', label: 'ELITE VISION', icon: '☀️' },
    'critical':{ color: '#ef4444', label: 'REALITY CHECK', icon: '👁️' },
  };

  const theme = themes[themeKey || quote?.category || 'default'] || themes['default'];

  const len = finalQuoteText.length;
  let fontSize = '3.5rem'; 
  if (len > 140) fontSize = '1.8rem';
  else if (len > 80) fontSize = '2.2rem';
  else if (len > 40) fontSize = '2.6rem';

  container.innerHTML = `
    <div id="quoteShareCardCapture" style="
      width: 600px;
      height: 600px;
      background: #000;
      padding: 60px 45px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
      font-family: 'Outfit', sans-serif;
      color: #fff;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,0.03);
    ">
      <!-- 🌌 NEBULA MESH AURORA (DUAL-TONE) -->
      <div style="position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; background: radial-gradient(circle at 20% 30%, ${theme.color}25 0%, transparent 50%), radial-gradient(circle at 80% 70%, #4338ca20 0%, transparent 50%); z-index: 0;"></div>
      
      <!-- 📡 SUBTLE SCANLINES -->
      <div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 4px); z-index: 1; pointer-events: none;"></div>

      <!-- 📐 CINEMATIC HUD BRACKETS -->
      <div style="position: absolute; top: 20px; left: 20px; width: 40px; height: 40px; border-top: 1px solid rgba(255,255,255,0.1); border-left: 1px solid rgba(255,255,255,0.1); z-index: 10;"></div>
      <div style="position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-top: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); z-index: 10;"></div>
      <div style="position: absolute; bottom: 20px; left: 20px; width: 40px; height: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); border-left: 1px solid rgba(255,255,255,0.1); z-index: 10;"></div>
      <div style="position: absolute; bottom: 20px; right: 20px; width: 40px; height: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); z-index: 10;"></div>

      <!-- 📜 THE WISDOM (CINEMATIC TYPOGRAPHY) -->
      <div style="z-index: 10; width: 100%; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 20px;">
        <div style="
          font-size: ${fontSize};
          font-weight: 400;
          line-height: 1.25;
          font-family: 'Playfair Display', serif;
          font-style: italic;
          color: #FFFFFF;
          text-shadow: 0 10px 40px rgba(0,0,0,0.6);
          margin-bottom: 30px;
        ">
          "${finalQuoteText}"
        </div>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; opacity: 0.6;">
          <div style="width: 4px; height: 4px; background: ${theme.color}; transform: rotate(45deg); box-shadow: 0 0 10px ${theme.color};"></div>
          <div style="font-size: 1rem; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; font-family: 'Outfit';">
            ${finalAuthor}
          </div>
          <div style="width: 4px; height: 4px; background: ${theme.color}; transform: rotate(45deg); box-shadow: 0 0 10px ${theme.color};"></div>
        </div>
      </div>

      <!-- 🎖️ REDESIGNED FOOTER (POLISHED GLASS) -->
      <div style="
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10;
        padding: 30px 0 0;
        border-top: 1px solid rgba(255,255,255,0.06);
        position: relative;
      ">
        <!-- Profile -->
        <div style="display: flex; align-items: center; gap: 15px;">
           <div style="width: 60px; height: 60px; background: #000; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 15px 30px rgba(0,0,0,0.4); position: relative; overflow: hidden;">
              ${avatar}
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);"></div>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 1.3rem; font-weight: 900; letter-spacing: -0.5px;">@${displayName}</div>
              <div style="font-size: 0.65rem; color: #71717a; font-weight: 800; letter-spacing: 2px; margin-top: 2px;">OPERATIVE // ACTIVE</div>
            </div>
        </div>

        <!-- Streak -->
        <div style="text-align: center;">
          <div style="font-size: 0.6rem; font-weight: 900; color: #71717a; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px;">STREAK</div>
          <div style="font-size: 1.4rem; font-weight: 900; color: #f59e0b; text-shadow: 0 0 15px rgba(245, 158, 11, 0.3);">${currentStreak} DAYS 🔥</div>
        </div>

        <!-- Rank -->
        <div style="text-align: right;">
          <div style="font-size: 0.6rem; font-weight: 900; color: #71717a; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px;">RANK</div>
          <div style="font-size: 1.4rem; font-weight: 900; color: ${userRank.color}; text-shadow: 0 0 20px ${userRank.color}40;">${userRank.name}</div>
        </div>
      </div>

      <!-- Background Logo Watermark (CENTER FOCUS) -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; height: 500px; opacity: 0.15; z-index: 1; pointer-events: none; display: flex; align-items: center; justify-content: center;">
        <img src="/logo.png" style="width: 100%; height: auto; filter: grayscale(1) invert(1) brightness(1.1);">
      </div>
    </div>
  `;

  const captureTarget = document.getElementById('quoteShareCardCapture');
  if (captureTarget) {
    try {
      await new Promise(res => setTimeout(res, 200));
      const canvas = await html2canvas(captureTarget, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        width: 600,
        height: 600
      });
      openSharePreview(canvas.toDataURL('image/png'), 'SHARE QUOTE');
    } catch (e) {
      console.error(e);
    }
  }
  document.body.removeChild(container);
}
