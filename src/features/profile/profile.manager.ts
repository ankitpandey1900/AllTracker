import { getSecureLocalProfileString, setSecureLocalProfileString } from '@/utils/security';
import { appState } from '@/state/app-state';
import { 
  broadcastGlobalStats, 
  isUsernameTaken, 
  loadUserProfileCloud 
} from '@/services/vault.service';
import { getCurrentUserId } from '@/services/auth.service';
import { showToast } from '@/utils/dom.utils';
import { log } from '@/utils/logger.utils';
import { apiRequest } from '@/services/api.service';
import type { UserProfile } from '@/types/profile.types';
import { calculateTodayStudyHours, calculateTotalStudyHours, calculateStreak, calculateBestStreak } from '@/utils/calc.utils';

// Tracks the last time the user did something in the app
export let lastInteractionAt = Date.now();

// 🛡️ BROADCAST CACHE: Prevents redundant network calls if data is unchanged
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

  // 2. SELF-HEALING SYNC: Detect missing cloud data and RECOVER it
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

      // 🛡️ IDENTITY GUARD: Final check for completeness
      checkAndNotifyIncompleteProfile(updatedProfile);
      
      // 🔥 BROADCAST AFTER HYDRATION: Sync metrics with the now-correct identity
      await syncProfileBroadcast();
    } else if (profileSaved) {
      // 🚨 RECOVERY MODE: Local profile exists but Cloud is empty (Data loss recovery)
      console.warn("🛡️ RECOVERY: Cloud profile missing. Re-broadcasting local identity...");
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

/** 🚀 WORLD STAGE BROADCAST: Sync local stats to the global leaderboard */
export async function syncProfileBroadcast(): Promise<void> {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const saved = getSecureLocalProfileString();
  if (!saved) return;

  const profile = JSON.parse(saved) as UserProfile;

  // Calculate stats from appState using centralized engine
  let totalHours = calculateTotalStudyHours(appState.trackerData);
  let todayHours = calculateTodayStudyHours(appState.trackerData);
  
  // Get current Rank Label (approximate for broadcast)
  const rank = document.getElementById('studyRank')?.textContent || 'IRON';
  const isFocusing = appState.activeTimer.isRunning;

  // If timer is running, add its progress to the broadcast immediately
  if (isFocusing && appState.activeTimer.startTime) {
    const elapsedMs = (Date.now() - appState.activeTimer.startTime) + appState.activeTimer.elapsedAcc;
    const elapsedHrs = elapsedMs / (1000 * 60 * 60);
    todayHours += elapsedHrs;
    totalHours += elapsedHrs;
  }

  // 🛡️ CONTINUITY GUARD: Prevent time regression during focus sessions
  // If we have a cached payload that had more time, stick with it until the next second
  if (lastBroadcastPayload) {
    const prev = JSON.parse(lastBroadcastPayload);
    if (prev.display_name === profile.displayName) {
      if (todayHours < prev.today_hours && isFocusing) {
        log.warn("SYNC GUARD: Prevented today_hours regression.");
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
    current_rank: `${rank} [B:${bestStreak}]${profile.isFocusPublic === false ? ' [PRIV]' : ''}`,
    is_focusing_now: isFocusing,
    current_focus_subject: isFocusing ? (appState.activeTimer.colName || 'ACTIVE MISSION') : null,
    phone_number: profile.phoneNumber,
    is_focus_public: profile.isFocusPublic !== false,
    is_public: profile.isPublic !== false,
    email: (profile as any).email,
    User_name: profile.realName
  };

  // 🛡️ BROADCAST DEDUPLICATION: Only sync if status or hours changed significantly
  const currentPayloadStr = JSON.stringify(payload);
  if (lastBroadcastPayload === currentPayloadStr) return;

  lastBroadcastPayload = currentPayloadStr;
  
  // 🔥 BLOCKING BROADCAST: Ensure database state matches before we re-fetch the leaderboard
  try {
    await broadcastGlobalStats(payload);
  } catch (err) {
    console.error('Broadcast failed:', err);
  }

  // Automatically refresh the UI leaderboard to show the new stat
  import('@/features/dashboard/leaderboard').then(m => {
    m.refreshLeaderboard();
  });
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
