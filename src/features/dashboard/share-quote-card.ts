
import { openSharePreview } from '@/features/dashboard/share-preview';
import { QuotesManager } from '@/features/dashboard/quotes.manager';
import { getSecureLocalProfileString } from '@/utils/security';
import { toPng } from 'html-to-image';

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
export async function generateQuoteShareCard(themeKey?: string, customText?: string, forceRotate: boolean = false): Promise<void> {

  // Only rotate if explicitly requested (e.g. Shuffle button) and no custom text
  if (forceRotate && !customText) QuotesManager.getInstance().rotate();
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
  // Adaptive font sizing
  const len = quoteText.length;
  let qSize = '2.8rem';
  if (len > 180) qSize = '1.55rem';
  else if (len > 140) qSize = '1.75rem';
  else if (len > 100) qSize = '2rem';
  else if (len > 70)  qSize = '2.35rem';
  else if (len < 40)  qSize = '3.4rem';

  const theme = themeKey || 'midnight';
  
  let bgHtml = '';
  let textColor = '#F2F0F7';
  let accentColor = '#F7A928';
  let mutedColor = 'rgba(242,240,247,0.6)';

  // Theme definitions
  if (theme === 'midnight') {
    // The brand look: ink with one warm lamp light, like the landing page.
    bgHtml = `
      <div style="position:absolute;inset:0;background:#0E0D13;z-index:1;"></div>
      <div style="position:absolute;top:-180px;left:-160px;width:520px;height:460px;border-radius:50%;background:radial-gradient(closest-side, rgba(247,169,40,0.16), transparent);z-index:2;"></div>
    `;
  } else if (theme === 'paper') {
    bgHtml = `<div style="position:absolute;inset:0;background:#f5efe4;z-index:1;"></div>`;
    textColor = '#2c2621'; accentColor = '#9a6b16'; mutedColor = 'rgba(44,38,33,0.6)';
  } else if (theme === 'warm') {
    bgHtml = `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#f3cf8f 0%,#e3a548 100%);z-index:1;"></div>`;
    textColor = '#241505'; accentColor = '#5c3a10'; mutedColor = 'rgba(36,21,5,0.62)';
  } else if (theme === 'forest') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0b1a14 0%,#163326 100%);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 0%, rgba(200,230,200,0.12) 0%, transparent 60%);z-index:2;"></div>
    `;
    textColor = '#e3eee0'; accentColor = '#9cc8a0'; mutedColor = 'rgba(227,238,224,0.6)';
  } else if (theme === 'aurora') {
    bgHtml = `
      <div style="position:absolute;inset:0;background:#0d111a;z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 20% 30%, rgba(76,217,140,0.22) 0%, transparent 55%), radial-gradient(circle at 85% 75%, rgba(167,139,250,0.22) 0%, transparent 55%);z-index:2;"></div>
    `;
    textColor = '#f0f4ff'; accentColor = '#86e1b8'; mutedColor = 'rgba(240,244,255,0.6)';
  } else if (theme === 'minimal') {
    bgHtml = `<div style="position:absolute;inset:0;background:#ffffff;z-index:1;"></div>`;
    textColor = '#141414'; accentColor = '#141414'; mutedColor = 'rgba(20,20,20,0.55)';
  }

  const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  // Serif for the quote and the app font for everything else. Inline
  // !important so the app's UI-font setting can't override the card.
  const serif = `font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif !important;`;
  const sans = `font-family:${getComputedStyle(document.body).fontFamily.replace(/"/g, "'")} !important;`;

  // ── Build the card HTML ──────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;top:-9999px;left:-9999px';
  document.body.appendChild(wrapper);

  wrapper.innerHTML = `
<div id="quoteShareCardCapture" style="
  width:450px; height:600px; position:relative; overflow:hidden;
  border-radius:18px; box-sizing:border-box; ${sans} color:${textColor};
  display:flex; flex-direction:column;
">
  ${bgHtml}

  <!-- Quote, centred in the card -->
  <div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:center;padding:44px 42px 0;">
    <div style="${serif}font-size:5rem;color:${accentColor};line-height:0.6;height:38px;">“</div>
    <div style="${serif}font-size:${qSize};font-weight:500;line-height:1.22;color:${textColor};">${esc(quoteText)}</div>
  </div>

  <!-- Footer: author (when there is a real one) and the brand -->
  <div style="position:relative;z-index:10;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:24px 42px 34px;">
    <div style="min-width:0;">
      ${authorName ? `<div style="font-size:1rem;font-weight:600;color:${accentColor};">${esc(authorName)}</div>` : ''}
      ${authorSource ? `<div style="font-size:0.85rem;color:${mutedColor};margin-top:3px;">${esc(authorSource)}</div>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <img src="/favicon.svg?v=7" alt="" style="width:22px;height:22px;" />
      <span style="font-size:0.95rem;font-weight:700;color:${textColor};">AllTracker</span>
    </div>
  </div>
</div>`;

  // ── Capture ────────────────────────────────────────────────────
  const target = document.getElementById('quoteShareCardCapture');
  if (target) {
    try {
      // Wait for fonts and the logo
      const logo = target.querySelector('img');
      if (logo && !logo.complete) await new Promise((res) => { logo.onload = logo.onerror = res; });
      await document.fonts?.ready;
      const dataUrl = await toPng(target, {
        backgroundColor: 'transparent',
        pixelRatio: 2.5,
        width: 450,
        height: 600,
      });
      openSharePreview(dataUrl, 'SHARE QUOTE');
    } catch (e) {
      console.error('[ShareCard] capture failed', e);
    }
  }
  document.body.removeChild(wrapper);
}
