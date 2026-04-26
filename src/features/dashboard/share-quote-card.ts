import html2canvas from 'html2canvas';
import { appState } from '@/state/app-state';
import { calculateStreak } from '@/utils/calc.utils';
import { openSharePreview } from '@/features/dashboard/share-preview';
import { QuotesManager } from '@/features/dashboard/quotes.manager';
import { getSecureLocalProfileString } from '@/utils/security';

/**
 * Generates the "Radiant Wisdom" Style Share Card.
 * UPGRADED: Added Tactical HUD Brackets, Scanlines, and Digital ID Glow.
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

  const finalQuoteText = customText || (quote ? quote.t : "STAY FOCUSED. STAY CONSISTENT.");
  const finalAuthor = customText ? `@${displayName}` : (quote ? (quote.a === 'Unknown' || !quote.a ? 'ALL TRACKER' : quote.a) : "ALL TRACKER");

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const currentStreak = calculateStreak(appState.trackerData);

  const themes: Record<string, { color: string; label: string; icon: string }> = {
    'default': { color: '#60a5fa', label: 'CODING CRAFT', icon: '💻' },
    'toxic':   { color: '#22c55e', label: 'OPTIMAL PACE', icon: '🌿' },
    'savage':  { color: '#a855f7', label: 'SAVAGE ROAST', icon: '🔥' },
    'gold':    { color: '#f59e0b', label: 'ELITE VISION', icon: '☀️' },
    'critical':{ color: '#ef4444', label: 'REALITY CHECK', icon: '👁️' },
    'THE_CRAFT': { color: '#60a5fa', label: 'CODING CRAFT', icon: '💻' },
    'EXECUTION': { color: '#f59e0b', label: 'EXECUTION', icon: '⚡' },
    'spiritual': { color: '#10b981', label: 'INNER PEACE', icon: '🧘' },
    'life': { color: '#fb7185', label: 'LIFE LESSON', icon: '🌿' },
    'behavior': { color: '#ef4444', label: 'REALITY CHECK', icon: '👁️' },
    'SAVAGE_WISDOM': { color: '#a855f7', label: 'SAVAGE ROAST', icon: '🔥' },
    'future': { color: '#fbbf24', label: 'FUTURE VISION', icon: '☀️' },
    'problem-solving': { color: '#94a3b8', label: 'LOGIC ENGINE', icon: '🧩' },
  };

  const theme = themes[themeKey || quote?.category || 'default'] || themes['default'];

  const len = finalQuoteText.length;
  let fontSize = '3.8rem'; 
  if (len > 140) fontSize = '2.2rem';
  else if (len > 80) fontSize = '2.6rem';
  else if (len > 40) fontSize = '3.2rem';

  container.innerHTML = `
    <div id="quoteShareCardCapture" style="
      width: 600px;
      height: 600px;
      background: #000;
      padding: 50px 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
      font-family: 'Outfit', sans-serif;
      color: #fff;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
    ">
      <!-- 🌌 RADIANT AURORA -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; background: radial-gradient(circle, ${theme.color}25 0%, transparent 75%); z-index: 0;"></div>
      
      <!-- 📡 HOLOGRAPHIC SCANLINES -->
      <div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px); z-index: 1; pointer-events: none;"></div>

      <!-- 📐 TACTICAL HUD BRACKETS -->
      <div style="position: absolute; top: 20px; left: 20px; width: 40px; height: 40px; border-top: 2px solid ${theme.color}80; border-left: 2px solid ${theme.color}80; z-index: 10;"></div>
      <div style="position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-top: 2px solid ${theme.color}80; border-right: 2px solid ${theme.color}80; z-index: 10;"></div>
      <div style="position: absolute; bottom: 20px; left: 20px; width: 40px; height: 40px; border-bottom: 2px solid ${theme.color}80; border-left: 2px solid ${theme.color}80; z-index: 10;"></div>
      <div style="position: absolute; bottom: 20px; right: 20px; width: 40px; height: 40px; border-bottom: 2px solid ${theme.color}80; border-right: 2px solid ${theme.color}80; z-index: 10;"></div>

      <!-- 👑 MINIMAL CATEGORY ICON -->
      <div style="
        background: rgba(255,255,255,0.05);
        border: 1px solid ${theme.color}40;
        padding: 10px;
        border-radius: 50%;
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        z-index: 10;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 30px ${theme.color}30;
      ">
        ${theme.icon}
      </div>

      <!-- 📜 THE WISDOM -->
      <div style="z-index: 10; width: 100%; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 10px;">
        <div style="
          font-size: ${fontSize};
          font-weight: 800;
          line-height: 1.1;
          font-family: 'Tektur', sans-serif;
          text-transform: uppercase;
          font-style: italic;
          text-shadow: 0 15px 35px rgba(0,0,0,0.9);
          margin-bottom: 20px;
        ">
          "${finalQuoteText}"
        </div>
        
        <div style="font-size: 1.2rem; font-weight: 600; color: ${theme.color}; opacity: 0.8; letter-spacing: 3px; font-family: 'Tektur';">
          // ${finalAuthor}
        </div>
      </div>

      <!-- 🎖️ ADVANCED IDENTITY PLATE -->
      <div style="
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        z-index: 10;
        background: rgba(15,15,20,0.7);
        padding: 24px 30px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(20px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      ">
        <div style="display: flex; align-items: center; gap: 15px; width: 100%; justify-content: center;">
          <div style="position: relative;">
            <div style="
              width: 70px; height: 70px; 
              background: #111; border: 2px solid ${theme.color}; 
              border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 38px;
              box-shadow: 0 0 25px ${theme.color}40;
            ">
              ${avatar}
            </div>
            <!-- Live Indicator -->
            <div style="position: absolute; bottom: 5px; right: 5px; width: 12px; height: 12px; background: #10b981; border: 2px solid #000; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 1.6rem; font-weight: 900; letter-spacing: -1px; line-height: 1; font-family: 'Tektur';">@${displayName}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
               <div style="font-size: 0.7rem; color: ${theme.color}; font-weight: 900; letter-spacing: 3px; text-transform: uppercase;">VERIFIED OPERATIVE</div>
               <div style="width: 4px; height: 4px; border-radius: 50%; background: ${theme.color};"></div>
               <div style="font-size: 0.7rem; color: #71717a; font-weight: 700; letter-spacing: 1px;">ID: TRK-${Math.floor(Math.random()*9000)+1000}</div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 40px; font-size: 1rem; font-weight: 800; letter-spacing: 2px; border-top: 1px solid rgba(255,255,255,0.08); width: 100%; justify-content: center; padding-top: 15px;">
          <span style="color: #f59e0b;">STREAK: ${currentStreak}D 🔥</span>
          <span style="color: ${theme.color}; text-shadow: 0 0 10px ${theme.color}30;">RANK: LEGENDARY</span>
        </div>
      </div>

      <!-- 📜 NOISE & GRAIN -->
      <div style="position: absolute; inset: 0; opacity: 0.04; pointer-events: none; background-image: url('https://grainy-gradients.vercel.app/noise.svg');"></div>
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
