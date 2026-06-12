import { appState } from '@/state/app-state';
import { openSharePreview } from '@/features/dashboard/share-preview';
import { QuotesManager } from '@/features/dashboard/quotes.manager';
import { getSecureLocalProfileString } from '@/utils/security';

/**
 * Generates a premium "Midnight Reflection" Share Card.
 * 
 * Design system:
 *   Background  — Deep navy gradient (#080e1e → #1a2744 → #2d3f5c)
 *   Accent      — Warm gold (#c8a96e)
 *   Quote text  — Off-white (#e8e0d4) in Cormorant Garamond serif
 *   Branding    — Outfit sans-serif, gold, letter-spaced
 *   Atmosphere  — Procedural stars, SVG mountain/treeline silhouette
 */
export async function generateQuoteShareCard(themeKey?: string, customText?: string): Promise<void> {

  // Rotate to a new quote each time (unless custom text)
  if (!customText) QuotesManager.getInstance().rotate();
  const finalQuote = QuotesManager.getInstance().getCurrentQuote();

  // Profile
  const profileRaw = getSecureLocalProfileString();
  let displayName = 'TRACKER';
  if (profileRaw) {
    try {
      const p = JSON.parse(profileRaw);
      displayName = p.displayName || 'TRACKER';
    } catch (_e) { /* ignore */ }
  }

  // Quote text & author
  const quoteText = customText || (finalQuote ? finalQuote.t : 'Stay focused. Stay consistent.');
  const rawAuthor = finalQuote ? (finalQuote.a || '') : '';
  const GENERIC = ['wisdom','mindset','culture','science','psychology','nature','coach','truth',
    'code','logic','practice','human','reality','self','empowerment','commitment','reframe',
    'freedom','mental','choice','effort','upgrade','motivation','action','goal','destiny',
    'success','productivity','growth','inner','aap ka shubh chintak','unknown','maxim',
    'proverb','rule'];
  const isGeneric = !rawAuthor || GENERIC.some(k => rawAuthor.toLowerCase().includes(k));
  const authorName = customText ? displayName : (isGeneric ? '' : rawAuthor);
  // Try to surface the source (e.g. "Bhagavad Gita") — stored in .s on some quotes
  const authorSource = (!customText && (finalQuote as any)?.s) || '';

  // Metadata
  const reflectionNum = appState.trackerData?.length || 1;
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Adaptive font sizing
  const len = quoteText.length;
  let qSize = '2.8rem';
  if (len > 180) qSize = '1.55rem';
  else if (len > 140) qSize = '1.75rem';
  else if (len > 100) qSize = '2rem';
  else if (len > 70)  qSize = '2.35rem';

  const theme = themeKey || 'midnight';
  
  let bgHtml = '';
  let textColor = '#f8f8f8';
  let accentColor = '#d8a45b'; // Swapped to a slightly richer gold to match the screenshot
  let brandingColor = 'rgba(216,164,91,0.7)';
  let dateColor = 'rgba(216,164,91,0.45)';
  
  // Theme definitions
  if (theme === 'midnight') {
    // Procedural stars
    const stars = Array.from({ length: 30 }, () => {
      const x = (Math.random() * 96 + 2).toFixed(1);
      const y = (Math.random() * 65).toFixed(1);
      const r = (Math.random() * 1.5 + 0.6).toFixed(1);
      const o = (Math.random() * 0.35 + 0.15).toFixed(2);
      return `<circle cx="${x}%" cy="${y}%" r="${r}" fill="#c8a96e" opacity="${o}"/>`;
    }).join('');
    
    bgHtml = `
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#080e1e 0%,#111d36 30%,#1c2e4e 55%,#2a3f5e 75%,#344d68 100%);z-index:1;"></div>
      <svg style="position:absolute;inset:0;width:100%;height:100%;z-index:2;" aria-hidden="true">${stars}</svg>
      <svg style="position:absolute;bottom:0;left:0;width:100%;height:220px;z-index:3;" viewBox="0 0 450 220" preserveAspectRatio="none">
        <path d="M0 220 L0 140 Q60 95,120 130 Q180 80,240 115 Q300 65,360 100 Q410 85,450 110 L450 220Z" fill="rgba(8,12,28,0.45)"/>
        <path d="M0 220 L0 165 Q50 140,100 160 Q150 125,200 150 Q250 115,300 145 Q350 125,400 148 L450 155 L450 220Z" fill="rgba(6,10,22,0.65)"/>
        <path d="M0 220 L0 185 L8 183 L12 170 L16 183 L22 178 L26 165 L30 178 L36 183 L42 180 L46 168 L50 180 L56 175 L60 162 L64 175 L70 183 L76 178 L80 166 L84 178 L90 183 L96 180 L100 168 L104 180 L110 175 L114 160 L118 175 L124 183 L130 180 L134 167 L138 180 L144 176 L148 163 L152 176 L158 183 L164 179 L168 166 L172 179 L178 175 L182 161 L186 175 L192 183 L198 178 L202 165 L206 178 L212 174 L216 160 L220 174 L226 183 L232 179 L236 167 L240 179 L246 175 L250 162 L254 175 L260 183 L266 178 L270 164 L274 178 L280 174 L284 161 L288 174 L294 183 L300 179 L304 166 L308 179 L314 176 L318 163 L322 176 L328 183 L334 179 L338 165 L342 179 L348 175 L352 161 L356 175 L362 183 L368 178 L372 164 L376 178 L382 174 L386 160 L390 174 L396 183 L402 179 L406 166 L410 179 L416 175 L420 163 L424 175 L430 183 L436 178 L440 166 L444 178 L450 183 L450 220Z" fill="rgba(4,8,18,0.88)"/>
      </svg>
    `;
  } else if (theme === 'paper') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:#f5efe4;z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at center, transparent 0%, rgba(200,180,150,0.2) 100%);z-index:2;"></div>
      <!-- Subtle leaf shadow -->
      <svg style="position:absolute;bottom:-20px;right:-20px;width:200px;height:200px;opacity:0.08;z-index:3;transform:rotate(-15deg);" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    `;
    textColor = '#2c2c2c';
    accentColor = '#8a7a64';
    brandingColor = 'rgba(138,122,100,0.8)';
    dateColor = 'rgba(138,122,100,0.5)';
  } else if (theme === 'warm') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,#e8c89c 0%,#d2a66e 50%,#ba8848 100%);z-index:1;"></div>
      <div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.2) 0%,transparent 60%);z-index:2;"></div>
    `;
    textColor = '#1a1410';
    accentColor = '#5c452e';
    brandingColor = 'rgba(92,69,46,0.8)';
    dateColor = 'rgba(92,69,46,0.5)';
  } else if (theme === 'forest') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0a1a14 0%,#153024 40%,#1e4030 100%);z-index:1;"></div>
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at 50% 0%, rgba(200,220,200,0.15) 0%, transparent 60%);z-index:2;"></div>
      <svg style="position:absolute;bottom:0;left:0;width:100%;height:180px;z-index:3;opacity:0.4;" viewBox="0 0 450 180" preserveAspectRatio="none">
        <path d="M0 180 L20 100 L40 180 L60 80 L80 180 L100 120 L120 180 L140 90 L160 180 L180 110 L200 180 L220 70 L240 180 L260 100 L280 180 L300 80 L320 180 L340 120 L360 180 L380 90 L400 180 L420 110 L440 180 L450 140 L450 180 Z" fill="#08140c"/>
      </svg>
    `;
    textColor = '#e0ecd8';
    accentColor = '#94b898';
    brandingColor = 'rgba(148,184,152,0.7)';
    dateColor = 'rgba(148,184,152,0.5)';
  } else if (theme === 'aurora') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:#0d111a;z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 20% 40%, rgba(76,217,100,0.3) 0%, transparent 50%);z-index:2;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 60%, rgba(144,19,254,0.3) 0%, transparent 50%);z-index:2;"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(0deg, #0d111a 0%, transparent 60%);z-index:3;"></div>
    `;
    textColor = '#f0f4ff';
    accentColor = '#80e5b3';
    brandingColor = 'rgba(128,229,179,0.7)';
    dateColor = 'rgba(128,229,179,0.45)';
  } else if (theme === 'minimal') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,#ffffff 0%,#f0f0f0 100%);z-index:1;"></div>
    `;
    textColor = '#1a1a1a';
    accentColor = '#666666';
    brandingColor = 'rgba(40,40,40,0.7)';
    dateColor = 'rgba(40,40,40,0.5)';
  }

  // ── Build the card HTML ──────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;top:-9999px;left:-9999px';
  document.body.appendChild(wrapper);

  wrapper.innerHTML = `
<div id="quoteShareCardCapture" style="
  width:450px; height:600px; position:relative; overflow:hidden;
  border-radius:18px; box-sizing:border-box;
  font-family:'Outfit',sans-serif; color:${textColor};
">
  ${bgHtml}

  <!-- ─── TOP BRANDING ─── -->
  <div style="position:relative;z-index:10;display:flex;justify-content:space-between;align-items:flex-start;padding:32px 34px 0;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:0.75rem;font-weight:600;color:${brandingColor};letter-spacing:5px;">ALL TRACKER</span>
    </div>
  </div>

  <!-- 📜 QUOTE TEXT -->
  <div style="position:relative;z-index:10;padding:24px 42px 0;flex:1;">
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:4.5rem;color:${accentColor};line-height:0.8;margin-bottom:16px;">“</div>
    <div style="
      font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;
      font-size:${qSize};
      font-weight:400;
      line-height:1.25;
      color:${textColor};
      letter-spacing:0.2px;
    ">
      ${quoteText}<span style="color:${accentColor};">”</span>
    </div>
  </div>

  <!-- ── AUTHOR ATTRIBUTION -->
  <div style="position:relative;z-index:10;padding:28px 42px 36px;">
    <div style="width:36px;height:1.5px;background:${accentColor};margin-bottom:14px;opacity:0.6;"></div>
    ${authorName
      ? `<div style="font-family:'Outfit',sans-serif;font-size:0.95rem;color:${accentColor};font-weight:500;letter-spacing:0.3px;">${authorName}</div>`
      : `<div style="font-family:'Outfit',sans-serif;font-size:0.95rem;color:${accentColor};font-weight:500;letter-spacing:0.3px;">Anonymous</div>`}
    ${authorSource
      ? `<div style="font-family:'Outfit',sans-serif;font-size:0.85rem;color:rgba(255,255,255,0.6);margin-top:4px;font-style:italic;">${authorSource}</div>`
      : ''}
  </div>
</div>`;

  // ── Capture ────────────────────────────────────────────────────
  const target = document.getElementById('quoteShareCardCapture');
  if (target) {
    try {
      // Wait for font rendering
      await new Promise(r => setTimeout(r, 500));
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: 2.5,
        logging: false,
        useCORS: true,
        width: 450,
        height: 600,
      });
      openSharePreview(canvas.toDataURL('image/png'), 'SHARE QUOTE');
    } catch (e) {
      console.error('[ShareCard] capture failed', e);
    }
  }
  document.body.removeChild(wrapper);
}
