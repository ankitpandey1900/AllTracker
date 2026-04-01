import { appState } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import { broadcastGlobalStats, fetchLeaderboard, isUsernameTaken } from '@/services/supabase.service';
import type { UserProfile } from '@/types/profile.types';
import { getCurrentUserId, setupPasswordToggle } from '@/services/auth.service';
import { initiateIdentityMigration } from '@/services/identity.service';

const NATION_FLAGS: Record<string, string> = {
  'Global': '🏳️',
  'India': '🇮🇳',
  'USA': '🇺🇸',
  'UK': '🇬🇧',
  'Canada': '🇨🇦',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'Other': '🌍'
};

/** Initializes the World Stage and identity check */
export async function initWorldStage(): Promise<void> {
  // 1. Initial render (fetch top 10)
  await refreshLeaderboard();

  // 2. Schedule periodic updates (every 5 mins)
  setInterval(() => refreshLeaderboard(), 300000);

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
}

/** Fetches and renders the leaderboard list */
export async function refreshLeaderboard(): Promise<void> {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  const users = await fetchLeaderboard();
  const mySyncId = getCurrentUserId();

  if (users.length === 0) {
    listEl.innerHTML = `<div class="leaderboard-placeholder">Arena is dark. Start a session to light it up.</div>`;
    return;
  }

  listEl.innerHTML = users.map((u, i) => {
    const isMe = u.sync_id === mySyncId;
    const flag = NATION_FLAGS[u.nation] || '🌍';
    const rankLabel = u.current_rank || 'UNRANKED PILOT';
    
    return `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''}" title="${u.display_name} | ${u.age} yrs | ${u.nation}">
        <div class="rank-num">${i + 1}</div>
        <div class="lb-avatar">${flag}</div>
        <div class="lb-info">
          <div class="lb-name">
            @${u.display_name} 
            ${u.is_focusing_now ? '<span class="active-pulse" title="Currently Focusing"></span>' : ''}
          </div>
          <div class="lb-meta">
            ${rankLabel} • ${u.age} yrs
          </div>
        </div>
        <div class="lb-hours-container">
          <div class="lb-total-hours">${u.total_hours.toFixed(1)}h</div>
          <div class="lb-today-badge">${(u.today_hours || 0).toFixed(1)}h today</div>
        </div>
      </div>
    `;
  }).join('');
}

/** Checks if user has a profile; if not, triggers the setup modal */
export function checkProfileIdentity(): void {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const profileSaved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  const usernameSaved = localStorage.getItem('tracker_username');

  // Case 1: No profile at all -> Open Setup
  if (!profileSaved) {
    openProfileModal();
  } 
  // Case 2: New Identity system requires Username binding
  else if (!usernameSaved) {
    const profile = JSON.parse(profileSaved) as UserProfile;
    localStorage.setItem('tracker_username', profile.displayName);
    syncProfileBroadcast();
  }
  else {
    // Both exist, just broadcast
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
      if (handleEl) handleEl.textContent = `@${profile.displayName}`;
      if (rankEl) rankEl.textContent = `${totalHours > 100 ? 'VENERATED' : 'PILOT'} • ${profile.nation.toUpperCase()}`;
      
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
  }
}

async function handleProfileSave(): Promise<void> {
  const nameInput = document.getElementById('profileNameInput') as HTMLInputElement;
  const ageInput = document.getElementById('profileAgeInput') as HTMLInputElement;
  const nationInput = document.getElementById('profileNationInput') as HTMLSelectElement;

  const name = nameInput.value.trim();
  const age = parseInt(ageInput.value) || 0;
  const nation = nationInput.value;
  const syncId = getCurrentUserId() || '';

  if (!name || age <= 0 || !nation) {
    alert("Bhai/Behen, please complete your Mission Profile fully!");
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

  const profile: UserProfile = {
    displayName: name,
    age,
    nation,
    syncId: getCurrentUserId() || ''
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

/** Pulls current local stats and broadcasts to the global leaderboard */
export async function syncProfileBroadcast(): Promise<void> {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!saved) return;

  const profile = JSON.parse(saved) as UserProfile;
  
  // Calculate total hours from appState
  const totalHours = appState.trackerData.reduce(
    (sum, d) => sum + (Array.isArray(d.studyHours) ? d.studyHours.reduce((s, n) => s + (n || 0), 0) : 0),
    0
  );

  // Get Rank (approximate for leaderboard simple display)
  const rank = document.getElementById('studyRank')?.textContent || 'IRON';

  const todayHours = calculateTodayStudyHours();

  await broadcastGlobalStats({
    display_name: profile.displayName,
    age: profile.age,
    nation: profile.nation,
    total_hours: totalHours,
    today_hours: todayHours,
    current_rank: rank,
    is_focusing_now: document.body.classList.contains('focus-mode-active') // Assuming class
  });
}

/** Handles the high-stakes Secret Key migration process */
async function handleIdentityMigration(): Promise<void> {
  const currentKeyInput = document.getElementById('currentSecretKeyInput') as HTMLInputElement;
  const newKeyInput = document.getElementById('newSecretKeyInput') as HTMLInputElement;

  const currentKey = currentKeyInput.value.trim();
  const newKey = newKeyInput.value.trim();

  if (!currentKey || !newKey) {
    alert("Bhai/Behen, please provide both current and new Secret Keys!");
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
