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

  rivalryContainer.innerHTML = `
    <article class="rivalry-card" style="background: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 4px; padding: 24px; margin-top: 0;">
       <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
             <span style="font-size: 1.2rem;">🎯</span>
             <h3 style="font-family: 'JetBrains Mono', monospace; font-weight: 900; letter-spacing: 2px; color: #ef4444; font-size: 0.75rem; margin: 0; text-transform: uppercase;">Target Acquired</h3>
          </div>
          <span style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 2px; font-family: 'JetBrains Mono', monospace;">RIVALRY</span>
       </div>
       
       <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
          <div style="width: 48px; height: 48px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.5); background: #0b1121; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
             ${rivalAvatar}
          </div>
          <div style="min-width: 0;">
             <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">RANK #${rivalRank}</div>
             <div style="font-family: 'Outfit'; font-weight: 800; color: #fff; font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">@${rivalName}</div>
          </div>
       </div>

       <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">OVERTAKE REQUIREMENT:</div>
          <div style="display: flex; align-items: baseline; gap: 6px;">
             <span style="font-family: 'Tektur'; font-weight: 900; color: #ef4444; font-size: 1.4rem;">${diffLabel}</span>
             <span style="font-size: 0.65rem; color: #64748b; font-weight: 800;">OF FOCUS</span>
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

  // 🛡️ Focus check:
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
  // 🛡️ TIMEZONE INTEGRITY: The backend resets today_hours at Midnight IST (Asia/Kolkata).
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
  const verifiedTick = u.is_verified ? `
    <svg class="lb-verified-badge" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; color: #1d9bf0; margin-left: 4px; vertical-align: middle;">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-3.99s-2.6-1.27-3.99-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.97-.2-3.99.81s-1.27 2.6-.81 3.99c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 3.99s2.6 1.27 3.99.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 3.99-.81s1.27-2.6.81-3.99c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.35-6.2 6.78z"></path>
    </svg>` : '';

  const age = u.dob ? `${calculateAge(u.dob)}Y • ` : '';
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
            <span class="readout-val" style="color: ${isFocusing ? '#ef4444' : (u.is_online ? '#10b981' : '#64748b')};">
              <span class="lb-pulse-dot" style="background: ${isFocusing ? '#ef4444' : (u.is_online ? '#10b981' : '#64748b')};"></span>
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
  // Reorder for podium display: [Silver (2nd), Gold (1st), Bronze (3rd)]
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

    const verifiedTick = u.is_verified ? `
      <svg class="lb-verified-badge" viewBox="0 0 24 24" fill="currentColor" style="width: 12px; height: 12px; color: #1d9bf0; margin-left: 4px; vertical-align: middle;">
        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-3.99s-2.6-1.27-3.99-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.97-.2-3.99.81s-1.27 2.6-.81 3.99c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 3.99s2.6 1.27 3.99.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 3.99-.81s1.27-2.6.81-3.99c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.35-6.2 6.78z"></path>
      </svg>` : '';
    
    const medalClasses = ['podium-gold', 'podium-silver', 'podium-bronze'];
    const medalClass = medalClasses[globalIndex];
    const delay = globalIndex * 0.15; // Staggered animation
    
    const { isFocusing, statusClass, statusLabel, todayHoursDisplay } = getUserStatus(u);
    const statusPulse = isFocusing ? `<div class="podium-pulse" style="background: #ef4444;"></div>` : '';

    return `
      <div class="podium-node leaderboard-item ${medalClass} ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor}; animation-delay: ${delay}s;">
        <div class="podium-rank">${globalIndex + 1}</div>
        <div class="podium-avatar-wrapper" style="border-color: ${rankColor};">
          <div class="podium-avatar">${avatar}</div>
          ${statusPulse}
        </div>
        <div class="podium-info">
          <div class="podium-handle" style="display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">@${escapeHtml(u.display_name)}</span>
            ${flagImg} 
            ${verifiedTick}
          </div>
          <div class="status-tag ${statusClass}" style="margin-bottom: 2px;">${statusLabel}</div>
          <div class="podium-hours" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 1.2rem; color: #fbbf24; font-weight: 900; letter-spacing: 1px; line-height: 1;">
              ${(calculateCompetitiveXP(u.total_hours, u.current_streak || 0, u.integrity_score || 0)).toLocaleString()}
            </div>
            <div style="font-size: 0.55rem; color: #94a3b8; font-weight: 800; letter-spacing: 2px; margin-top: 4px; opacity: 0.7;">RANK SCORE</div>
          </div>

          <div class="podium-today" style="display: flex; flex-direction: column; align-items: center; padding: 6px 10px; background: rgba(34, 197, 94, 0.05); border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.1); width: 90%; max-width: 120px;">
            <div style="color: #22c55e; font-size: 0.75rem; font-weight: 800; white-space: nowrap;">
              ${formatDuration(todayHoursDisplay) || '0h'} <span style="font-size: 0.55rem; opacity: 0.8;">TODAY</span>
            </div>
            <div style="color: #94a3b8; font-size: 0.6rem; font-weight: 600; margin-top: 1px; opacity: 0.8; white-space: nowrap;">
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
    <div class="leaderboard-item legacy-row ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor}; animation-delay: ${delay}s; padding: 16px; margin-bottom: 2px; border-radius: 12px; background: rgba(13, 17, 23, 0.4); border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 16px;">
      
      <!-- Rank Num -->
      <div class="rank-num" style="width: 24px; font-family: 'Tektur'; font-weight: 900; color: #475569; font-size: 0.9rem;">${currentRank}</div>

      <!-- Avatar Wrapper -->
      <div class="lb-avatar-wrapper" style="position: relative; width: 48px; height: 48px; min-width: 48px;">
        <div class="lb-avatar" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; background: #0f172a;">${avatar}</div>
        <div class="nation-emblem" style="position: absolute; bottom: 0; right: 0; width: 18px; height: 18px; border: 2px solid #0d1222; border-radius: 50%; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">${flagImg}</div>
      </div>

      <!-- Identity & Metadata -->
      <div class="lb-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
        <div class="lb-name" style="font-weight: 900; color: #fff; font-size: 1rem; letter-spacing: 0.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">@${escapeHtml(u.display_name)}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
           <span style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">${statusLabel}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
           <span style="font-size: 0.75rem; font-weight: 900; color: #fff;">${rankScore.toLocaleString()}</span>
           <span style="font-size: 0.6rem; color: #475569; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">RANK SCORE</span>
        </div>
        <div class="lb-xp-container" style="height: 3px; background: rgba(255,255,255,0.05); border-radius: 99px; width: 100px; margin-top: 6px; overflow: hidden;">
           <div class="lb-xp-bar" style="height: 100%; width: ${Math.min(100, (u.total_hours % 10) * 10)}%; background: ${rankColor};"></div>
        </div>
      </div>

      <!-- Time Telemetry -->
      <div class="lb-hours-container" style="text-align: right; min-width: 100px;">
        <div class="lb-total-hours" style="font-family: 'Tektur'; font-size: 1.4rem; font-weight: 900; color: #fff; line-height: 1;">${formatDuration(u.total_hours) || '0h'}</div>
        <div class="lb-today-badge" style="font-size: 0.75rem; font-weight: 900; color: #10b981; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
           ${formatDuration(todayHoursDisplay) || '0H'} TODAY
        </div>
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
