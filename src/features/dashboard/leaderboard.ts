import { appState } from '@/state/app-state';
import { STORAGE_KEYS, RANK_TIERS, SUPABASE_TABLES } from '@/config/constants';
import { broadcastGlobalStats, fetchLeaderboard, isUsernameTaken } from '@/services/supabase.service';
import type { UserProfile, GlobalProfile } from '@/types/profile.types';
import { getCurrentUserId, setupPasswordToggle } from '@/services/auth.service';
import { initiateIdentityMigration } from '@/services/identity.service';
import { escapeHtml } from '@/utils/security';


// Tracks the last time the user did something in the app
let lastInteractionAt = Date.now();

// 🛡️ BROADCAST CACHE: Prevents redundant network calls if data is unchanged
let lastBroadcastPayload: string | null = null;

const NATION_FLAGS: Record<string, string> = {
  'Global': 'un',
  'India': 'in',
  'USA': 'us',
  'UK': 'gb',
  'Canada': 'ca',
  'Germany': 'de',
  'Japan': 'jp',
  'Other': 'un'
};

/**
 * Starts the leaderboard and checks your profile.
 */
export async function initWorldStage(): Promise<void> {
  // 1. Fetch the top 10 users initially
  await refreshLeaderboard();

  // 2. ⚡ REAL-TIME UPGRADE: Listen for instant database changes
  import('@/config/supabase').then(({ supabaseClient }) => {
    if (supabaseClient) {
      supabaseClient
        .channel('leaderboard-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: SUPABASE_TABLES.GLOBAL_PROFILES }, () => refreshLeaderboard())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: SUPABASE_TABLES.GLOBAL_PROFILES }, () => refreshLeaderboard())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: SUPABASE_TABLES.GLOBAL_PROFILES }, () => refreshLeaderboard())
        .subscribe();
    }
  });

  // 3. Fallback Periodic updates (Enforced 30s refresh for maximum accuracy)
  setInterval(() => refreshLeaderboard(), 30000);

  // 3. Bind Profile Setup Modal
  const saveBtn = document.getElementById('saveProfileBtn');
  if (saveBtn) saveBtn.onclick = handleProfileSave;

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

  // 4. Bind Migration Security
  const migrateBtn = document.getElementById('migrateIdentityBtn');
  if (migrateBtn) migrateBtn.onclick = handleIdentityMigration;

  // 5. Bind Password Toggles
  setupPasswordToggle('toggleCurrentKey', 'currentSecretKeyInput');
  setupPasswordToggle('toggleNewKey', 'newSecretKeyInput');

  // 6. Start Activity Tracking & Heartbeat
  initActivityTracking();

  // 📡 ALL TRACKER REACTIVE HYDRATION: Listen for identity sync to update UI instantly
  window.addEventListener('all-tracker-identity-sync', (e: any) => {
    const profile = e.detail as UserProfile;
    if (!profile) return;
    
    // Update Header HUD (if modal is open)
    const passportAvatar = document.getElementById('passportAvatar');
    const handleEl = document.getElementById('displayHandle');
    const rankEl = document.getElementById('displayRank');

    if (passportAvatar) passportAvatar.textContent = profile.avatar || '👨‍🚀';
    if (handleEl) handleEl.textContent = `@${profile.displayName}`;
    
    // Update Archetype Grid active state
    const avatarGrid = document.getElementById('avatarPickerGrid');
    if (avatarGrid) {
      avatarGrid.querySelectorAll('.avatar-item').forEach(item => {
        if (item.getAttribute('data-avatar') === profile.avatar) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Refresh display inputs (if not active or if legacy)
    const nameInput = document.getElementById('profileNameInput') as HTMLInputElement;
    if (nameInput && (!nameInput.value || nameInput.value.startsWith('Legacy_'))) {
      nameInput.value = profile.displayName;
    }
  });
}

/** Tracks mouse/keyboard activity and sends a 'heartbeat' every 30s */
export function initActivityTracking(): void {
  const updateActivity = () => { lastInteractionAt = Date.now(); };
  window.addEventListener('mousedown', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('touchstart', updateActivity);
  window.addEventListener('scroll', updateActivity);

  // 🚀 PERFECT SYNC HEARTBEAT: Heartbeat every 25 seconds for focuses
  // This ensures updates hit the DB under the 30s user request.
  setInterval(() => {
    const isTimerRunning = appState.activeTimer.isRunning;
    const isRecentActive = (Date.now() - lastInteractionAt) < 30 * 1000;
    
    // We broadcast if focusing (to update time) or if we just stopped focusing (to clear status)
    if (isTimerRunning || isRecentActive) {
      syncProfileBroadcast();
    }
  }, 25000);

  // 🛰️ LIFECYCLE CLEANUP: Prevent Zombie Focusing
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Force an immediate 'Not Focusing' broadcast if the tab is hidden or closed
      syncProfileBroadcast();
    }
  });

  window.addEventListener('beforeunload', () => {
    // One final broadcast before the user leaves
    syncProfileBroadcast();
  });
}

/** Fetches and renders the leaderboard list */
const LB_PAGE_SIZE = 8; // Players per page
let lbCurrentPage = 1;
let lbAllUsers: GlobalProfile[] = []; // Cache the full list for page navigation

export async function refreshLeaderboard(): Promise<void> {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  const users = await fetchLeaderboard();
  
  // 🛡️ PERSISTENT PAGE: Don't jump back to Page 1 on every refresh unless current page is now empty
  const totalPages = Math.ceil(users.length / LB_PAGE_SIZE);
  if (lbCurrentPage > totalPages) lbCurrentPage = Math.max(1, totalPages);
  
  lbAllUsers = users; 


  // Logic for the 'Climb Engine' (shows if you moved up/down today)
  const CLIMB_KEY = 'arena_climb_v2';
  const today = new Date().toISOString().split('T')[0];
  let climbData = { date: today, worst: {} as Record<string, number>, best: {} as Record<string, number> };

  const savedClimb = localStorage.getItem(CLIMB_KEY);
  if (savedClimb) {
    const parsed = JSON.parse(savedClimb);
    if (parsed.date === today) climbData = parsed;
  }

  // Determine Morning Ranks (Sorted by Total - Today)
  const morningRanks = [...users]
    .sort((a, b) => {
      const aStart = a.total_hours - (a.today_hours || 0);
      const bStart = b.total_hours - (b.today_hours || 0);
      
      // 🛡️ STABLE TIE-BREAKER: If morning scores are identical, use all-time total
      // This prevents "Phantom jumps" for new users or same-day starters
      if (Math.abs(bStart - aStart) < 0.0001) {
        return b.total_hours - a.total_hours;
      }
      return bStart - aStart;
    })
    .reduce((acc, u, idx) => {
      acc[u.display_name] = idx + 1;
      return acc;
    }, {} as Record<string, number>);

  // Update live Peaks/Valleys based on both Live data and Morning Anchor
  users.forEach((u, idx) => {
    const cur = idx + 1;
    const morningPos = morningRanks[u.display_name] || cur;

    // Anchor: Worst rank today is the lower of morning position or current live position
    if (!climbData.worst[u.display_name]) climbData.worst[u.display_name] = morningPos;
    else if (morningPos > climbData.worst[u.display_name]) climbData.worst[u.display_name] = morningPos;
    if (cur > climbData.worst[u.display_name]) climbData.worst[u.display_name] = cur;

    // Anchor: Best rank today is the higher of morning position or current live position
    if (!climbData.best[u.display_name]) climbData.best[u.display_name] = morningPos;
    else if (morningPos < climbData.best[u.display_name]) climbData.best[u.display_name] = morningPos;
    if (cur < climbData.best[u.display_name]) climbData.best[u.display_name] = cur;
  });
  localStorage.setItem(CLIMB_KEY, JSON.stringify(climbData));

  if (users.length === 0) {
    listEl.innerHTML = `<div class="leaderboard-placeholder">The World Stage is dark. Start a session to light it up.</div>`;
    return;
  }

  const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  const myDisplayName = profileData ? JSON.parse(profileData).displayName : null;

  renderLbPage(listEl, lbAllUsers, lbCurrentPage, climbData, myDisplayName);
  renderLbPagination(listEl, lbAllUsers.length);

  // 🖱️ GLOBAL DISMISS: Clicking anywhere outside the list closes any open HUDs
  document.removeEventListener('click', handleGlobalHudDismiss);
  document.addEventListener('click', handleGlobalHudDismiss);
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

  listEl.innerHTML = pageUsers.map((u, i) => {
    const globalIndex = pageStart + i; // True rank across all pages
    const isMe = myDisplayName ? u.display_name === myDisplayName : false;
    const isoCode = NATION_FLAGS[u.nation] || 'un';
    const flagUrl = `https://flagcdn.com/w40/${isoCode}.png`;
    const flagImg = `<img src="${flagUrl}" alt="${u.nation}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    const avatar = u.avatar || `👤`;
    const rankLabel = u.current_rank || 'RECRUIT';
    
    const lastActive = new Date(u.last_active);
    const isToday = lastActive.toDateString() === new Date().toDateString();
    const displayTodayHours = isToday ? (u.today_hours || 0) : 0;
    const now = new Date();
    const diffMins = (now.getTime() - lastActive.getTime()) / 60000;
    
    let statusClass = 'offline';
    let statusLabel = '';
    const isStale = diffMins > 5;

    if (u.is_focusing_now && !isStale) {
      statusClass = 'focusing';
      statusLabel = 'FOCUSING';
    } else if (diffMins < 5) {
      statusClass = 'online';
      statusLabel = 'ONLINE';
    } else {
      const isToday2 = now.toDateString() === lastActive.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.toDateString() === lastActive.toDateString();
      const timeStr = lastActive.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      if (isToday2) {
        statusLabel = diffMins < 60 ? `${Math.floor(diffMins)}m ago` : `Today, ${timeStr}`;
      } else if (isYesterday) {
        statusLabel = `Yesterday, ${timeStr}`;
      } else {
        const dateStr = lastActive.toLocaleDateString([], { day: 'numeric', month: 'short' });
        statusLabel = `Seen ${dateStr}`;
      }
    }

    const level = Math.floor(u.total_hours / 10) + 1;
    const xpPercent = Math.min((u.total_hours % 10) * 10, 100);
    let title = 'RECRUIT';
    if (u.total_hours >= 20000) title = 'SINGULARITY';
    else if (u.total_hours >= 10000) title = 'DEITY';
    else if (u.total_hours >= 5000) title = 'ETERNAL';
    else if (u.total_hours >= 2500) title = 'LEGEND';
    else if (u.total_hours >= 1200) title = 'ELITE';
    else if (u.total_hours >= 600) title = 'VETERAN';
    else if (u.total_hours >= 300) title = 'CAPTAIN';
    else if (u.total_hours >= 150) title = 'COMMANDER';
    else if (u.total_hours >= 70) title = 'OFFICER';
    else if (u.total_hours >= 30) title = 'PILOT';
    else if (u.total_hours >= 10) title = 'CADET';

    const rankColorObj = RANK_TIERS.find(t => t.name === rankLabel);
    const rankColor = rankColorObj ? rankColorObj.color : '#71717a';
    const medalClasses = ['lb-medal-gold', 'lb-medal-silver', 'lb-medal-bronze'];
    const customMedal = globalIndex < 3
      ? `<span class="pilot-medal ${medalClasses[globalIndex]}">${globalIndex + 1}</span>`
      : `${globalIndex + 1}`;

    const currentRank = globalIndex + 1;
    const worstSeen = climbData.worst[u.display_name] || currentRank;
    const bestSeen = climbData.best[u.display_name] || currentRank;
    const jumpDelta = worstSeen - currentRank;
    const dropDelta = currentRank - bestSeen;
    let trendHtml = '';
    if (jumpDelta > 0) {
      trendHtml = `<div class="rank-delta trend-up" title="Climbed ${jumpDelta} spots"><svg class="hour-trend-icon" viewBox="0 0 24 24" fill="none"><path d="M12 4V20M12 4L18 10M12 4L6 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${jumpDelta}</span></div>`;
    } else if (dropDelta > 0) {
      trendHtml = `<div class="rank-delta trend-down" title="Dropped ${dropDelta} spots"><svg class="hour-trend-icon" viewBox="0 0 24 24" fill="none"><path d="M12 20V4M12 20L6 14M12 20L18 14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${dropDelta}</span></div>`;
    } else if (u.is_focusing_now && !isStale) {
      trendHtml = `<div class="rank-delta trend-up momentum-only" title="Gaining ground"><svg class="hour-trend-icon" viewBox="0 0 24 24" fill="none"><path d="M12 4V20M12 4L18 10M12 4L6 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    }

    let telemetrySubjectBlock = '';
    const isFocusing = u.is_focusing_now && !isStale;

    if (isFocusing) {
      telemetrySubjectBlock = `
        <div class="lb-mission-pulse">
          <span class="lb-pulse-dot"></span>
          <span>LINK ESTABLISHED</span>
        </div>
        <div class="focus-label">CURRENT MISSION</div>
        <div class="focus-topic" style="color: ${rankColor};">${u.current_focus_subject ? escapeHtml(u.current_focus_subject) : 'ACTIVE FOCUS'}</div>
      `;
    } else {
      telemetrySubjectBlock = `
        <div class="focus-label">LAST ACTIVE</div>
        <div class="focus-topic offline-topic">${escapeHtml(statusLabel)}</div>
      `;
    }

    const hoverCardHtml = `
      <div class="lb-hover-card" style="--hover-color: ${rankColor};">
        <!-- Premium Tactical Backdrop -->
        <div class="lb-tactical-mesh"></div>
        <div class="lb-hud-scanner"></div>
        
        <!-- Corner Markers -->
        <div class="lb-hud-corner tl"></div>
        <div class="lb-hud-corner tr"></div>
        <div class="lb-hud-corner bl"></div>
        <div class="lb-hud-corner br"></div>

        <div class="hover-header">
           <div class="hover-avatar-wrapper" style="border-color: ${rankColor};">
             ${avatar}
             <div class="nation-emblem" title="${u.nation}">${flagImg}</div>
           </div>
           <div class="hover-player-info">
             <div class="hover-handle">@${escapeHtml(u.display_name)}</div>
             <div class="hover-title">${title.toUpperCase()} PROFILE</div>
           </div>
           <div class="status-indicator ${statusClass}"></div>
        </div>
        
        <div class="hover-subject-container">
           ${telemetrySubjectBlock}
        </div>
        
        <div class="hover-stats">
          <div class="hover-stat-box">
             <div class="stat-val">${rankLabel}</div>
             <div class="stat-name">RANK</div>
          </div>
          <div class="hover-stat-box">
             <div class="stat-val">Lvl ${level}</div>
             <div class="stat-name">LEVEL</div>
             <div class="lb-hud-xp">
               <div class="lb-hud-xp-fill" style="width: ${xpPercent}%;"></div>
             </div>
          </div>
          <div class="hover-stat-box">
             <div class="stat-val">${u.total_hours.toFixed(1)}h</div>
             <div class="stat-name">TOTAL</div>
          </div>
        </div>
        <button class="lb-hud-close" title="Dismiss Profile">✕ Dismiss</button>
      </div>
    `;

    return `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''}" style="--rank-color: ${rankColor};">
        <div class="rank-num">${customMedal}</div>
        <div class="lb-avatar-wrapper">
          <div class="lb-avatar" style="border-color: ${rankColor}; box-shadow: 0 0 10px ${rankColor}40;">${avatar}</div>
          <div class="nation-emblem" title="${u.nation}">${flagImg}</div>
        </div>
        <div class="lb-info">
          <div class="lb-name">
            ${(statusClass === 'offline')
              ? `<div class="lb-name-row"><span class="lb-handle">@${escapeHtml(u.display_name)}</span></div><span class="status-tag offline">LAST SEEN ${escapeHtml(statusLabel)}</span>`
              : `<div class="lb-name-row"><span class="lb-handle">@${escapeHtml(u.display_name)}</span><span class="status-tag ${statusClass}">${escapeHtml(statusLabel)}</span></div>`
            }
          </div>
          <div class="lb-meta">Lvl ${level} ${title} • <span style="color: ${rankColor}; font-weight: 800; text-shadow: 0 0 8px ${rankColor}60;">${rankLabel}</span></div>
          <div class="lb-xp-container"><div class="lb-xp-bar" style="width: ${xpPercent}%; background: ${rankColor}; box-shadow: 0 0 8px ${rankColor};"></div></div>
        </div>
        <div class="lb-hours-container">
          <div class="lb-total-hours">${u.total_hours.toFixed(1)}h</div>
          <div class="lb-today-badge">${displayTodayHours.toFixed(1)}h today${trendHtml}</div>
        </div>
        ${hoverCardHtml}
      </div>
    `;
  }).join('');

  // Bind avatar click + close button events
  bindLbItemEvents(listEl);
}

/** Builds and injects pagination controls below the leaderboard list */
function renderLbPagination(listEl: HTMLElement, totalUsers: number): void {
  // Remove existing pagination
  const existing = document.getElementById('lb-pagination');
  if (existing) existing.remove();

  const totalPages = Math.ceil(totalUsers / LB_PAGE_SIZE);
  if (totalPages <= 1) return; // No pagination needed for small lists

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

  // Count display
  const start1 = (lbCurrentPage - 1) * LB_PAGE_SIZE + 1;
  const end1 = Math.min(lbCurrentPage * LB_PAGE_SIZE, totalUsers);
  paginationEl.innerHTML = `
    <div class="lb-page-count">${start1}–${end1} of ${totalUsers} operatives</div>
    <div class="lb-page-buttons">${pages.join('')}</div>
  `;

  listEl.after(paginationEl);

  // Bind page buttons
  paginationEl.querySelectorAll('.lb-page-btn').forEach(btn => {
    (btn as HTMLElement).onclick = (e) => {
      e.stopPropagation();
      const raw = (btn as HTMLElement).dataset.page;
      if (!raw || (btn as HTMLButtonElement).disabled) return;
      const totalPages2 = Math.ceil(lbAllUsers.length / LB_PAGE_SIZE);
      if (raw === 'prev') lbCurrentPage = Math.max(1, lbCurrentPage - 1);
      else if (raw === 'next') lbCurrentPage = Math.min(totalPages2, lbCurrentPage + 1);
      else lbCurrentPage = parseInt(raw);

      const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const myDisplayName = profileData ? JSON.parse(profileData).displayName : null;
      const CLIMB_KEY = 'arena_climb_v2';
      const savedClimb = localStorage.getItem(CLIMB_KEY);
      const today = new Date().toISOString().split('T')[0];
      let climbData = { date: today, worst: {} as Record<string, number>, best: {} as Record<string, number> };
      if (savedClimb) { const p = JSON.parse(savedClimb); if (p.date === today) climbData = p; }

      renderLbPage(listEl, lbAllUsers, lbCurrentPage, climbData, myDisplayName);
      renderLbPagination(listEl, lbAllUsers.length);
      // Scroll leaderboard list back to top smoothly
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

/** Binds avatar click + close events on all items in the list */
function bindLbItemEvents(listEl: HTMLElement): void {
  listEl.querySelectorAll('.leaderboard-item').forEach(item => {
    const avatarIcon = item.querySelector('.lb-avatar-wrapper') as HTMLElement;
    const hudClose = item.querySelector('.lb-hud-close') as HTMLElement;
    if (!avatarIcon) return;

    avatarIcon.onclick = (e) => {
      e.stopPropagation();
      if (item.classList.contains('is-me')) {
        openProfileModal();
      } else {
        const currentlyLocked = item.classList.contains('force-hud');
        listEl.querySelectorAll('.leaderboard-item.force-hud').forEach(el => el.classList.remove('force-hud'));
        if (!currentlyLocked) item.classList.add('force-hud');
      }
    };

    if (hudClose) {
      hudClose.onclick = (e) => {
        e.stopPropagation();
        item.classList.remove('force-hud');
      };
    }
  });
}

function handleGlobalHudDismiss(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const isInsideHud = target.closest('.lb-hover-card') || target.closest('.lb-avatar-wrapper');
  
  if (!isInsideHud) {
    document.querySelectorAll('.leaderboard-item.force-hud').forEach(el => {
      el.classList.remove('force-hud');
    });
  }
}

/** Checks if you've set your name/avatar; if not, asks you to do it */
export async function checkProfileIdentity(): Promise<void> {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const profileSaved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  const usernameSaved = localStorage.getItem('tracker_username');

  // No local profile? Try to load it from Supabase.
  if (!profileSaved) {
    const { loadUserProfileCloud } = await import('@/services/supabase.service');
    const cloudProfile = await loadUserProfileCloud();

    if (cloudProfile) {
      const localProfile = {
        displayName: cloudProfile.display_name,
        age: cloudProfile.age,
        nation: cloudProfile.nation,
        avatar: cloudProfile.avatar
      };
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(localProfile));
      localStorage.setItem('tracker_username', localProfile.displayName);
      syncProfileBroadcast();
      return;
    }

    // No local or cloud profile -> Open Setup Modal
    openProfileModal();
  } 
  // Case 2: Local profile exists but username needs binding
  else if (!usernameSaved) {
    const profile = JSON.parse(profileSaved) as UserProfile;
    localStorage.setItem('tracker_username', profile.displayName);
    syncProfileBroadcast();
  }
  else {
    // Identity is active, sync stats
    syncProfileBroadcast();
  }
}

export function openProfileModal(): void {
  const modal = document.getElementById('profileSetupModal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';

    // Populate Passport Stats
    const totalHoursEl = document.getElementById('totalHoursPassport');
    const todayHoursEl = document.getElementById('todayHoursPassport');
    const handleEl = document.getElementById('displayHandle');
    const rankEl = document.getElementById('displayRank');

    const totalHours = appState.trackerData.reduce((sum, day) => {
      const dayTotal = (day.studyHours || []).reduce((s, h) => s + (h || 0), 0);
      return sum + dayTotal;
    }, 0);
    const todayHours = calculateTodayStudyHours();
    
    if (totalHoursEl) totalHoursEl.textContent = `${totalHours.toFixed(1)}H`;
    if (todayHoursEl) todayHoursEl.textContent = `${todayHours.toFixed(1)}H`;
    
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (saved) {
      const profile = JSON.parse(saved) as UserProfile;
      const passportAvatar = document.getElementById('passportAvatar');
      const handleEl = document.getElementById('displayHandle');
      // 🎖️ Title Engine Sync
      let title = 'RECRUIT';
      if (totalHours >= 20000) title = 'SINGULARITY';
      else if (totalHours >= 10000) title = 'DEITY';
      else if (totalHours >= 5000) title = 'ETERNAL';
      else if (totalHours >= 2500) title = 'LEGEND';
      else if (totalHours >= 1200) title = 'ELITE';
      else if (totalHours >= 600) title = 'VETERAN';
      else if (totalHours >= 300) title = 'CAPTAIN';
      else if (totalHours >= 150) title = 'COMMANDER';
      else if (totalHours >= 70) title = 'OFFICER';
      else if (totalHours >= 30) title = 'PILOT';
      else if (totalHours >= 10) title = 'CADET';

      if (handleEl) handleEl.textContent = `@${profile.displayName}`;
      if (rankEl) rankEl.textContent = `${title} • ${profile.nation.toUpperCase()}`;
      
      // Sync the modal preview with the current profile
      if (passportAvatar) {
        passportAvatar.textContent = profile.avatar || '👨‍🚀';
      }
      
      const nameInput = document.getElementById('profileNameInput') as HTMLInputElement;
      const ageInput = document.getElementById('profileAgeInput') as HTMLInputElement;
      const nationInput = document.getElementById('profileNationSelect') as HTMLSelectElement;
      
      if (nameInput) {
        nameInput.value = profile.displayName;
        if (profile.displayName && !profile.displayName.startsWith('Legacy_')) {
          nameInput.disabled = true;
          nameInput.style.opacity = '0.6';
          nameInput.style.cursor = 'not-allowed';
          nameInput.title = "Your unique Identity Handle is permanently secured.";
        } else {
          nameInput.disabled = false;
          nameInput.style.opacity = '1';
          nameInput.style.cursor = 'text';
          nameInput.title = "";
        }
      }
      if (ageInput) ageInput.value = profile.age.toString();
      if (nationInput) nationInput.value = profile.nation;
    }

    // --- Avatar Selection Logic ---
    const avatarGrid = document.getElementById('avatarPickerGrid');
    const avatarToggle = document.getElementById('toggleAvatarPickerBtn');
    const avatarContainer = document.getElementById('avatarPickerContainer');

    const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    const currentAvatar = profileData ? (JSON.parse(profileData) as UserProfile).avatar : '👨‍🚀';

    if (avatarToggle && avatarContainer) {
      avatarToggle.onclick = () => {
        const isHidden = avatarContainer.style.display === 'none';
        avatarContainer.style.display = isHidden ? 'block' : 'none';
        avatarToggle.textContent = isHidden ? '[ CLOSE ARCHETYPE SELECTION ]' : '[ CHANGE PILOT ARCHETYPE ]';
      };
    }

    if (avatarGrid) {
      // 0. Pre-select current avatar in grid
      avatarGrid.querySelectorAll('.avatar-item').forEach(item => {
        if (item.getAttribute('data-avatar') === currentAvatar) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }

        (item as HTMLElement).onclick = () => {
          avatarGrid.querySelectorAll('.avatar-item').forEach(a => a.classList.remove('active'));
          item.classList.add('active');
          const livePassAv = document.getElementById('passportAvatar');
          if (livePassAv) livePassAv.textContent = item.getAttribute('data-avatar') || '👤';
        };
      });
    }
  }
}

async function handleProfileSave(): Promise<void> {
  const nameInput = document.getElementById('profileNameInput') as HTMLInputElement;
  const ageInput = document.getElementById('profileAgeInput') as HTMLInputElement;
  const nationInput = document.getElementById('profileNationSelect') as HTMLSelectElement;

  const name = nameInput.value.trim();
  const age = parseInt(ageInput.value) || 0;
  const nation = nationInput.value;
  const syncId = getCurrentUserId() || '';

  if (!name || age <= 0 || !nation) {
    alert("Please complete your Mission Profile fully!");
    return;
  }

  // 1. Verify Identity Uniqueness
  const saveBtn = document.getElementById('saveProfileBtn') as HTMLButtonElement;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Verifying Identity...";
  saveBtn.disabled = true;

  const taken = await isUsernameTaken(name, syncId);
  if (taken) {
    alert(`Mission Alert: The identity "@${name}" is already claimed by another participant. Please pick a unique handle.`);
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
    return;
  }

  const avatar = document.querySelector('#avatarPickerGrid .avatar-item.active')?.getAttribute('data-avatar') || '👨‍🚀';

  const profile: UserProfile = {
    displayName: name,
    age,
    nation,
    avatar
  };

  // Save locally
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  localStorage.setItem('tracker_username', profile.displayName);
  
  // Close modal
  const modal = document.getElementById('profileSetupModal');
  if (modal) modal.classList.remove('active');

  // Broadcast to World Stage
  await syncProfileBroadcast();
  await refreshLeaderboard();
}

/** Syncs your local study hours to the global leaderboard */
export async function syncProfileBroadcast(): Promise<void> {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!saved) return;

  const profile = JSON.parse(saved) as UserProfile;
  
  // Calculate total hours from appState
  let totalHours = appState.trackerData.reduce(
    (sum, d) => sum + (Array.isArray(d.studyHours) ? d.studyHours.reduce((s, n) => s + (n || 0), 0) : 0),
    0
  );

  // Get Rank (approximate for leaderboard simple display)
  const rank = document.getElementById('studyRank')?.textContent || 'IRON';

  let todayHours = calculateTodayStudyHours();
  const isFocusing = appState.activeTimer.isRunning;

  // If timer is running, add its progress to the broadcast immediately
  if (isFocusing && appState.activeTimer.startTime) {
    const elapsedMs = (Date.now() - appState.activeTimer.startTime) + appState.activeTimer.elapsedAcc;
    const elapsedHrs = elapsedMs / (1000 * 60 * 60);
    todayHours += elapsedHrs;
    totalHours += elapsedHrs;
  }

  // 📡 WORLD STAGE BROADCAST: Sync local stats to the global leaderboard
  const payload = {
    display_name: profile.displayName,
    age: profile.age,
    nation: profile.nation,
    avatar: profile.avatar,
    total_hours: Number(totalHours.toFixed(4)),
    today_hours: Number(todayHours.toFixed(4)),
    current_rank: rank,
    is_focusing_now: isFocusing,
    current_focus_subject: isFocusing ? (appState.activeTimer.colName || 'ACTIVE MISSION') : null
  };

  // 🛡️ BROADCAST DEDUPLICATION: Only sync if status or hours changed significantly
  const currentPayloadStr = JSON.stringify(payload);
  if (lastBroadcastPayload === currentPayloadStr) {
    return;
  }

  lastBroadcastPayload = currentPayloadStr;
  await broadcastGlobalStats(payload);

  // Automatically refresh the UI leaderboard to show the new stat
  await refreshLeaderboard();
}

/** Moves all your study data to a new Secret Key */
async function handleIdentityMigration(): Promise<void> {
  const currentKeyInput = document.getElementById('currentSecretKeyInput') as HTMLInputElement;
  const newKeyInput = document.getElementById('newSecretKeyInput') as HTMLInputElement;

  const currentKey = currentKeyInput.value.trim();
  const newKey = newKeyInput.value.trim();

  if (!currentKey || !newKey) {
    alert("Please provide both current and new Secret Keys!");
    return;
  }

  const actualId = getCurrentUserId();
  if (currentKey !== actualId) {
    alert("Authentication Failure: Current Secret Key is incorrect.");
    return;
  }

  if (confirm("🚨 WARNING: This will MOVE all your study data to the new Secret Key. Your old key will no longer work. Proceed?")) {
    const success = await initiateIdentityMigration(newKey);
    if (success) {
      alert("Mission Successful: Identity Migrated. All Tracker will now reload.");
    }
  }
}

/** Helper to calculate total study hours for the current local date */
function calculateTodayStudyHours(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntry = appState.trackerData.find(d => {
    const dDate = new Date(d.date);
    dDate.setHours(0, 0, 0, 0);
    return dDate.getTime() === today.getTime();
  });
  
  if (!todayEntry || !Array.isArray(todayEntry.studyHours)) return 0;
  return todayEntry.studyHours.reduce((sum, h) => sum + (h || 0), 0);
}
