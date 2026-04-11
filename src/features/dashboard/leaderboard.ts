import { appState } from '@/state/app-state';
import Registry from '@/utils/lifecycle';
import { STORAGE_KEYS, RANK_TIERS, SUPABASE_TABLES, NATION_FLAGS } from '@/config/constants';
import { fetchLeaderboard, fetchGlobalTelemetry } from '@/services/supabase.service';
import type { GlobalProfile } from '@/types/profile.types';
import { setupPasswordToggle } from '@/services/auth.service';
import { escapeHtml } from '@/utils/security';
import { getRankColor, getDetailedRankTitle } from '@/utils/rank.utils';

// 📡 FEATURE BRIDGE: Profile and Identity logic moved to src/features/profile/
import { syncProfileBroadcast, updateLastInteraction, lastInteractionAt } from '@/features/profile/profile.manager';
import { openProfileModal } from '@/features/profile/profile.ui';
import { getRankProgression, calculateTodayStudyHours, calculateTotalStudyHours, calculateStreak } from '@/utils/calc.utils';

/**
 * Starts the leaderboard and platform telemetry systems.
 */
export async function initWorldStage(): Promise<void> {
  // 1. Initial Render
  await refreshLeaderboard();

  // 2. ⚡ REAL-TIME HUD: Live database listeners
  import('@/services/supabase.service').then(({ subscribeToRealtimeTelemetry }) => {
    subscribeToRealtimeTelemetry((payload) => {
      // Fast-track HUD update and rank refresh
      updateGlobalHUD();
      refreshLeaderboard();
    });
  });

  // 3. Fallback Periodic updates (Managed Registry)
  Registry.setInterval('lb_polling', () => refreshLeaderboard(), 60000);

  // 4. Bind Global Modal Actions
  const closeProfileBtn = document.getElementById('closeProfileModal');
  if (closeProfileBtn) {
    closeProfileBtn.onclick = () => {
      const modal = document.getElementById('profileSetupModal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    };
  }

  // 5. Build Initial Global Telemetry
  await refreshLeaderboard();
  
  setupPasswordToggle('toggleCurrentKey', 'currentSecretKeyInput');
  setupPasswordToggle('toggleNewKey', 'newSecretKeyInput');

  // 6. Start Global Heartbeat
  initActivityTracking();

  // 📡 REACTIVE HYDRATION: Listen for identity sync to update UI instantly
  window.addEventListener('all-tracker-identity-sync', () => {
    refreshLeaderboard();
  });
}


/** Tracks mouse/keyboard activity and sends heartbeats to update online status */
export function initActivityTracking(): void {
  const updateActivity = () => { updateLastInteraction(); };
  window.addEventListener('mousedown', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('touchstart', updateActivity);
  window.addEventListener('scroll', updateActivity);

  // 🚀 PERFECT SYNC HEARTBEAT: Broadcaster
  Registry.setInterval('profile_heartbeat', () => {
    const isTimerRunning = appState.activeTimer.isRunning;
    const isRecentActive = (Date.now() - lastInteractionAt) < 30 * 1000;
    if (isTimerRunning || isRecentActive) {
      syncProfileBroadcast();
    }
  }, 25000);

  // 🛰️ LIFECYCLE CLEANUP
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncProfileBroadcast();
  });

  window.addEventListener('beforeunload', () => syncProfileBroadcast());
}

/** Fetches and renders the global rankings and platform stats */
const LB_PAGE_SIZE = 8;
let lbCurrentPage = 1;
let lbAllUsers: GlobalProfile[] = [];

export async function refreshLeaderboard(): Promise<void> {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  // 1. Fetch Global Telemetry
  const telemetry = await fetchGlobalTelemetry();
  if (telemetry) {
    const totalEl = document.getElementById('telemetry-total-pilots');
    const activeEl = document.getElementById('telemetry-active-now');

    if (totalEl) totalEl.textContent = telemetry.total_pilots.toLocaleString();
    if (activeEl) activeEl.textContent = telemetry.active_now.toLocaleString();
  }

  // 2. Fetch Leaderboard Data
  const users = await fetchLeaderboard();
  
  const profileData = getSecureLocalProfileString();
  const myDisplayName = profileData ? JSON.parse(profileData).displayName : null;

  // 🛡️ SYNC GUARD: Prevent redundant re-renders if data + viewer identity are identical
  const dataFingerprint = JSON.stringify({
    viewer: myDisplayName,
    users: users.map(u => ({ 
      id: u.display_name, 
      h: u.total_hours, 
      f: u.is_focusing_now,
      m: u.current_focus_subject // Mission name
    }))
  });

  if (dataFingerprint === listEl.dataset.lastFingerprint) {
    console.log('✅ LB CACHE: Data and Identity unchanged. Skipping render.');
    return;
  }
  listEl.dataset.lastFingerprint = dataFingerprint;

  const totalPages = Math.ceil(users.length / LB_PAGE_SIZE);
  if (lbCurrentPage > totalPages) lbCurrentPage = Math.max(1, totalPages);
  lbAllUsers = users;

  // 🛰️ HIGH-FIDELITY TELEMETRY: Calculate platform pulse
  await updateGlobalHUD(users);

  // 3. Climb Engine (shows relative rank movement today)
  const CLIMB_KEY = 'arena_climb_v2';
  const todayStr = new Date().toISOString().split('T')[0];
  let climbData = { date: todayStr, worst: {} as Record<string, number>, best: {} as Record<string, number> };

  const savedClimb = localStorage.getItem(CLIMB_KEY);
  if (savedClimb) {
    const parsed = JSON.parse(savedClimb);
    if (parsed.date === todayStr) climbData = parsed;
  }

  // Morning Anchors for Climb tracking
  const morningRanks = [...users]
    .sort((a, b) => {
      const aStart = a.total_hours - (a.today_hours || 0);
      const bStart = b.total_hours - (b.today_hours || 0);
      return Math.abs(bStart - aStart) < 0.0001 ? (b.total_hours - a.total_hours) : (bStart - aStart);
    })
    .reduce((acc, u, idx) => {
      acc[u.display_name] = idx + 1;
      return acc;
    }, {} as Record<string, number>);

  users.forEach((u, idx) => {
    const cur = idx + 1;
    const morningPos = morningRanks[u.display_name] || cur;
    if (!climbData.worst[u.display_name]) climbData.worst[u.display_name] = morningPos;
    else if (morningPos > climbData.worst[u.display_name]) climbData.worst[u.display_name] = morningPos;
    if (cur > climbData.worst[u.display_name]) climbData.worst[u.display_name] = cur;

    if (!climbData.best[u.display_name]) climbData.best[u.display_name] = morningPos;
    else if (morningPos < climbData.best[u.display_name]) climbData.best[u.display_name] = morningPos;
    if (cur < climbData.best[u.display_name]) climbData.best[u.display_name] = cur;
  });
  localStorage.setItem(CLIMB_KEY, JSON.stringify(climbData));

  if (users.length === 0) {
    listEl.innerHTML = `<div class="leaderboard-placeholder">The World Stage is dark. Start a session to light it up.</div>`;
    return;
  }

  renderLbPage(listEl, lbAllUsers, lbCurrentPage, climbData, myDisplayName);
  renderLbPagination(listEl, lbAllUsers.length);

  document.removeEventListener('click', handleGlobalHudDismiss);
  document.addEventListener('click', handleGlobalHudDismiss);
}

/** Updates the HUD elements independently for a lag-free experience */
export async function updateGlobalHUD(providedUsers?: GlobalProfile[]): Promise<void> {
  // 1. Fetch Global Telemetry (Cached View)
  const telemetry = await fetchGlobalTelemetry();
  if (telemetry) {
    const totalEl = document.getElementById('telemetry-total-pilots');
    const activeEl = document.getElementById('telemetry-active-now');
    const platformTotalEl = document.getElementById('telemetry-global-total');

    if (totalEl) totalEl.textContent = (telemetry as any).total_pilots.toLocaleString();
    if (activeEl) activeEl.textContent = (telemetry as any).active_now.toLocaleString();
    if (platformTotalEl) platformTotalEl.textContent = `${(telemetry as any).total_platform_hours.toFixed(1)} HRS`;
  }

  // 2. Calculate real Today Sum (High-Fidelity)
  const users = providedUsers || lbAllUsers;
  const todayStr = new Date().toDateString();
  const validTodaySum = users.reduce((acc, u) => {
    const isToday = u.last_active && new Date(u.last_active).toDateString() === todayStr;
    return acc + (isToday ? (u.today_hours || 0) : 0);
  }, 0);

  const hoursEl = document.getElementById('telemetry-global-hours');
  if (hoursEl) hoursEl.textContent = `${validTodaySum.toFixed(1)} HRS`;
}


/** Renders only the players on the current page */
function renderLbPage(
  listEl: HTMLElement,
  allUsers: GlobalProfile[],
  page: number,
  climbData: { worst: Record<string, number>; best: Record<string, number> },
  myDisplayName: string | null
): void {
  const pageStart = (page - 1) * LB_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + LB_PAGE_SIZE, allUsers.length);
  const pageUsers = allUsers.slice(pageStart, pageEnd);

  // 1. Render primary page users
  listEl.innerHTML = pageUsers
    .map((u, i) => renderUserRow(u, pageStart + i, climbData, myDisplayName))
    .join('');

  // ⚓ 2. MY RANK ANCHOR: If I am not on this page, show a personal row at the bottom
  const myIndex = allUsers.findIndex(u => u.display_name === myDisplayName);
  const isMeOnPage = myIndex >= pageStart && myIndex < pageEnd;

  if (myDisplayName && !isMeOnPage && myIndex !== -1) {
    const myUser = allUsers[myIndex];
    const personalRowHtml = `<div class="lb-anchor-divider"><span>MISSION IDENTITY PINNED</span></div>` + 
                            renderUserRow(myUser, myIndex, climbData, myDisplayName);
    listEl.insertAdjacentHTML('beforeend', personalRowHtml);
  }

  bindLbItemEvents(listEl);
}

/** Renders a single operative row for the World Stage */
function renderUserRow(
  u: GlobalProfile,
  globalIndex: number,
  climbData: any,
  myDisplayName: string | null
): string {
  const isMe = myDisplayName ? u.display_name === myDisplayName : false;
  const isoCode = NATION_FLAGS[u.nation] || 'un';
  const flagImg = `<img src="https://flagcdn.com/w40/${isoCode}.png" alt="${u.nation}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  const avatar = u.avatar || `👤`;

  const lastActive = new Date(u.last_active);
  const diffMins = (Date.now() - lastActive.getTime()) / 60000;
  const isStale = diffMins > 5;
  const isFocusing = u.is_focusing_now && !isStale;
  
  let statusClass = 'offline';
  let statusLabel = '';

  if (isFocusing) {
    statusClass = 'focusing';
    statusLabel = 'FOCUSING';
  } else if (diffMins < 5) {
    statusClass = 'online';
    statusLabel = 'ONLINE';
  } else {
    const isToday = new Date().toDateString() === lastActive.toDateString();
    const timeStr = lastActive.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    statusLabel = isToday ? `Today, ${timeStr}` : lastActive.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  const level = Math.floor(u.total_hours / 10) + 1;
  const xpPercent = Math.min(100, (u.total_hours % 10) * 10);
  
  // 🛡️ PARSE TACTICAL RANK & BEST STREAK (Overloaded Payload)
  const rankRaw = u.current_rank || 'IRON';
  const streakMatch = rankRaw.match(/\[B:(\d+)\]/);
  const streakCount = streakMatch ? streakMatch[1] : '0';
  const title = rankRaw.replace(/\[B:\d+\]/, '').trim();

  const rankColor = getRankColor(title);

  const currentRank = globalIndex + 1;
  const todayHoursDisplay = (new Date().toDateString() === lastActive.toDateString()) ? (u.today_hours || 0) : 0;
  
  const worstSeen = climbData.worst[u.display_name] || currentRank;
  const bestSeen = climbData.best[u.display_name] || currentRank;
  const jumpDelta = worstSeen - currentRank;
  const dropDelta = currentRank - bestSeen;
  let trendHtml = '';
  if (jumpDelta > 0) trendHtml = `<div class="rank-delta trend-up"><span>${jumpDelta}</span></div>`;
  else if (dropDelta > 0) trendHtml = `<div class="rank-delta trend-down"><span>${dropDelta}</span></div>`;

  const medalClasses = ['lb-medal-gold', 'lb-medal-silver', 'lb-medal-bronze'];
  const customMedal = globalIndex < 3
    ? `<span class="pilot-medal ${medalClasses[globalIndex]}">${globalIndex + 1}</span>`
    : `${globalIndex + 1}`;

  const age = u.dob ? `${calculateAge(u.dob)}Y • ` : '';
  const rankProg = getRankProgression(u.total_hours);

  return `
    <div class="leaderboard-item ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor};">
      <div class="rank-num">${customMedal}</div>
      <div class="lb-avatar-wrapper">
        <div class="lb-avatar" style="border-color: ${rankColor};">${avatar}</div>
        <div class="nation-emblem">${flagImg}</div>
      </div>
      <div class="lb-info">
        <div class="lb-name">
          <span class="lb-handle">@${escapeHtml(u.display_name)}</span>
          <span class="status-tag ${statusClass}">${statusLabel}</span>
        </div>
        <div class="lb-meta">${age}Lvl ${level} • <span style="color: ${rankColor}; font-weight: 800;">${u.current_rank || 'RECRUIT'}</span></div>
        <div class="lb-xp-container"><div class="lb-xp-bar" style="width: ${xpPercent}%; background: ${rankColor};"></div></div>
      </div>
      <div class="lb-hours-container">
        <div class="lb-total-hours">${u.total_hours.toFixed(1)}h</div>
        <div class="lb-today-badge">${todayHoursDisplay.toFixed(1)}h today${trendHtml}</div>
      </div>
      
      <div class="lb-hover-card" style="--hover-color: ${rankColor};">
        <div class="lb-tactical-mesh"></div>
        <div class="lb-hud-scanner"></div>
        <div class="lb-hud-corner tl"></div><div class="lb-hud-corner tr"></div>
        
        <div class="hover-header">
           <div class="hover-avatar-wrapper" style="border-color: ${rankColor};">${avatar}</div>
           <div class="hover-player-info">
             <div class="hover-real-name">${u.User_name ? escapeHtml(u.User_name) : 'Operative'}</div>
             <div class="hover-handle">@${escapeHtml(u.display_name)}</div>
             <div class="hover-title">${age}${title.toUpperCase()} PROFILE</div>
           </div>
        </div>

        <!-- 💹 TACTICAL XP TELEMETRY -->
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
              ${isFocusing ? (u.current_focus_subject || 'ACTIVE MISSION') : 'IDLE / REFUELING'}
            </span>
          </div>
        </div>

        <div class="hover-stats">
          <div class="hover-stat-box">
            <div class="stat-name">LIFETIME_EXP</div>
            <div class="stat-val">${u.total_hours.toFixed(1)}h</div>
          </div>
          <div class="hover-stat-box">
            <div class="stat-name">SESSION_LOG</div>
            <div class="stat-val">${todayHoursDisplay.toFixed(1)}h</div>
          </div>
          <div class="hover-stat-box">
            <div class="stat-name">BEST_STREAK</div>
            <div class="stat-val">${streakCount} DAYS</div>
          </div>
        </div>

        <button class="lb-hud-close">✕ SECURE TERMINAL</button>
      </div>
    </div>
  `;
}

/** Helper to calculate age */
function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/** Enhanced Pagination logic with smart windowing */
function renderLbPagination(listEl: HTMLElement, totalUsers: number): void {
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

  // Page number buttons (smart windowing)
  const windowSize = 3;
  let start = Math.max(1, lbCurrentPage - 1);
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  if (start > 1) {
    pages.push(`<button class="lb-page-btn" data-page="1">1</button>`);
    if (start > 2) pages.push(`<span class="lb-page-ellipsis">…</span>`);
  }

  for (let p = start; p <= end; p++) {
    pages.push(`<button class="lb-page-btn ${p === lbCurrentPage ? 'active' : ''}" data-page="${p}">${p}</button>`);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(`<span class="lb-page-ellipsis">…</span>`);
    pages.push(`<button class="lb-page-btn" data-page="${totalPages}">${totalPages}</button>`);
  }

  // Next button
  pages.push(`<button class="lb-page-btn" data-page="next" ${lbCurrentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`);

  const startIdx = (lbCurrentPage - 1) * LB_PAGE_SIZE + 1;
  const endIdx = Math.min(lbCurrentPage * LB_PAGE_SIZE, totalUsers);

  paginationEl.innerHTML = `
    <div class="lb-page-count">${startIdx}–${endIdx} of ${totalUsers} operatives</div>
    <div class="lb-page-buttons">${pages.join('')}</div>
  `;
  listEl.after(paginationEl);

  paginationEl.querySelectorAll('.lb-page-btn').forEach(btn => {
    (btn as HTMLElement).onclick = () => {
      const raw = (btn as HTMLElement).dataset.page;
      if (!raw || (btn as HTMLButtonElement).disabled) return;
      if (raw === 'prev') lbCurrentPage = Math.max(1, lbCurrentPage - 1);
      else if (raw === 'next') lbCurrentPage = Math.min(totalPages, lbCurrentPage + 1);
      else lbCurrentPage = parseInt(raw);
      
      refreshLeaderboard();
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}


/** HUD interaction events */
function bindLbItemEvents(listEl: HTMLElement): void {
  listEl.querySelectorAll('.leaderboard-item').forEach(item => {
    const avatarIcon = item.querySelector('.lb-avatar-wrapper') as HTMLElement;
    const hudClose = item.querySelector('.lb-hud-close') as HTMLElement;

    if (avatarIcon) {
      avatarIcon.onclick = (e) => {
        e.stopPropagation();
        if (item.classList.contains('is-me')) openProfileModal();
        else {
          listEl.querySelectorAll('.leaderboard-item.force-hud').forEach(el => el.classList.remove('force-hud'));
          item.classList.add('force-hud');
        }
      };
    }
    if (hudClose) hudClose.onclick = (e) => { e.stopPropagation(); item.classList.remove('force-hud'); };
  });
}

function handleGlobalHudDismiss(e: MouseEvent): void {
  if (!(e.target as HTMLElement).closest('.lb-hover-card')) {
    document.querySelectorAll('.leaderboard-item.force-hud').forEach(el => el.classList.remove('force-hud'));
  }
}
