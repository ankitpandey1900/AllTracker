import { appState } from '@/state/app-state';
import { STORAGE_KEYS } from '@/config/constants';
import { broadcastGlobalStats, fetchLeaderboard } from '@/services/supabase.service';
import type { UserProfile, GlobalProfile } from '@/types/profile.types';
import { getCurrentUserId } from '@/services/auth.service';

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
    const rankLabel = u.current_rank || 'IRON';
    
    return `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''}" title="${u.display_name} | ${u.age} yrs | ${u.nation}">
        <div class="rank-num">${i + 1}</div>
        <div class="lb-avatar">${flag}</div>
        <div class="lb-info">
          <div class="lb-name">
            ${u.display_name} 
            ${u.is_focusing_now ? '<span class="active-pulse" title="Currently Focusing"></span>' : ''}
          </div>
          <div class="lb-meta">
            ${rankLabel} • ${u.age} yrs
          </div>
        </div>
        <div class="lb-hours">${u.total_hours.toFixed(1)}h</div>
      </div>
    `;
  }).join('');
}

/** Checks if user has a profile; if not, triggers the setup modal */
export function checkProfileIdentity(): void {
  const syncId = getCurrentUserId();
  if (!syncId) return;

  const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!saved) {
    openProfileModal();
  } else {
    // Broadcast periodically
    syncProfileBroadcast();
  }
}

export function openProfileModal(): void {
  const modal = document.getElementById('profileSetupModal');
  if (modal) modal.classList.add('active');
}

async function handleProfileSave(): Promise<void> {
  const nameInput = document.getElementById('profileNameInput') as HTMLInputElement;
  const ageInput = document.getElementById('profileAgeInput') as HTMLInputElement;
  const nationInput = document.getElementById('profileNationInput') as HTMLSelectElement;

  const name = nameInput.value.trim();
  const age = parseInt(ageInput.value) || 0;
  const nation = nationInput.value;

  if (!name || age <= 0) {
    alert("Bhai/Behen, please enter a valid name and age!");
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

  await broadcastGlobalStats({
    display_name: profile.displayName,
    age: profile.age,
    nation: profile.nation,
    total_hours: totalHours,
    current_rank: rank,
    is_focusing_now: document.body.classList.contains('focus-mode-active') // Assuming class
  });
}
