import { getSecureLocalProfileString, setSecureLocalProfileString } from '@/utils/security';
import { appState } from '@/state/app-state';
import { 
  broadcastGlobalStats, 
  isUsernameTaken, 
  loadUserProfileCloud,
  fetchMySessionsCloud
} from '@/services/vault.service';
import { getCurrentUserId } from '@/services/auth.service';
import { showToast } from '@/utils/dom.utils';
import { log } from '@/utils/logger.utils';
import { apiRequest } from '@/services/api.service';
import { 
  calculateTodayStudyHours, 
  calculateTotalStudyHours, 
  calculateStreak, 
  calculateBestStreak,
  calculateVerificationScore,
  calculateCompetitiveXP 
} from '@/utils/calc.utils';
import { getRankTitle } from '@/utils/rank.utils';
import { UserProfile, StudySession } from '@/types/profile.types';

// Tracks the last time the user did something in the app
export let lastInteractionAt = Date.now();

// Cache to prevent redundant broadcast network calls
let lastBroadcastPayload: string | null = null;

/** 
 * Silent Hydration: Checks if a profile exists and syncs it.
 * Called on app boot.
 */
export async function checkProfileIdentity(): Promise<void> {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const profileSaved = getSecureLocalProfileString();
  const usernameSaved = localStorage.getItem('tracker_username');

  // 1. Check local profile first
  let profile: UserProfile | null = profileSaved ? JSON.parse(profileSaved) : null;

  // 2. Data Sync: Detect missing cloud data and reconcile
  // We perform a brief delay to ensure local data is fully parsed
  setTimeout(async () => {
    const cloudProfile = await loadUserProfileCloud();
    
    if (cloudProfile) {
      // Standard Update Flow
      const updatedProfile = {
        displayName: cloudProfile.display_name,
        realName: cloudProfile.User_name || '',
        dob: cloudProfile.dob || '',
        nation: cloudProfile.nation || 'Global',
        avatar: cloudProfile.avatar || '👨‍🚀',
        phoneNumber: cloudProfile.phone_number || '',
        isFocusPublic: cloudProfile.is_focus_public !== false,
        isPublic: cloudProfile.is_public !== false,
        email: cloudProfile.email || ''
      };
      setSecureLocalProfileString(JSON.stringify(updatedProfile));
      localStorage.setItem('tracker_username', updatedProfile.displayName);
      log.success(`IDENTITY HYDRATED: @${updatedProfile.displayName} aligned with cloud.`);

      // Final check for profile completeness
      checkAndNotifyIncompleteProfile(updatedProfile);
      
      // Sync metrics after identity hydration
      await syncProfileBroadcast();

      // Reconcile tracker with cloud sessions if out of sync
      fetchMySessionsCloud().then(sessions => {
        if (sessions) selfHealTrackerFromSessions(sessions);
      });
    } else if (profileSaved) {
      // Data loss recovery: Broadcast local identity when cloud is empty
      console.warn("Recovery: Cloud profile missing. Re-broadcasting local identity...");
      if (profile) {
        checkAndNotifyIncompleteProfile(profile);
        await syncProfileBroadcast();
      }
    } else {
      // TRULY NEW USER -> Open Setup Modal
      const { openProfileModal } = await import('@/features/profile/profile.ui');
      openProfileModal();
    }
  }, 1000);

  // Ensure username anchor is set for legacy components (Static only, no broadcast)
  if (profile && !usernameSaved) {
    localStorage.setItem('tracker_username', profile.displayName);
  }
}

/** Broadcast local stats to the global leaderboard */
export async function syncProfileBroadcast(focusStateChanged = false): Promise<void> {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const saved = getSecureLocalProfileString();
  if (!saved) return;

  const profile = JSON.parse(saved) as UserProfile;

  // Broadcast immediately on focus state change (start/stop/break)
  // without waiting for the slow cloud sessions fetch. This ensures the leaderboard
  // updates within milliseconds, not seconds.
  if (focusStateChanged) {
    const isFocusingNow = appState.activeTimer.isRunning;
    const fastPayload = {
      display_name: profile.displayName,
      is_focus_public: profile.isFocusPublic !== false,
      is_public: profile.isPublic !== false,
      // Pass current cached values for other fields so they're not zeroed out
      ...(lastBroadcastPayload ? JSON.parse(lastBroadcastPayload) : {}),
      // Override focus fields with current values
      is_focusing_now: isFocusingNow,
      current_focus_subject: isFocusingNow ? (appState.activeTimer.colName || 'ACTIVE MISSION') : null,
    };
    broadcastGlobalStats(fastPayload).catch(() => {});
    // Refresh leaderboard UI immediately
    import('@/features/dashboard/leaderboard').then(m => m.refreshLeaderboard());
  }

  // Calculate stats from appState using centralized engine
  const trackerTotal = calculateTotalStudyHours(appState.trackerData);
  let totalHours = trackerTotal;
  let todayHours = calculateTodayStudyHours(appState.trackerData);
  
  // Hybrid Verification (Local + Cloud)
  let sessionTotal = appState.verifiedHours;

  // Fetch cloud sessions before broadcasting to ensure integrity score accuracy
  try {
    const cloudSessions = await fetchMySessionsCloud();
    const cloudTotal = (cloudSessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
    
    // Update local buffer immediately
    appState.verifiedHours = Math.max(cloudTotal, appState.verifiedHours);
    sessionTotal = appState.verifiedHours;

    if (cloudSessions && cloudSessions.length > 0) {
      // Calculate cloud today (matching local YYYY-MM-DD)
      const todayStr = new Date().toISOString().split('T')[0];
      const cloudToday = cloudSessions.reduce((sum, s) => {
        const sDate = s.log_date || (s.end_at || '').split('T')[0];
        return sDate === todayStr ? sum + (s.duration || 0) : sum;
      }, 0);

      if (cloudTotal > totalHours) {
        log.info(`[Sync] Leaderboard updated from Cloud Sessions: ${cloudTotal.toFixed(1)}h`);
        totalHours = cloudTotal;
      }
      if (cloudToday > todayHours) {
        todayHours = cloudToday;
      }
    }
  } catch (err) {
    log.error('Cloud session reconciliation failed', err);
  }

  // Prevent impossible study counts (Max 20h/day)
  if (todayHours > 20) {
    log.warn(`Data Validation: ${todayHours.toFixed(1)}h/day exceeds limits. Clipping to 20h.`);
    todayHours = 20;
  }

  // Capture isFocusing AFTER the async fetch to get current state
  const isFocusing = appState.activeTimer.isRunning;
  
  // Prevent broadcasting an integrity drop if waiting for session data
  if (trackerTotal > 1 && sessionTotal === 0 && !isFocusing) {
    log.info("Sync Guard: Deferring broadcast to prevent false Integrity drop (Waiting for sessions).");
    return;
  }
  
  // If timer is running, add its progress to the broadcast immediately
  if (isFocusing && appState.activeTimer.startTime) {
    const elapsedMs = (Date.now() - appState.activeTimer.startTime) + appState.activeTimer.elapsedAcc;
    const currentCapMs = appState.activeTimer.overrunCapMs || 10800000; // 3 Hours (Consistent with timer logic)
    
    // Ensure active timer broadcast doesn't exceed the configured cap
    const clampedElapsedMs = Math.min(elapsedMs, currentCapMs);
    const elapsedHrs = clampedElapsedMs / (1000 * 60 * 60);
    
    // For today_hours, only count time after midnight local time
    let todayElapsedHrs = elapsedHrs;
    if (appState.activeTimer.sessionStartClock) {
      const start = new Date(appState.activeTimer.sessionStartClock);
      const now = new Date();
      // Compare local calendar dates
      if (start.getDate() !== now.getDate() || start.getMonth() !== now.getMonth() || start.getFullYear() !== now.getFullYear()) {
        const midnight = new Date(now);
        midnight.setHours(0, 0, 0, 0);
        const clockBefore = midnight.getTime() - start.getTime();
        const clockAfter = now.getTime() - midnight.getTime();
        const totalClock = clockBefore + clockAfter;
        if (totalClock > 0) {
          const ratio = elapsedHrs / (totalClock / 3600000);
          todayElapsedHrs = (clockAfter / 3600000) * ratio;
        }
      }
    }

    todayHours += todayElapsedHrs;
    totalHours += elapsedHrs;
    sessionTotal += elapsedHrs; 
  }

  // Recalculate verification score with live hours included
  const verificationScore = calculateVerificationScore(sessionTotal, trackerTotal);

  // Prevent time regression during focus sessions
  if (lastBroadcastPayload) {
    const prev = JSON.parse(lastBroadcastPayload);
    if (prev.display_name === profile.displayName) {
      if (todayHours < prev.today_hours && isFocusing) {
        log.warn("Sync Guard: Prevented today_hours regression.");
        todayHours = prev.today_hours;
      }
      if (totalHours < prev.total_hours && isFocusing) {
        totalHours = prev.total_hours;
      }
    }
  }

  const streak = calculateStreak(appState.trackerData);
  const bestStreak = calculateBestStreak(appState.trackerData);

  const payload = {
    display_name: profile.displayName,
    dob: profile.dob,
    nation: profile.nation,
    avatar: profile.avatar,
    total_hours: Number(totalHours.toFixed(4)),
    today_hours: Number(todayHours.toFixed(4)),
    current_rank: `${getRankTitle(totalHours)} [S:${streak}]${profile.isFocusPublic === false ? ' [PRIV]' : ''}`,
    is_focusing_now: isFocusing,
    current_focus_subject: isFocusing ? (appState.activeTimer.colName || 'ACTIVE MISSION') : null,
    phone_number: profile.phoneNumber,
    is_focus_public: profile.isFocusPublic !== false,
    is_public: profile.isPublic !== false,
    email: (profile as any).email,
    User_name: profile.realName,
    integrity_score: verificationScore,
    is_verified: streak >= 10 && totalHours >= (streak * 3),
    competitive_score: calculateCompetitiveXP(totalHours, streak, verificationScore),
    current_streak: streak
  };

  // Persist full broadcast stats
  lastBroadcastPayload = JSON.stringify(payload);

  // Sync master state variables
  appState.verifiedTotalHours = payload.total_hours;
  appState.verifiedRankScore = payload.competitive_score;
  
  try {
    await broadcastGlobalStats(payload);
  } catch (err) {
    console.error('Broadcast failed:', err);
  }

  // Automatically refresh the UI to show the new stats
  import('@/features/dashboard/leaderboard').then(m => m.refreshLeaderboard());
  import('@/features/dashboard/dashboard').then(m => m.updateDashboard());
}

/** Professional Profile Persistence Flow */
export async function saveProfileData(data: UserProfile): Promise<boolean> {
  const syncId = getCurrentUserId() || '';
  if (!syncId) return false;

  try {
    const taken = await isUsernameTaken(data.displayName, syncId);
    if (taken) {
      alert(`IDENTITY CONFLICT: The handle "@${data.displayName}" is already claimed.`);
      return false;
    }

    const updatedProfile = await apiRequest<any>('/api/app/profile', {
      method: 'PATCH',
      body: {
        username: data.displayName,
        fullName: data.realName || '',
        nation: data.nation,
        avatar: data.avatar || '👤',
        metadata: {
          dob: data.dob || '',
          phoneNumber: data.phoneNumber || '',
          isPublic: data.isPublic !== false,
          isFocusPublic: data.isFocusPublic !== false,
        }
      }
    });

    const localProfile: UserProfile = {
      ...data,
      displayName: updatedProfile.username || data.displayName,
      realName: updatedProfile.fullName || data.realName,
      nation: updatedProfile.nation || data.nation,
      avatar: updatedProfile.avatar || data.avatar,
      dob: updatedProfile.metadata?.dob || data.dob,
      phoneNumber: updatedProfile.metadata?.phoneNumber || data.phoneNumber,
      isPublic: updatedProfile.metadata?.isPublic !== false,
      isFocusPublic: updatedProfile.metadata?.isFocusPublic !== false,
      email: updatedProfile.email || data.email,
    };

    setSecureLocalProfileString(JSON.stringify(localProfile));
    localStorage.setItem('tracker_username', localProfile.displayName);

    await syncProfileBroadcast();
    return true;
  } catch (error: any) {
    console.error("Identity Persistence Error:", error);
    throw error;
  }
}

/** 
 * Scans a profile for missing mission-critical sectors.
 */
export function isProfileIncomplete(profile: UserProfile): boolean {
  if (!profile) return true;
  return (
    !profile.displayName || 
    !profile.realName || 
    !profile.dob || 
    profile.nation === 'Global' || 
    !profile.email
  );
}

/**
 * Triggers the interactive mission alert if the operative identity is fragmented.
 */
export function checkAndNotifyIncompleteProfile(profile: UserProfile): void {
  if (isProfileIncomplete(profile)) {
    showToast(
      '⚠️ IDENTITY INCOMPLETE: Please finalize your Mission Profile to join the World Stage.', 
      'warning', 
      8000, 
      async () => {
        const { openProfileModal } = await import('./profile.ui');
        openProfileModal();
      }
    );
  }
}

/** Moves all your study data to a new Secret Key */
export async function handleIdentityMigration(currentKey: string, newKey: string): Promise<void> {
  const actualId = getCurrentUserId();
  if (currentKey !== actualId) {
    alert("Authentication Failure: Current Secret Key is incorrect.");
    return;
  }

  alert("Identity key migration is no longer available. Better Auth now manages account identity through your OAuth provider.");
}

// Stats aggregation managed by calc.utils.ts

/** Update the interaction timestamp for heartbeat management */
export function updateLastInteraction(): void {
  lastInteractionAt = Date.now();
}

/** Reconstruct tracker table from cloud session data */
async function selfHealTrackerFromSessions(sessions: StudySession[]): Promise<void> {
  const { adjustTrackerDataForSessionDelta } = await import('@/features/tracker/tracker');
  // Group sessions by day and subject to avoid redundant saves
  const dailyTotals = new Map<string, Map<string, number>>();
  
  sessions.forEach(s => {
    const date = s.log_date || (s.end_at || '').split('T')[0];
    const subject = s.subject || 'General';
    const duration = s.duration || 0;
    if (!date || duration <= 0) return;

    if (!dailyTotals.has(date)) dailyTotals.set(date, new Map());
    const dayMap = dailyTotals.get(date)!;
    dayMap.set(subject, (dayMap.get(subject) || 0) + duration);
  });

  // Apply absolute totals (Silent batch mode)
  for (const [date, subjects] of dailyTotals.entries()) {
    for (const [subject, total] of subjects.entries()) {
      await adjustTrackerDataForSessionDelta(date, subject, 0, total, true);
    }
  }

  // Broadcast update after reconstruction
  await syncProfileBroadcast();

  // Refresh UI after reconstruction
  const { generateTable } = await import('@/features/tracker/tracker');
  const { updateDashboard } = await import('@/features/dashboard/dashboard');
  generateTable();
  updateDashboard();
  log.success(`[Self-Heal]: Reconstructed dashboard from ${sessions.length} sessions.`);
}
