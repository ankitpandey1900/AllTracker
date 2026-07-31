import { GlobalProfile } from '@/types/profile.types';
import { escapeHtml } from '@/utils/security';
import { getRankColor, getRankTitle } from '@/utils/rank.utils';
import { getRankProgression, calculateCompetitiveXP } from '@/utils/calc.utils'; // calculateCompetitiveXP used in renderUserRow & renderPodium
import { formatDuration } from '@/utils/date.utils';
import { NATION_FLAGS } from '@/config/constants';
import { openProfileModal } from '@/features/profile/profile.ui';
import { 
  lbCurrentPage, 
  LB_PAGE_SIZE, 
  setLbCurrentPage 
} from './leaderboard.state';
import { refreshLeaderboard } from './leaderboard';
import { bindLbItemEvents } from '@/features/dashboard/leaderboard.events';
import { appState } from '@/state/app-state';

/** Renders only the players on the current page */
export function renderLbPage(
  listEl: HTMLElement,
  allUsers: GlobalProfile[],
  page: number,
  climbData: { worst: Record<string, number>; best: Record<string, number> },
  myDisplayName: string | null
): void {
  const pageStart = (page - 1) * LB_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + LB_PAGE_SIZE, allUsers.length);

  const podiumEl = document.getElementById('leaderboardPodium');
  let listUsers = allUsers.slice(pageStart, pageEnd);

  // 1. Render Podium and primary page users
  if (page === 1 && podiumEl && allUsers.length >= 3) {
    podiumEl.style.display = 'flex';
    podiumEl.innerHTML = renderPodium(allUsers.slice(0, 3), climbData, myDisplayName);
    
    listUsers = allUsers.slice(3, pageEnd);
    listEl.innerHTML = listUsers
      .map((u, i) => renderUserRow(u, 3 + i, climbData, myDisplayName))
      .join('');
  } else {
    if (podiumEl) podiumEl.style.display = 'none';
    listEl.innerHTML = listUsers
      .map((u, i) => renderUserRow(u, pageStart + i, climbData, myDisplayName))
      .join('');
  }

  // ⚓ 2. MY RANK ANCHOR: If I am not on this page, show a personal row at the bottom
  const myIndex = allUsers.findIndex(u => u.display_name === myDisplayName);
  const isMeOnPage = myIndex >= pageStart && myIndex < pageEnd;

  if (myDisplayName && !isMeOnPage && myIndex !== -1) {
    const myUser = allUsers[myIndex];
    const personalRowHtml = `<div class="lb-anchor-divider"><span>MISSION IDENTITY PINNED</span></div>` + 
                            renderUserRow(myUser, myIndex, climbData, myDisplayName);
    listEl.insertAdjacentHTML('beforeend', personalRowHtml);
  }

  requestAnimationFrame(() => {
    bindLbItemEvents();
  });

  // 🎯 3. RIVALRY CARD: Find the user ranked just above the current user
  const rivalryContainer = document.getElementById('rivalry-card-container');
  if (!rivalryContainer) return;

  const myIdx = allUsers.findIndex(u => u.display_name === myDisplayName);

  // Hide card if user is not found or is already rank #1
  if (!myDisplayName || myIdx <= 0) {
    rivalryContainer.innerHTML = '';
    return;
  }

  const rival = allUsers[myIdx - 1];
  const myUser = allUsers[myIdx];

  // Calculate hours gap to overtake rival
  const hoursDiff = Math.max(0, rival.total_hours - myUser.total_hours);
  const h = Math.floor(hoursDiff);
  const m = Math.round((hoursDiff - h) * 60);
  const diffLabel = hoursDiff < 0.01 ? 'EVEN' : (h > 0 ? `+${h}H ${m}M` : `+${m}M`);

  const rivalName = escapeHtml(rival.display_name);
  const rivalAvatar = rival.avatar || '👤';
  const rivalRank = myIdx; // rival is 1 rank above = myIdx (0-based index of myUser)

  const status = getUserStatus(rival);
  let rivalStatusHTML = '';
  if (status.isFocusing) {
    rivalStatusHTML = `<div style="position: absolute; bottom: -4px; right: -4px; width: 14px; height: 14px; border-radius: 50%; background: #8b5cf6; border: 2px solid #0d1222; box-shadow: 0 0 8px #8b5cf6;" title="Focusing Now"></div>`;
  } else if (status.isOnline) {
    rivalStatusHTML = `<div style="position: absolute; bottom: -4px; right: -4px; width: 14px; height: 14px; border-radius: 50%; background: #10b981; border: 2px solid #0d1222;" title="Online"></div>`;
  }

  // Dynamic Taunt Logic
  let tauntText = 'CLOSING IN';
  let tauntColor = '#10b981'; // Green
  
  if (status.isFocusing) {
    tauntText = 'RIVAL IS FOCUSING';
    tauntColor = '#ef4444'; // Red
  } else if (hoursDiff > 10) {
    tauntText = 'LONG WAY TO GO';
    tauntColor = '#71717a'; // Gray
  } else if (hoursDiff < 2 && hoursDiff > 0.2) {
    tauntText = 'CATCHING UP';
    tauntColor = '#f59e0b'; // Orange
  } else if (hoursDiff <= 0.2) {
    tauntText = 'VERY CLOSE';
    tauntColor = '#ef4444'; // Red
  }

  // Live ETA logic if user is currently running a timer
  const isMeFocusing = appState.activeTimer.isRunning;
  let etaHtml = '';
  if (isMeFocusing && hoursDiff > 0) {
    etaHtml = `<div style="font-size: 0.65rem; color: #3b82f6; font-weight: 800; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 6px;"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#3b82f6; animation: pulseGlow 1.5s infinite;"></span> ACTIVE PURSUIT</div>`;
  }

  const combinedHours = (myUser.total_hours || 0) + (rival.total_hours || 0);
  const myPct = combinedHours > 0 ? ((myUser.total_hours || 0) / combinedHours) * 100 : 50;
  const rivalPct = combinedHours > 0 ? ((rival.total_hours || 0) / combinedHours) * 100 : 50;

  rivalryContainer.innerHTML = `
    <article class="rivalry-card" style="border-radius: 4px; padding: 24px; margin-top: 0; background: #0a0a0a; border: 1px solid #1f1f1f; display: flex; flex-direction: column; gap: 24px;">
       <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
             <span style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
             </span>
             <h3 style="font-family: 'JetBrains Mono', monospace; font-weight: 800; letter-spacing: 2px; color: #ef4444; font-size: 0.75rem; margin: 0; text-transform: uppercase;">Target Acquired</h3>
          </div>
          <span style="font-size: 0.6rem; color: #a1a1aa; font-weight: 800; background: #18181b; border: 1px solid #27272a; padding: 4px 8px; border-radius: 2px; font-family: 'JetBrains Mono', monospace; letter-spacing: 1px;">RIVALRY</span>
       </div>
       
       <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="position: relative; flex-shrink: 0;">
            <div style="width: 52px; height: 52px; border-radius: 4px; border: 1px solid #27272a; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #121212;">
               ${rivalAvatar}
            </div>
            ${rivalStatusHTML}
          </div>
          <div style="flex: 1; min-width: 0; padding-top: 2px;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
               <div style="font-size: 0.65rem; color: #71717a; font-weight: 700; letter-spacing: 1px;">RANK #${rivalRank}</div>
               <div style="font-size: 0.65rem; color: #f59e0b; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                 <span>🔥</span> ${rival.current_streak || 0} DAY STREAK
               </div>
             </div>
             <div style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #e4e4e7; font-size: 1.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 12px;">@${rivalName}</div>
             
             <div style="display: flex; gap: 16px; font-size: 0.65rem; color: #71717a; font-weight: 600;">
               <div style="display: flex; align-items: baseline; gap: 6px;">TOTAL: <span style="color: #e4e4e7; font-weight: 800; font-size: 0.75rem;">${(rival.total_hours || 0).toFixed(1)}H</span></div>
               <div style="display: flex; align-items: baseline; gap: 6px;">TODAY: <span style="color: #e4e4e7; font-weight: 800; font-size: 0.75rem;">${(rival.today_hours || 0).toFixed(1)}H</span></div>
             </div>
          </div>
       </div>

       <div style="border-radius: 4px; padding: 16px 20px; background: #121212; border: 1px solid #1f1f1f;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 0.65rem; color: #71717a; font-weight: 700; letter-spacing: 1px;">OVERTAKE REQUIREMENT</div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <div style="font-size: 0.65rem; color: ${tauntColor}; font-weight: 800; font-style: italic;">
                ${tauntText}
              </div>
              ${etaHtml}
            </div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
             <span style="font-family: 'Tektur', sans-serif; font-weight: 800; color: #ef4444; font-size: 1.5rem; letter-spacing: 1px;">${diffLabel}</span>
             <span style="font-size: 0.65rem; color: #71717a; font-weight: 700; letter-spacing: 1px;">OF FOCUS</span>
          </div>
          
          <div style="margin-top: 16px; height: 6px; background: #1f1f1f; border-radius: 2px; overflow: hidden; display: flex;">
            <div style="height: 100%; background: #3b82f6; width: ${myPct}%; transition: width 0.5s ease;"></div>
            <div style="height: 100%; background: #ef4444; width: ${rivalPct}%; transition: width 0.5s ease;"></div>
          </div>
       </div>
    </article>
  `;
}

/** Shared helper for status calculations */
export function getUserStatus(u: GlobalProfile): {
  isOnline: boolean;
  isFocusing: boolean;
  statusClass: string;
  statusLabel: string;
  todayHoursDisplay: number;
} {
  const lastActive = u.last_active ? new Date(u.last_active) : null;
  const isDateValid = lastActive && !isNaN(lastActive.getTime());
  const diffMins = isDateValid ? Math.max(0, (Date.now() - lastActive.getTime()) / 60000) : null;

  const isOnline = u.is_online === true;

  // Focus check:
  // - Must be within the 10-minute activity window (matches telemetry count)
  // - Must respect is_focus_public privacy setting
  // - Using 10min window (not strict isOnline 60s) so heartbeat delay doesn't break it
  const isRecentlyActive = diffMins !== null && diffMins < 10;
  const isFocusing = u.is_focusing_now === true &&
                     u.is_focus_public !== false &&
                     isRecentlyActive;
  
  let statusClass = 'offline';
  let statusLabel = '';

  if (isFocusing) {
    statusClass = 'focusing';
    statusLabel = 'FOCUSING';
  } else if (isOnline) {
    statusClass = 'online';
    statusLabel = 'ONLINE';
  } else if (diffMins !== null) {
    if (diffMins < 60) {
      statusLabel = `Seen ${Math.floor(diffMins)}m ago`;
    } else if (diffMins < 24 * 60) {
      statusLabel = `Seen ${Math.floor(diffMins / 60)}h ago`;
    } else {
      const days = Math.floor(diffMins / (24 * 60));
      statusLabel = `Seen ${days}d ago`;
    }
  } else {
    statusLabel = 'READY';
  }

  const now = new Date();
  // Timezone Integrity: The backend resets today_hours at Midnight IST (Asia/Kolkata).
  // The frontend MUST evaluate "today" based on IST, otherwise international users will see 
  // their hours incorrectly zeroed out when their local clock crosses midnight.
  const fmtLocal = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const isActuallyToday = lastActive && fmtLocal(lastActive) === fmtLocal(now);
  const todayHoursDisplay = isActuallyToday ? (u.today_hours || 0) : 0;

  return { isOnline, isFocusing, statusClass, statusLabel, todayHoursDisplay };
}

/** Shared hover card renderer */
export function renderHoverCard(
  u: GlobalProfile,
  isMe: boolean,
  isFocusing: boolean,
  todayHoursDisplay: number,
  streakCount: string
): string {
  // 🔥 ELITE VERIFICATION: 10+ Day Streak AND 3+ Hr/Day Average
  const isVerified = (u.current_streak || 0) >= 10 && (u.total_hours >= (u.current_streak || 0) * 3);
  const verifiedTick = isVerified ? `
    <svg class="lb-verified-badge" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; color: #1d9bf0; margin-left: 4px; vertical-align: middle;">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-3.99s-2.6-1.27-3.99-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.97-.2-3.99.81s-1.27 2.6-.81 3.99c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 3.99s2.6 1.27 3.99.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 3.99-.81s1.27-2.6.81-3.99c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.35-6.2 6.78z"></path>
    </svg>` : '';

  const age = u.age ? `${u.age}Y • ` : '';
  const rankTitle = getRankTitle(u.total_hours);
  const rankColor = getRankColor(rankTitle);
  const avatar = u.avatar || `👤`;
  const rankProg = getRankProgression(u.total_hours);

  return `
    <div class="lb-hover-card" style="--hover-color: ${rankColor};">
      <div class="lb-tactical-mesh"></div>
      <div class="lb-hud-corner tl"></div><div class="lb-hud-corner tr"></div>
      
      <div class="hover-header">
         <div class="hover-avatar-wrapper tactical-ring" style="border-color: ${rankColor};">${avatar}</div>
         <div class="hover-player-info">
           <div class="hover-real-name">${u.User_name ? escapeHtml(u.User_name) : 'Operative'}</div>
           <div class="hover-handle">@${escapeHtml(u.display_name)} ${verifiedTick}</div>
           <div class="hover-title" style="color: ${rankColor};">${age}${getRankTitle(u.total_hours)} PROFILE</div>
           <div class="hover-integrity-meter">
              <div class="integrity-text">TRUST SCORE: ${u.integrity_score === 0 ? 'VERIFYING...' : (u.integrity_score || 0) + '%'}</div>
              <div class="integrity-track">
                <div class="integrity-fill" style="width: ${u.integrity_score || 0}%; background: ${u.is_verified ? '#fbbf24' : '#94a3b8'};"></div>
              </div>
           </div>
         </div>
      </div>

      <div class="hud-progression-box">
        <div class="hud-rank-row">
          <span class="hud-rank-label">${rankProg.current}</span>
          <span class="hud-xp-percent">${rankProg.percent}% XP</span>
          <span class="hud-rank-label next">${rankProg.next}</span>
        </div>
        <div class="holographic-bar hud-bar tactical-gauge">
          <div class="holographic-fill" style="width: ${rankProg.percent}%; background: ${rankColor};"></div>
        </div>
      </div>

      <div class="hover-subject-container">
        <div class="focus-label">MISSION TELEMETRY</div>
        <div class="lb-telemetry-readout">
          <div class="readout-row">
            <span class="readout-key">STATUS</span>
            <span class="readout-val" style="color: ${isFocusing ? '#ef4444' : (u.is_online ? '#8b5cf6' : '#64748b')};">
              <span class="lb-pulse-dot" style="background: ${isFocusing ? '#ef4444' : (u.is_online ? '#8b5cf6' : '#64748b')};"></span>
              ${isFocusing ? 'ACTIVE' : (u.is_online ? 'ONLINE' : 'OFFLINE')}
            </span>
          </div>
          <div class="readout-row">
            <span class="readout-key">TARGET</span>
            <span class="readout-val" style="color: ${isFocusing ? '#e2e8f0' : '#94a3b8'};">
              ${isFocusing ? (u.is_focus_public || isMe ? (u.current_focus_subject || 'CLASSIFIED') : '[ CONFIDENTIAL ]') : 'IDLE / REFUELING'}
            </span>
          </div>
        </div>
      </div>

      <div class="hover-stats">
        <div class="hover-stat-box tactical-glass-box">
          <div class="stat-name">LIFETIME_EXP</div>
          <div class="stat-val" style="text-transform: uppercase;">${formatDuration(u.total_hours) || '0H'}</div>
          <div class="tactical-corner bottom-right"></div>
        </div>
        <div class="hover-stat-box tactical-glass-box">
          <div class="stat-name">CURRENT_STREAK</div>
          <div class="stat-val" style="text-transform: uppercase;">${streakCount} DAY${streakCount === '1' ? '' : 'S'}</div>
          <div class="tactical-corner bottom-right"></div>
        </div>
      </div>

      <button class="lb-hud-close tactical-btn">✕ SECURE TERMINAL</button>
    </div>
  `;
}

/** Renders the top 3 users in a special Podium layout */
export function renderPodium(
  topUsers: GlobalProfile[],
  climbData: any,
  myDisplayName: string | null
): string {
  if (topUsers.length < 3) return '';
  // Order for leaderboard display: Olympic style [Silver (2nd), Gold (1st), Bronze (3rd)]
  const displayOrder = [topUsers[1], topUsers[0], topUsers[2]];
  const positions = [1, 0, 2];

  return displayOrder.map((u, idx) => {
    if (!u) return '';
    const globalIndex = positions[idx];
    const isMe = myDisplayName ? u.display_name === myDisplayName : false;
    const rankTitle = getRankTitle(u.total_hours);
    const rankColor = getRankColor(rankTitle);

    const streakMatch = (u.current_rank || '').match(/\[S:(\d+)\]/);
    const streakCount = u.current_streak !== undefined ? String(u.current_streak) : (streakMatch ? streakMatch[1] : '0');
    const avatar = u.avatar || `👤`;
    
    const isoCode = NATION_FLAGS[u.nation] || 'un';
    const flagImg = `<img src="https://flagcdn.com/w40/${isoCode}.png" alt="${u.nation}" style="width: 14px; height: 10px; border-radius: 2px; margin-left: 6px; vertical-align: middle;">`;

    // 🔥 ELITE VERIFICATION: 10+ Day Streak AND 3+ Hr/Day Average
    const isVerified = (u.current_streak || 0) >= 10 && (u.total_hours >= (u.current_streak || 0) * 3);
    const verifiedTick = isVerified ? `
      <svg class="lb-verified-badge" viewBox="0 0 24 24" fill="currentColor" style="width: 12px; height: 12px; color: #1d9bf0; margin-left: 4px; vertical-align: middle;">
        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-3.99s-2.6-1.27-3.99-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.97-.2-3.99.81s-1.27 2.6-.81 3.99c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 3.99s2.6 1.27 3.99.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 3.99-.81s1.27-2.6.81-3.99c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.35-6.2 6.78z"></path>
      </svg>` : '';
    
    const medalColors = ['#fbbf24', '#cbd5e1', '#b45309']; // Gold, Silver, Bronze
    const medalColor = medalColors[globalIndex];
    
    const medalClasses = ['podium-gold', 'podium-silver', 'podium-bronze'];
    const medalClass = medalClasses[globalIndex];

    const delay = globalIndex * 0.15; // Staggered animation
    
    // Positioning and overlap logic
    let overlapStyle = 'z-index: 1;';
    if (globalIndex === 0) {
      overlapStyle = 'z-index: 10; transform: scale(1.05); box-shadow: 0 10px 40px rgba(0,0,0,0.6);'; // Gold sits on top and is larger
    } else if (globalIndex === 1) {
      overlapStyle = 'z-index: 1; margin-right: -24px; transform: scale(0.95); opacity: 0.9;'; // Silver tucks under left of Gold
    } else if (globalIndex === 2) {
      overlapStyle = 'z-index: 1; margin-left: -24px; transform: scale(0.95); opacity: 0.9;'; // Bronze tucks under right of Gold
    }
    
    const { isFocusing, statusClass, statusLabel, todayHoursDisplay } = getUserStatus(u);
    const statusDotColor = isFocusing ? '#ef4444' : (statusClass === 'status-online' ? '#10b981' : '#71717a');

    const rankLabel = globalIndex === 0 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M2 22h20v-2H2v2zm2-4h16l1-10-5 3-4-7-4 7-5-3 1 10z"/></svg>`
      : `${globalIndex + 1}`;

    return `
      <div class="podium-node leaderboard-item ${medalClass} ${isMe ? 'is-me' : ''}" style="border: 1px solid #1f1f1f; animation-delay: ${delay}s; ${overlapStyle}">
        <div class="podium-rank" style="background: ${medalColor}; color: #000; font-family: 'Tektur', sans-serif; display: flex; align-items: center; justify-content: center;">${rankLabel}</div>
        <div class="podium-avatar-wrapper" style="border: 2px solid ${medalColor}; background: #121212; box-shadow: none;">
          <div class="podium-avatar">${avatar}</div>
        </div>
        <div class="podium-info">
          <div class="podium-handle" style="display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">@${escapeHtml(u.display_name)}</span>
            ${flagImg} 
            ${verifiedTick}
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px; margin-top: 2px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${statusDotColor};"></span>
            <span style="font-size: 0.55rem; color: ${statusDotColor}; font-weight: 800; letter-spacing: 1px;">${statusLabel.toUpperCase()}</span>
          </div>
          <div class="podium-hours" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
            <div style="font-family: 'Tektur', sans-serif; font-size: 1.25rem; color: ${medalColor}; font-weight: 800; letter-spacing: 1px; line-height: 1;">
              ${(calculateCompetitiveXP(u.total_hours, u.current_streak || 0, u.integrity_score || 0)).toLocaleString()}
            </div>
            <div style="font-size: 0.55rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 2px; margin-top: 4px; opacity: 0.7;">RANK SCORE</div>
          </div>

          <div class="podium-today" style="display: flex; flex-direction: column; align-items: center; padding: 6px 10px; background: transparent; border-radius: 4px; border: 1px solid #27272a; width: 90%; max-width: 120px;">
            <div style="color: #10b981; font-size: 0.75rem; font-weight: 800; white-space: nowrap;">
              ${formatDuration(todayHoursDisplay) || '0h'} <span style="font-size: 0.55rem; opacity: 0.8;">TODAY</span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.6rem; font-weight: 600; margin-top: 1px; opacity: 0.8; white-space: nowrap;">
              ${formatDuration(u.total_hours) || '0h'} <span style="font-size: 0.5rem; opacity: 0.6;">TOTAL</span>
            </div>
          </div>
        </div>
        ${renderHoverCard(u, isMe, isFocusing, todayHoursDisplay, streakCount)}
      </div>
    `;
  }).join('');
}

/** Renders a single operative row for the World Stage */
export function renderUserRow(
  u: GlobalProfile,
  globalIndex: number,
  climbData: any,
  myDisplayName: string | null
): string {
  const isMe = myDisplayName ? u.display_name === myDisplayName : false;
  const isoCode = NATION_FLAGS[u.nation] || 'un';
  const flagImg = `<img src="https://flagcdn.com/w40/${isoCode}.png" alt="${u.nation}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  const avatar = u.avatar || `👤`;

  const { isFocusing, statusClass, statusLabel, todayHoursDisplay } = getUserStatus(u);
  
  const rankTitle = getRankTitle(u.total_hours);
  const rankColor = getRankColor(rankTitle);
  const currentRank = globalIndex + 1;
  const rankScore = calculateCompetitiveXP(u.total_hours, u.current_streak || 0, u.integrity_score || 0);

  const streakMatch = (u.current_rank || '').match(/\[S:(\d+)\]/);
  const streakCount = u.current_streak !== undefined ? String(u.current_streak) : (streakMatch ? streakMatch[1] : '0');

  const localIndex = globalIndex % LB_PAGE_SIZE;
  const delay = Math.min(localIndex * 0.05, 0.5);

  return `
    <div class="leaderboard-item legacy-row ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor}; animation-delay: ${delay}s;">
      
      <div class="lb-row-rank-num">${currentRank}</div>

      <div class="lb-row-avatar-group">
        <div class="lb-avatar-wrapper">
          <div class="lb-avatar" style="border-color: ${rankColor};">${avatar}</div>
          <div class="nation-emblem">${flagImg}</div>
        </div>
      </div>

      <div class="lb-row-main-info">
        <div class="lb-row-identity">
          <span class="lb-row-handle">@${escapeHtml(u.display_name)}</span>
          ${((u.current_streak || 0) >= 10 && u.total_hours >= (u.current_streak || 0) * 3) ? '<span class="lb-row-verified">✔</span>' : ''}
        </div>
        <div class="lb-row-meta">
          <span class="status-tag ${statusClass}">${statusLabel}</span>
        </div>
        <div class="lb-row-score-bar">
          <div class="lb-row-score-fill" style="width: ${Math.min(100, (u.total_hours % 10) * 10)}%; background: ${rankColor};"></div>
        </div>
      </div>

      <div class="lb-row-telemetry">
        <div class="lb-row-total">${formatDuration(u.total_hours) || '0H'}</div>
        <div class="lb-row-today">+${formatDuration(todayHoursDisplay) || '0H'} <span class="today-label">TODAY</span></div>
        <div class="lb-row-rank-score">${rankScore.toLocaleString()} <span class="score-label">PTS</span></div>
      </div>
      
      ${renderHoverCard(u, isMe, isFocusing, todayHoursDisplay, streakCount)}
    </div>
  `;
}

/** Helper to calculate age */
export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/** Enhanced Pagination logic with smart windowing */
export function renderLbPagination(listEl: HTMLElement, totalUsers: number): void {
  const existing = document.getElementById('lb-pagination');
  if (existing) existing.remove();
  const totalPages = Math.ceil(totalUsers / LB_PAGE_SIZE);
  if (totalPages <= 1) return;

  const paginationEl = document.createElement('div');
  paginationEl.id = 'lb-pagination';
  paginationEl.className = 'lb-pagination';
  
  const pages: string[] = [];
  
  // Prev button
  pages.push(`<button class="lb-page-btn" data-page="prev" ${lbCurrentPage === 1 ? 'disabled' : ''} aria-label="Previous page">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`);

  const windowSize = 3;
  let start = Math.max(1, lbCurrentPage - 1);
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  if (start > 1) {
    pages.push(`<button class="lb-page-btn" data-page="1">1</button>`);
    if (start > 2) pages.push(`<span class="lb-page-ellipsis">\u2026</span>`);
  }

  for (let p = start; p <= end; p++) {
    pages.push(`<button class="lb-page-btn ${p === lbCurrentPage ? 'active' : ''}" data-page="${p}">${p}</button>`);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(`<span class="lb-page-ellipsis">\u2026</span>`);
    pages.push(`<button class="lb-page-btn" data-page="${totalPages}">${totalPages}</button>`);
  }

  // Next button
  pages.push(`<button class="lb-page-btn" data-page="next" ${lbCurrentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`);

  const startIdx = (lbCurrentPage - 1) * LB_PAGE_SIZE + 1;
  const endIdx = Math.min(lbCurrentPage * LB_PAGE_SIZE, totalUsers);

  paginationEl.innerHTML = `
    <div class="lb-page-count">${startIdx}\u2013${endIdx} of ${totalUsers} operatives</div>
    <div class="lb-page-buttons">${pages.join('')}</div>
  `;
  listEl.after(paginationEl);

  paginationEl.querySelectorAll('.lb-page-btn').forEach(btn => {
    (btn as HTMLElement).onclick = () => {
      const raw = (btn as HTMLElement).dataset.page;
      if (!raw || (btn as HTMLButtonElement).disabled) return;
      if (raw === 'prev') setLbCurrentPage(Math.max(1, lbCurrentPage - 1));
      else if (raw === 'next') setLbCurrentPage(Math.min(totalPages, lbCurrentPage + 1));
      else setLbCurrentPage(parseInt(raw));
      
      refreshLeaderboard();
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}
// Force Refresh
