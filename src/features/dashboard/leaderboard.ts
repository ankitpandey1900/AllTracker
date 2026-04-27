import { getSecureLocalProfileString } from '@/utils/security';
import { appState } from '@/state/app-state';
import Registry from '@/utils/lifecycle';
import { fetchLeaderboard, fetchGlobalTelemetry } from '@/services/vault.service';
import { GlobalProfile } from '@/types/profile.types';
import { setupPasswordToggle } from '@/services/auth.service';
import { formatDuration } from '@/utils/date.utils';
import { calculateCompetitiveXP } from '@/utils/calc.utils';

// 📡 FEATURE BRIDGE: Profile and Identity logic moved to src/features/profile/
import { syncProfileBroadcast, updateLastInteraction, lastInteractionAt } from '@/features/profile/profile.manager';

import { 
  lbCurrentPage, 
  LB_PAGE_SIZE, 
  lbAllUsers, 
  setLbCurrentPage, 
  setLbAllUsers 
} from './leaderboard.state';

// --- Sub-Module Imports ---
import { renderLbPage, renderLbPagination } from './leaderboard.ui';
import { handleGlobalHudDismiss } from './leaderboard.events';

/**
 * Starts the leaderboard and platform telemetry systems.
 */
export async function initWorldStage(): Promise<void> {
  await refreshLeaderboard();

  let lbDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedRefresh = () => {
    if (lbDebounceTimer) clearTimeout(lbDebounceTimer);
    lbDebounceTimer = setTimeout(() => refreshLeaderboard(), 1200);
  };

  import('@/services/vault.service').then(({ subscribeToRealtimeTelemetry }) => {
    subscribeToRealtimeTelemetry(debouncedRefresh);
  });

  Registry.setInterval('lb_polling', () => refreshLeaderboard(), 30000);

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

  setupPasswordToggle('toggleCurrentKey', 'currentSecretKeyInput');
  setupPasswordToggle('toggleNewKey', 'newSecretKeyInput');

  initActivityTracking();

  window.addEventListener('all-tracker-identity-sync', () => {
    refreshLeaderboard();
  });
  
  // Listen for global clicks to dismiss HUDs
  window.addEventListener('click', handleGlobalHudDismiss);
}

export function initActivityTracking(): void {
  const updateActivity = () => { updateLastInteraction(); };
  window.addEventListener('mousedown', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('touchstart', updateActivity, { passive: true });
  window.addEventListener('scroll', updateActivity, { passive: true });

  Registry.setInterval('profile_heartbeat', () => {
    const isTimerRunning = appState.activeTimer.isRunning;
    const isRecentActive = (Date.now() - lastInteractionAt) < 30 * 1000;
    if (isTimerRunning || isRecentActive) {
      syncProfileBroadcast();
    }
  }, 25000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncProfileBroadcast();
  });

  window.addEventListener('beforeunload', () => syncProfileBroadcast());
}



export function getCurrentUserLeaderboardContext(): {
  position: number;
  totalUsers: number;
  myHours: number;
  topHours: number;
  gapToTopHours: number;
  topUserHandle: string;
} | null {
  if (!lbAllUsers.length) return null;
  const profileData = getSecureLocalProfileString();
  const myDisplayName = profileData ? JSON.parse(profileData).displayName : null;
  if (!myDisplayName) return null;

  const sorted = [...lbAllUsers].sort((a, b) => {
    const scoreA = calculateCompetitiveXP(a.total_hours, a.current_streak || 0, a.integrity_score || 0);
    const scoreB = calculateCompetitiveXP(b.total_hours, b.current_streak || 0, b.integrity_score || 0);
    return scoreB - scoreA;
  });
  const myIndex = sorted.findIndex(u => u.display_name === myDisplayName);
  if (myIndex === -1) return null;

  const me = sorted[myIndex];
  const top = sorted[0];
  const myHours = me.total_hours || 0;
  const topHours = top.total_hours || 0;

  return {
    position: myIndex + 1,
    totalUsers: sorted.length,
    myHours: Number(myHours.toFixed(1)),
    topHours: Number(topHours.toFixed(1)),
    gapToTopHours: Number(Math.max(0, topHours - myHours).toFixed(1)),
    topUserHandle: `@${top.display_name}`
  };
}

export async function refreshLeaderboard(): Promise<void> {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  const telemetry = await fetchGlobalTelemetry();
  if (telemetry) {
    const totalEl = document.getElementById('telemetry-total-pilots');
    const activeEl = document.getElementById('telemetry-active-now');
    const globalHoursEl = document.getElementById('telemetry-global-hours');
    const globalTotalEl = document.getElementById('telemetry-global-total');
    const milestonePctEl = document.getElementById('milestone-percentage-text');
    const milestoneTargetEl = document.getElementById('milestone-next-target-text');

    if (totalEl) totalEl.textContent = telemetry.total_pilots.toLocaleString();
    if (activeEl) activeEl.textContent = telemetry.active_now.toLocaleString();
    if (globalHoursEl) globalHoursEl.textContent = formatDuration(telemetry.global_hours_today || 0) || '0m';
    if (globalTotalEl) globalTotalEl.textContent = formatDuration(telemetry.total_platform_hours || 0) || '0h';

    // Milestone Logic (Tactical Sliding Window with History)
    const totalPlatform = telemetry.total_platform_hours || 0;
    const allTargets = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
    const nextTarget = allTargets.find(t => t > totalPlatform) || 50;
    const prevTarget = allTargets[allTargets.indexOf(nextTarget) - 1] || 0;
    
    // Percentage resets to 0% for the CURRENT quest (e.g. from 50 to 100)
    const range = nextTarget - prevTarget;
    const progress = Math.max(0, totalPlatform - prevTarget);
    const pct = Math.min(100, (progress / range) * 100);

    if (milestonePctEl) milestonePctEl.textContent = Math.round(pct) + '%';
    if (milestoneTargetEl) milestoneTargetEl.textContent = nextTarget + ' HRS';

    // The progress bar shows the FULL journey towards the next target (from 0 to nextTarget)
    const timelineEnd = nextTarget;
    const timelinePct = Math.min(100, (totalPlatform / timelineEnd) * 100);
    const progressBar = document.getElementById('milestone-progress-bar');
    if (progressBar) progressBar.style.width = timelinePct + '%';

    // Update Timeline Nodes (Showing 0, Previous, and Next)
    const nodesLayer = document.getElementById('milestone-timeline-nodes');
    const labelsRow = document.getElementById('milestone-labels-row');
    if (nodesLayer && labelsRow) {
      // Always show 0, the previous milestone, and the current goal
      const displayMilestones = Array.from(new Set([0, prevTarget, nextTarget])).sort((a, b) => a - b);
      
      nodesLayer.innerHTML = displayMilestones.map(m => {
        const left = (m / timelineEnd) * 100;
        const isCompleted = totalPlatform >= m;
        const isNext = m === nextTarget;
        return `<div class="milestone-node ${isCompleted ? 'unlocked' : 'locked'} ${isNext ? 'current-target' : ''}" style="left: ${left}%">
          <div class="node-ring"></div>
          <div class="node-icon">${isCompleted ? '✓' : '🔒'}</div>
        </div>`;
      }).join('');

      labelsRow.innerHTML = displayMilestones.map(m => {
        const left = (m / timelineEnd) * 100;
        return `<div class="milestone-label" style="left: ${left}%">${m === 0 ? '0' : m + ' HRS'}</div>`;
      }).join('');
    }

    // Global Average
    const avgEl = document.getElementById('milestone-avg-hrs');
    if (avgEl && telemetry.total_pilots > 0) {
      const avg = totalPlatform / telemetry.total_pilots;
      avgEl.textContent = avg.toFixed(1);
    }
  }

  let users = await fetchLeaderboard();
  
  const profileData = getSecureLocalProfileString();
  const myDisplayName = profileData ? JSON.parse(profileData).displayName : null;

  users = users.sort((a, b) => {
    const scoreA = calculateCompetitiveXP(a.total_hours, a.current_streak || 0, a.integrity_score || 0);
    const scoreB = calculateCompetitiveXP(b.total_hours, b.current_streak || 0, b.integrity_score || 0);
    return scoreB - scoreA;
  });
  setLbAllUsers(users);

  const climbData = { worst: {} as Record<string, number>, best: {} as Record<string, number> };
  users.forEach((u, i) => {
    climbData.worst[u.display_name] = i + 1;
    climbData.best[u.display_name] = i + 1;
  });

  renderLbPage(listEl, users, lbCurrentPage, climbData, myDisplayName);
  renderLbPagination(listEl, users.length);

  // Update MVP HUD
  if (users.length > 0) {
    const mvp = users[0];
    const mvpHandleEl = document.getElementById('milestone-mvp-text');
    const mvpPctEl = document.getElementById('milestone-mvp-share');
    if (mvpHandleEl) mvpHandleEl.textContent = `@${mvp.display_name}`;
    
    if (mvpPctEl && telemetry && telemetry.total_platform_hours > 0) {
      const pct = ((mvp.total_hours || 0) / telemetry.total_platform_hours) * 100;
      mvpPctEl.textContent = `(${pct.toFixed(1)}%)`;
    }
  }
}

