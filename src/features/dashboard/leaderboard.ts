import { appState } from '@/state/app-state';
import { STORAGE_KEYS, RANK_TIERS } from '@/config/constants';
import { broadcastGlobalStats, fetchLeaderboard, isUsernameTaken } from '@/services/supabase.service';
import type { UserProfile } from '@/types/profile.types';
import { getCurrentUserId, setupPasswordToggle } from '@/services/auth.service';
import { initiateIdentityMigration } from '@/services/identity.service';

// Tracks the last time the user did something in the app
let lastInteractionAt = Date.now();

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

  // 2. Schedule periodic updates (every 1 min)
  setInterval(() => refreshLeaderboard(), 60000);

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

  // Heartbeat every 30 seconds: Sync if user is active or timer is running
  setInterval(() => {
    const isTimerRunning = appState.activeTimer.isRunning;
    const isRecentActive = (Date.now() - lastInteractionAt) < 30 * 1000;
    
    if (isTimerRunning || isRecentActive) {
      syncProfileBroadcast();
    }
  }, 30000);
}

/** Fetches and renders the leaderboard list */
export async function refreshLeaderboard(): Promise<void> {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  const users = await fetchLeaderboard();
  const mySyncId = getCurrentUserId();

  // Logic for the 'Climb Engine' (shows if you moved up/down today)
  const CLIMB_KEY = 'arena_climb_v2';
  localStorage.removeItem('arena_climb_baselines'); // 🚨 SECURITY WIPE: Purge old exposed sync_ids
  
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
    listEl.innerHTML = `<div class="leaderboard-placeholder">Arena is dark. Start a session to light it up.</div>`;
    return;
  }

  const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  const myDisplayName = profileData ? JSON.parse(profileData).displayName : null;

  listEl.innerHTML = users.map((u, i) => {
    const isMe = myDisplayName ? u.display_name === myDisplayName : false;
    const isoCode = NATION_FLAGS[u.nation] || 'un';
    const flagUrl = `https://flagcdn.com/w40/${isoCode}.png`;
    const flagImg = `<img src="${flagUrl}" alt="${u.nation}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    const avatar = u.avatar || `👤`; // Professional default avatar
    const rankLabel = u.current_rank || 'RECRUIT';
    
    const lastActive = new Date(u.last_active);
    const isToday = lastActive.toDateString() === new Date().toDateString();
    const displayTodayHours = isToday ? (u.today_hours || 0) : 0;

    const now = new Date();
    const diffMins = (now.getTime() - lastActive.getTime()) / 60000;
    
    let statusClass = 'offline';
    let statusLabel = '';
    
    if (u.is_focusing_now) {
      statusClass = 'focusing';
      statusLabel = 'FOCUSING';
    } else if (diffMins < 5) {
      statusClass = 'online';
      statusLabel = 'ONLINE';
    } else {
      const isToday = now.toDateString() === lastActive.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.toDateString() === lastActive.toDateString();
      
      const timeStr = lastActive.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      
      if (isToday) {
        if (diffMins < 60) {
          statusLabel = `last seen ${Math.floor(diffMins)} mins ago`;
        } else {
          statusLabel = `last seen today at ${timeStr}`;
        }
      } else if (isYesterday) {
        statusLabel = `last seen yesterday at ${timeStr}`;
      } else {
        const dateStr = lastActive.toLocaleDateString([], { day: 'numeric', month: 'short' });
        statusLabel = `last seen ${dateStr}`;
      }
    }

    // 🏆 Gamification Logic
    const level = Math.floor(u.total_hours / 10) + 1;
    const xpPercent = Math.min((u.total_hours % 10) * 10, 100);
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';

    // 🎖️ 20K Title Engine
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
    const customMedal = i < 3 ? `<span class="pilot-medal ${medalClasses[i]}">${i + 1}</span>` : `${i + 1}`;

    // Calculate if the user moved up or down since the morning
    const currentRank = i + 1;
    const worstSeen = climbData.worst[u.display_name] || currentRank;
    const bestSeen = climbData.best[u.display_name] || currentRank;
    
    let trendHtml = '';

    // Calculate Jump (from lowest point) or Drop (from highest point)
    const jumpDelta = worstSeen - currentRank; 
    const dropDelta = currentRank - bestSeen;

    if (jumpDelta > 0) {
      trendHtml = `
        <div class="rank-delta trend-up" title="Climbed ${jumpDelta} spots from today's lowest point">
          <svg class="hour-trend-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M12 4L18 10M12 4L6 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${jumpDelta}</span>
        </div>
      `;
    } else if (dropDelta > 0) {
      trendHtml = `
        <div class="rank-delta trend-down" title="Dropped ${dropDelta} spots from today's peak">
          <svg class="hour-trend-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 20V4M12 20L6 14M12 20L18 14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${dropDelta}</span>
        </div>
      `;
    } 
    // 🚀 High-Focus Momentum: Highlight active climbers even when stable
    else if (u.is_focusing_now) {
      trendHtml = `
        <div class="rank-delta trend-up momentum-only" title="Gaining ground (Live Focus)">
          <svg class="hour-trend-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M12 4L18 10M12 4L6 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
    }

    return `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''}" title="${u.display_name} | Lvl ${level} | ${u.nation}" style="--rank-color: ${rankColor};">
        <div class="rank-num">
          ${customMedal}
        </div>
        
        <div class="lb-avatar-wrapper">
          <div class="lb-avatar" style="border-color: ${rankColor}; box-shadow: 0 0 10px ${rankColor}40;">${avatar}</div>
          <div class="nation-emblem" title="${u.nation}">${flagImg}</div>
        </div>

        <div class="lb-info">
          <div class="lb-name">
            <span class="lb-handle">@${u.display_name}</span>
            <span class="status-tag ${statusClass}">${statusLabel}</span>
          </div>
          
          <div class="lb-meta">
            Lvl ${level} ${title} • <span style="color: ${rankColor}; font-weight: 800; text-shadow: 0 0 8px ${rankColor}60;">${rankLabel}</span>
          </div>

          <div class="lb-xp-container">
            <div class="lb-xp-bar" style="width: ${xpPercent}%; background: ${rankColor}; box-shadow: 0 0 8px ${rankColor};"></div>
          </div>
        </div>

        <div class="lb-hours-container">
          <div class="lb-total-hours">${u.total_hours.toFixed(1)}h</div>
          <div class="lb-today-badge">
            ${displayTodayHours.toFixed(1)}h today
            ${trendHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
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
      
      // 👺 SYNC FIX: Ensure the modal preview matches the the proven archetype (Header/Cloud)
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

  // Broadcast to global Arena
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

  await broadcastGlobalStats({
    display_name: profile.displayName,
    age: profile.age,
    nation: profile.nation,
    avatar: profile.avatar,
    total_hours: totalHours,
    today_hours: todayHours,
    current_rank: rank,
    is_focusing_now: isFocusing
  });

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
      alert("Mission Successful: Identity Migrated. The Arena will now reload.");
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
