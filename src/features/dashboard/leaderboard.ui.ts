import { GlobalProfile } from '@/types/profile.types';
import { escapeHtml } from '@/utils/security';
import { getRankColor } from '@/utils/rank.utils';
import { getRankProgression } from '@/utils/calc.utils';
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
  const isFocusing = u.is_focusing_now && isOnline;
  
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
  const fmtIST = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const isActuallyToday = lastActive && fmtIST(lastActive) === fmtIST(now);
  const todayHoursDisplay = isActuallyToday ? (u.today_hours || 0) : 0;

  return { isOnline, isFocusing, statusClass, statusLabel, todayHoursDisplay };
}

/** Shared hover card renderer */
export function renderHoverCard(
  u: GlobalProfile,
  rankColor: string,
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
  const title = (u.current_rank || 'IRON').replace(/\[B:\d+\]/, '').replace('[PRIV]', '').trim();
  const avatar = u.avatar || `👤`;
  const rankProg = getRankProgression(u.total_hours);

  return `
    <div class="lb-hover-card" style="--hover-color: ${rankColor};">
      <div class="lb-tactical-mesh"></div>
      <div class="lb-hud-corner tl"></div><div class="lb-hud-corner tr"></div>
      
      <div class="hover-header">
         <div class="hover-avatar-wrapper" style="border-color: ${rankColor};">${avatar}</div>
         <div class="hover-player-info">
           <div class="hover-real-name">${u.User_name ? escapeHtml(u.User_name) : 'Operative'}</div>
           <div class="hover-handle">@${escapeHtml(u.display_name)} ${verifiedTick}</div>
           <div class="hover-title">${age}${title.toUpperCase()} PROFILE</div>
           <div class="hover-integrity" style="color: ${u.is_verified ? '#fbbf24' : '#94a3b8'}; font-size: 0.65rem; margin-top: 2px; font-weight: bold; letter-spacing: 0.5px;">
              TRUST SCORE: ${u.integrity_score || 0}% ${u.is_verified ? '(VERIFIED)' : '(MANUAL)'}
           </div>
         </div>
      </div>

      <div class="hud-progression-box">
        <div class="hud-rank-row">
          <span class="hud-rank-label">${rankProg.current}</span>
          <span class="hud-xp-percent">${rankProg.percent}% XP</span>
          <span class="hud-rank-label next">${rankProg.next}</span>
        </div>
        <div class="holographic-bar hud-bar">
          <div class="holographic-fill" style="width: ${rankProg.percent}%; background: ${rankColor}; box-shadow: 0 0 10px ${rankColor};"></div>
        </div>
      </div>

      <div class="hover-subject-container">
        <div class="focus-label">MISSION TELEMETRY</div>
        <div class="lb-mission-status-link">
          <span class="lb-pulse-dot" style="background: ${isFocusing ? '#ef4444' : rankColor}; box-shadow: 0 0 8px ${isFocusing ? '#ef4444' : rankColor}"></span>
          <span class="focus-topic ${!isFocusing ? 'offline-topic' : ''}" style="--focus-color: ${isFocusing ? '#ef4444' : rankColor}">
            ${isFocusing ? (u.is_focus_public || isMe ? (u.current_focus_subject || 'ACTIVE MISSION') : '[ CONFIDENTIAL MISSION ]') : 'IDLE / REFUELING'}
          </span>
        </div>
      </div>

      <div class="hover-stats">
        <div class="hover-stat-box">
          <div class="stat-name">LIFETIME_EXP</div>
          <div class="stat-val">${formatDuration(u.total_hours) || '0h'}</div>
        </div>
        <div class="hover-stat-box">
          <div class="stat-name">SESSION_LOG</div>
          <div class="stat-val">${formatDuration(todayHoursDisplay) || '0h'}</div>
        </div>
        <div class="hover-stat-box">
          <div class="stat-name">BEST_STREAK</div>
          <div class="stat-val">${streakCount} DAYS</div>
        </div>
      </div>

      <button class="lb-hud-close">✕ SECURE TERMINAL</button>
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
    const rankRaw = u.current_rank || 'IRON';
    const streakMatch = rankRaw.match(/\[B:(\d+)\]/);
    const streakCount = streakMatch ? streakMatch[1] : '0';
    const title = rankRaw.replace(/\[B:\d+\]/, '').replace('[PRIV]', '').trim();
    const rankColor = getRankColor(title);
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
    const statusPulse = isFocusing ? `<div class="podium-pulse" style="background: #ef4444; box-shadow: 0 0 10px #ef4444;"></div>` : '';

    return `
      <div class="podium-node leaderboard-item ${medalClass} ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor}; animation-delay: ${delay}s;">
        <div class="podium-rank">${globalIndex + 1}</div>
        <div class="podium-avatar-wrapper" style="border-color: ${rankColor}; box-shadow: 0 0 20px ${rankColor}40;">
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
          <div class="podium-hours">${formatDuration(u.total_hours) || '0h'}</div>
          <div class="podium-today">${formatDuration(todayHoursDisplay) || '0h'} today</div>
        </div>
        ${renderHoverCard(u, rankColor, isMe, isFocusing, todayHoursDisplay, streakCount)}
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
  
  const level = Math.floor(u.total_hours / 10) + 1;
  const xpPercent = Math.min(100, (u.total_hours % 10) * 10);
  
  const rankRaw = u.current_rank || 'IRON';
  const streakMatch = rankRaw.match(/\[B:(\d+)\]/);
  const streakCount = streakMatch ? streakMatch[1] : '0';
  const title = rankRaw.replace(/\[B:\d+\]/, '').replace('[PRIV]', '').trim();

  const rankColor = getRankColor(title);
  const currentRank = globalIndex + 1;
  
  const worstSeen = climbData.worst[u.display_name] || currentRank;
  const bestSeen = climbData.best[u.display_name] || currentRank;
  const jumpDelta = worstSeen - currentRank;
  const dropDelta = currentRank - bestSeen;
  let trendHtml = '';
  if (jumpDelta > 0) trendHtml = `<div class="rank-delta trend-up"><span>▲ ${jumpDelta}</span></div>`;
  else if (dropDelta > 0) trendHtml = `<div class="rank-delta trend-down"><span>▼ ${dropDelta}</span></div>`;

  const medalClasses = ['lb-medal-gold', 'lb-medal-silver', 'lb-medal-bronze'];
  const customMedal = globalIndex < 3
    ? `<span class="pilot-medal ${medalClasses[globalIndex]}">${globalIndex + 1}</span>`
    : `${globalIndex + 1}`;

  const age = u.dob ? `${calculateAge(u.dob)}Y • ` : '';

  const localIndex = globalIndex % LB_PAGE_SIZE;
  const delay = Math.min(localIndex * 0.05, 0.5);

  return `
    <div class="leaderboard-item glass-row ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor}; animation-delay: ${delay}s;">
      <div class="rank-num">${customMedal}</div>
      <div class="lb-avatar-wrapper">
        <div class="lb-avatar" style="border-color: ${rankColor};">${avatar}</div>
        <div class="nation-emblem">${flagImg}</div>
      </div>
      <div class="lb-info">
        <div class="lb-name">
          <span class="lb-handle">@${escapeHtml(u.display_name)} ${(u as any).is_verified ? `
            <svg class="lb-verified-badge" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; color: #1d9bf0; margin-left: 4px; vertical-align: middle; display: inline-block;">
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-3.99s-2.6-1.27-3.99-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.97-.2-3.99.81s-1.27 2.6-.81 3.99c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 3.99s2.6 1.27 3.99.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 3.99-.81s1.27-2.6.81-3.99c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.35-6.2 6.78z"></path>
            </svg>` : ''}</span>
          <span class="status-tag ${statusClass}">${statusLabel}</span>
        </div>
        <div class="lb-meta">${age}Lvl ${level} • <span style="color: ${rankColor}; font-weight: 800;">${title.toUpperCase()}</span></div>
        <div class="lb-xp-container"><div class="lb-xp-bar" style="width: ${xpPercent}%; background: ${rankColor};"></div></div>
      </div>
      <div class="lb-hours-container">
        <div class="lb-total-hours">${formatDuration(u.total_hours) || '0h'}</div>
        <div class="lb-today-badge">${formatDuration(todayHoursDisplay) || '0h'} today${trendHtml}</div>
      </div>
      
      ${renderHoverCard(u, rankColor, isMe, isFocusing, todayHoursDisplay, streakCount)}
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
