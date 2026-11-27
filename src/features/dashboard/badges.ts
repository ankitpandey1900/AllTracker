/**
 * Handles the Badge System (Achievements).
 * 
 * It looks at your study data to see if you've earned any new badges, 
 * and then draws the grid on the dashboard.
 */

import { appState } from '@/state/app-state';
import { BADGES, getStreak, getTotalHours } from '@/config/constants';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { showToast, startConfetti } from '@/utils/dom.utils';
import { openSharePreview } from '@/features/dashboard/share-preview';
import { getSecureLocalProfileString } from '@/utils/security';
import { toPng } from 'html-to-image';
import { badgeIcon } from '@/features/dashboard/badge-icons';

/** Checks all badges and unlocks any newly earned ones */
export function checkBadges(): void {
  const data = appState.trackerData;
  let newBadge = false;

  for (const badge of BADGES) {
    if (appState.settings.unlockedBadges.includes(badge.id)) continue;
    if (badge.condition(data)) {
      appState.settings.unlockedBadges.push(badge.id);
      newBadge = true;
      showToast(`Badge unlocked: ${badge.name}`, 'success', 5000);
    }
  }

  if (newBadge) {
    saveSettingsToStorage(appState.settings);
    startConfetti();
  }
}

/** Badges grouped into ladders, so you can see what's next and how close you are. */
const TRACKS: { title: string; unit: string; ids: [string, number][] }[] = [
  { title: 'Streak', unit: 'days', ids: [['streak_3', 3], ['streak_7', 7], ['streak_14', 14], ['streak_30', 30], ['streak_50', 50], ['streak_100', 100]] },
  { title: 'Hours', unit: 'h', ids: [['hours_10', 10], ['hours_50', 50], ['hours_100', 100], ['hours_250', 250], ['hours_500', 500], ['hours_1000', 1000]] },
  { title: 'Problems', unit: 'solved', ids: [['problems_100', 100], ['problems_500', 500]] },
];
const MOMENTS = ['weekend_warrior', 'iron_will', 'problem_solver', 'overachiever'];

const SHARE_X = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
const SHARE_LI = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';

function medal(id: string, state: 'earned' | 'next' | 'later', goal: string, pct = 0): string {
  const b = BADGES.find((x) => x.id === id);
  if (!b) return '';
  const share = state === 'earned' ? `
    <div class="bm-share">
      <button class="share-btn share-badge-btn" data-network="x" data-badge="${b.name}" title="Share on X">${SHARE_X}</button>
      <button class="share-btn share-badge-btn" data-network="linkedin" data-badge="${b.name}" title="Share on LinkedIn">${SHARE_LI}</button>
    </div>` : '';
  return `
    <div class="bm-medal is-${state}" title="${b.description}">
      <div class="bm-disc" style="--p:${Math.round(pct)}"><span>${badgeIcon(id, 24)}</span></div>
      <div class="bm-name">${b.name}</div>
      <div class="bm-goal">${goal}</div>
      ${share}
    </div>`;
}

/** Renders the badge ladders in the badges modal */
export function renderBadges(): void {
  const container = document.getElementById('badgeGrid');
  if (!container) return;
  container.className = 'bm-tracks';

  const data = appState.trackerData;
  const earned = new Set(appState.settings.unlockedBadges);
  const totalProblems = data.reduce((s, d) => s + (d.problemsSolved || 0), 0);
  const values: Record<string, number> = {
    Streak: getStreak(data),
    Hours: getTotalHours(data),
    Problems: totalProblems,
  };
  const fmt = (n: number) => Math.floor(n).toLocaleString('en-IN');

  const tracks = TRACKS.map((t) => {
    const current = values[t.title] || 0;
    let nextShown = false;
    const medals = t.ids.map(([id, target]) => {
      if (earned.has(id)) return medal(id, 'earned', `${fmt(target)} ${t.unit}`);
      if (!nextShown) {
        nextShown = true;
        return medal(id, 'next', `${fmt(Math.min(current, target))} / ${fmt(target)} ${t.unit}`, (current / target) * 100);
      }
      return medal(id, 'later', `${fmt(target)} ${t.unit}`);
    }).join('');
    return `
      <section class="bm-track">
        <header class="bm-track-head"><h3>${t.title}</h3><span>${fmt(current)} ${t.unit}</span></header>
        <div class="bm-row">${medals}</div>
      </section>`;
  }).join('');

  const momentsEarned = MOMENTS.filter((id) => earned.has(id)).length;
  const moments = `
    <section class="bm-track">
      <header class="bm-track-head"><h3>Moments</h3><span>${momentsEarned} of ${MOMENTS.length}</span></header>
      <div class="bm-row">${MOMENTS.map((id) => {
        const b = BADGES.find((x) => x.id === id);
        return medal(id, earned.has(id) ? 'earned' : 'later', b ? b.description : '');
      }).join('')}</div>
    </section>`;

  const total = BADGES.length;
  const got = BADGES.filter((b) => earned.has(b.id)).length;
  container.innerHTML = `
    <div class="bm-summary">
      <div><strong>${got}</strong> of ${total} badges earned</div>
      <div class="bm-summary-bar"><span style="width:${Math.round((got / total) * 100)}%"></span></div>
    </div>
    ${tracks}
    ${moments}`;

  // Attach event delegation for share buttons
  if (!(container as any)._hasShareListener) {
    container.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest('.share-btn') as HTMLElement;
      if (!btn) return;
      e.stopPropagation();
      
      const badgeName = btn.getAttribute('data-badge');
      if (!badgeName) return;
      const badgeObj = BADGES.find(b => b.name === badgeName);
      if (!badgeObj) return;

      const network = btn.getAttribute('data-network') || undefined;
      const text = `🏆 Just unlocked the '${badgeName}' badge on AllTracker! Chasing the next target now. #100DaysOfCode #AllTracker`;
      try {
        // Copy text to clipboard
        await navigator.clipboard.writeText(text);
        showToast('Caption copied to clipboard!', 'info', 3000);
        
        const profileRaw = getSecureLocalProfileString();
        let displayName = 'OPERATIVE';
        let realName = 'Agent';
        if (profileRaw) {
          try { 
            const profile = JSON.parse(profileRaw);
            displayName = profile.displayName || 'OPERATIVE'; 
            realName = profile.realName || profile.displayName || 'Agent';
          } catch(e){}
        }

        // Create off-screen container for a professional branded card
        const captureDiv = document.createElement('div');
        captureDiv.style.position = 'absolute';
        captureDiv.style.top = '-9999px';
        captureDiv.style.left = '-9999px';
        document.body.appendChild(captureDiv);

        captureDiv.innerHTML = `
          <div id="badgeShareCardCapture" style="
            width: 500px;
            padding: 40px;
            background: radial-gradient(circle at 50% 42%, rgba(247,169,40,0.14) 0%, transparent 58%), #0E0D13;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            font-family: ${getComputedStyle(document.body).fontFamily.replace(/"/g, "'")};
            color: #F2F0F7;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          ">
            <!-- Background subtle grid -->
            <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 20px 20px; z-index: 0; pointer-events: none;"></div>
            
            <div style="position: relative; z-index: 1; text-align: center; margin-bottom: 14px;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #a1a1aa; letter-spacing: 4px; margin-bottom: 8px;">ACHIEVEMENT UNLOCKED</div>
              <div style="font-weight: 800; font-size: 1.4rem; letter-spacing: 0.5px; color: #fff; margin-bottom: 2px;">${realName}</div>
              <div style="font-weight: 600; font-size: 0.9rem; color: #a1a1aa;">@${displayName}</div>
            </div>

            <div style="position: relative; z-index: 1; width: 140px; height: 140px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #F7A928; box-shadow: 0 4px 20px rgba(0,0,0,0.2); margin: 10px 0;">
              ${badgeIcon(badgeObj.id, 72)}
              <div style="position: absolute; bottom: 0; right: 0; width: 40px; height: 40px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid #121214;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>

            <div style="position: relative; z-index: 1; text-align: center; margin-bottom: 20px;">
              <div style="font-size: 2.2rem; font-weight: 800; color: #f59e0b; text-shadow: 0 0 30px rgba(245, 158, 11, 0.4); margin-bottom: 8px; letter-spacing: -0.5px;">${badgeObj.name}</div>
              <div style="font-size: 0.95rem; color: #a1a1aa; font-weight: 500; letter-spacing: 1px; max-width: 300px; line-height: 1.4;">${badgeObj.description}</div>
            </div>

            <!-- BRANDING FOOTER -->
            <div style="position: relative; z-index: 1; width: 100%; display: flex; justify-content: center; align-items: center; margin-top: 10px; padding-top: 24px;">
              <div style="font-weight: 800; font-size: 1.8rem; letter-spacing: -1px; opacity: 0.95;">
                <span style="display:inline-flex; align-items:center; gap:10px; color: #F2F0F7;"><img src="/logo-mark.svg?v=7" alt="" style="height:26px; width:auto;" />AllTracker</span>
              </div>
            </div>
          </div>
        `;
        
        await new Promise(res => setTimeout(res, 100)); // allow DOM to settle
        const targetEl = captureDiv.firstElementChild as HTMLElement;
        
        if (targetEl) {
          const dataUrl = await toPng(targetEl, {
            backgroundColor: 'transparent',
            pixelRatio: 2
          });
          
          openSharePreview(dataUrl, `SHARE BADGE: ${badgeName.toUpperCase()}`, network, text, 'https://www.alltracker.online');
        }
        
        document.body.removeChild(captureDiv);
      } catch (err) {
        console.error(err);
        showToast('Failed to generate image', 'error');
      }
    });
    (container as any)._hasShareListener = true;
  }
}
