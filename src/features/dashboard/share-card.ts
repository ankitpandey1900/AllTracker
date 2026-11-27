import { appState } from '@/state/app-state';
import { getRank } from '@/features/dashboard/dashboard';
import { openSharePreview } from '@/features/dashboard/share-preview';
import {
  calculateVerificationScore,
  calculateCompetitiveXP,
  calculateXP,
  calculateTotalStudyHours,
  calculateStreak,
} from '@/utils/calc.utils';
import { RANK_TIERS } from '@/config/constants';
import { getSecureLocalProfileString } from '@/utils/security';
import { getLocalIsoDate } from '@/utils/date.utils';
import { toPng } from 'html-to-image';

/**
 * Progress share card, in the AllTracker brand: ink background, amber for
 * hours, the logo mark, and the app's own UI font.
 *
 * 540 × 675 CSS px (4:5), exported at 2× → 1080 × 1350, the portrait size
 * Instagram, WhatsApp and LinkedIn show without cropping.
 */

const INK = '#0E0D13';
const PAPER = '#F2F0F7';
const DUST = '#A4A0B5';
const LINE = 'rgba(242,240,247,0.10)';
const AMBER = '#F7A928';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function hoursLabel(h: number): string {
  if (h <= 0) return '0h';
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (whole === 0) return `${mins}m`;
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
}

export async function generateShareCard(): Promise<void> {
  const localTotal = calculateTotalStudyHours(appState.trackerData);
  const totalHours = Math.max(localTotal, appState.verifiedTotalHours);
  const rank = getRank(totalHours);
  const level = calculateXP(totalHours).level;
  // Same streak rule as the dashboard (2+ hours a day, rest days freeze).
  const streak = calculateStreak(appState.trackerData);
  const verificationScore = calculateVerificationScore(appState.verifiedHours, localTotal);
  const rankScore = Math.max(calculateCompetitiveXP(totalHours, streak, verificationScore), appState.verifiedRankScore);

  // Progress to the next rank title.
  const tierIdx = RANK_TIERS.findIndex((t) => t.name === rank.name);
  const nextTier = tierIdx >= 0 && tierIdx < RANK_TIERS.length - 1 ? RANK_TIERS[tierIdx + 1] : null;
  const tierPct = Math.max(2, Math.min(100, Math.round(((totalHours - rank.min) / (rank.max - rank.min)) * 100)));
  const nextLine = nextTier
    ? `${hoursLabel(Math.max(0, nextTier.min - totalHours))} to ${titleCase(nextTier.name)}`
    : 'Highest rank reached';

  // Identity.
  let name = '';
  let handle = '';
  let avatar = '👤';
  const profileRaw = getSecureLocalProfileString();
  if (profileRaw) {
    try {
      const p = JSON.parse(profileRaw);
      name = p.realName || p.displayName || '';
      handle = p.displayName || '';
      avatar = p.avatar || avatar;
    } catch { /* fall back to defaults */ }
  }
  if (!name) name = 'AllTracker member';

  // Last 7 calendar days, oldest first.
  const days: { label: string; hours: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = getLocalIsoDate(d);
    const row = appState.trackerData.find((day) => day.date === iso);
    const hours = (row?.studyHours || []).reduce((s: number, h: number) => s + (Number(h) || 0), 0);
    days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }), hours, isToday: i === 0 });
  }
  const weekTotal = days.reduce((s, d) => s + d.hours, 0);
  const maxDay = Math.max(2, ...days.map((d) => d.hours));
  const bars = days
    .map((d) => {
      const h = d.hours > 0 ? Math.max(6, Math.round((d.hours / maxDay) * 100)) : 3;
      const fill = d.hours > 0 ? (d.isToday ? AMBER : 'rgba(247,169,40,0.55)') : LINE;
      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div style="height:68px; width:100%; display:flex; align-items:flex-end;">
            <div style="width:100%; height:${h}%; background:${fill}; border-radius:5px;"></div>
          </div>
          <div style="font-size:12px; color:${d.isToday ? PAPER : DUST}; font-weight:${d.isToday ? 700 : 500};">${d.label}</div>
        </div>`;
    })
    .join('');

  const dateLine = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const font = (getComputedStyle(document.body).fontFamily || "'Chakra Petch', sans-serif").replace(/"/g, "'");
  const stat = (label: string, value: string) => `
    <div style="flex:1; padding:14px 16px; border:1px solid ${LINE}; border-radius:12px;">
      <div style="font-size:12px; color:${DUST};">${label}</div>
      <div style="margin-top:6px; font-size:26px; font-weight:700; line-height:1; font-variant-numeric:tabular-nums;">${value}</div>
    </div>`;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed; top:0; left:0; opacity:0; pointer-events:none; z-index:-9999;';
  container.innerHTML = `
    <div id="arenaShareCardCapture" style="
      width:540px; height:675px; box-sizing:border-box; padding:32px 40px 26px;
      background:${INK}; color:${PAPER}; font-family:${font};
      display:flex; flex-direction:column; position:relative; overflow:hidden;">

      <!-- One warm light, top left, like the landing page -->
      <div style="position:absolute; top:-220px; left:-180px; width:560px; height:480px; border-radius:50%;
        background:radial-gradient(closest-side, rgba(247,169,40,0.12), transparent); pointer-events:none;"></div>

      <!-- Brand + date -->
      <div style="position:relative; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="/logo-mark.svg?v=7" alt="" style="height:24px; width:auto;" />
          <span style="font-size:19px; font-weight:700; letter-spacing:0.01em;">AllTracker</span>
        </div>
        <span style="font-size:13px; color:${DUST};">${esc(dateLine)}</span>
      </div>

      <!-- Identity -->
      <div style="position:relative; margin-top:24px; display:flex; align-items:center; gap:14px;">
        <div style="width:56px; height:56px; border-radius:50%; background:rgba(242,240,247,0.06); border:1px solid ${LINE};
          display:flex; align-items:center; justify-content:center; font-size:30px; line-height:1;">${esc(avatar)}</div>
        <div style="min-width:0;">
          <div style="font-size:24px; font-weight:700; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:380px;">${esc(name)}</div>
          ${handle ? `<div style="font-size:14px; color:${DUST}; margin-top:2px;">@${esc(handle)}</div>` : ''}
        </div>
      </div>

      <!-- Hours: the number that matters -->
      <div style="position:relative; margin-top:20px;">
        <div style="font-size:14px; color:${DUST};">Total study hours</div>
        <div style="display:flex; align-items:baseline; gap:10px; margin-top:4px;">
          <span style="font-size:96px; font-weight:700; line-height:0.9; color:${AMBER}; letter-spacing:-0.02em; font-variant-numeric:tabular-nums;">${totalHours.toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: totalHours < 100 ? 1 : 0 })}</span>
          <span style="font-size:22px; font-weight:600; color:${DUST};">hours</span>
        </div>
      </div>

      <!-- Rank + progress to the next one -->
      <div style="position:relative; margin-top:18px;">
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap:12px;">
          <span style="font-size:28px; font-weight:700; white-space:nowrap;">${titleCase(rank.name)} <span style="color:${DUST}; font-weight:600;">${rank.division}</span></span>
          <span style="font-size:13px; color:${DUST}; white-space:nowrap;">${esc(nextLine)}</span>
        </div>
        <div style="margin-top:10px; height:8px; border-radius:99px; background:${LINE}; overflow:hidden;">
          <div style="width:${tierPct}%; height:100%; background:${AMBER}; border-radius:99px;"></div>
        </div>
      </div>

      <!-- Stats -->
      <div style="position:relative; margin-top:18px; display:flex; gap:10px;">
        ${stat('Streak', `${streak} ${streak === 1 ? 'day' : 'days'}`)}
        ${stat('Rank score', rankScore.toLocaleString('en-IN'))}
        ${stat('Level', String(level))}
      </div>

      <!-- Last 7 days -->
      <div style="position:relative; margin-top:18px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; color:${DUST};">
          <span>Last 7 days</span><span style="color:${PAPER}; font-weight:600;">${hoursLabel(weekTotal)}</span>
        </div>
        <div style="margin-top:10px; display:flex; gap:10px;">${bars}</div>
      </div>

      <!-- Footer -->
      <div style="position:relative; margin-top:auto; padding-top:16px; border-top:1px solid ${LINE};
        display:flex; justify-content:space-between; align-items:center; font-size:13px; color:${DUST};">
        <span>Track every hour. Outwork yesterday.</span>
        <span style="color:${PAPER}; font-weight:600;">alltracker.online</span>
      </div>
    </div>`;
  document.body.appendChild(container);

  const captureTarget = container.firstElementChild as HTMLElement | null;
  try {
    if (captureTarget) {
      // Make sure the logo and fonts are ready before taking the picture.
      const logo = captureTarget.querySelector('img');
      if (logo && !logo.complete) await new Promise((res) => { logo.onload = logo.onerror = res; });
      await document.fonts?.ready;
      const dataUrl = await toPng(captureTarget, { backgroundColor: INK, pixelRatio: 2, width: 540, height: 675 });
      openSharePreview(dataUrl, 'SHARE YOUR PROGRESS');
    }
  } catch (e) {
    console.error(e);
  } finally {
    document.body.removeChild(container);
  }
}
