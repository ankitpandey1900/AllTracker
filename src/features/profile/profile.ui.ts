import { getSecureLocalProfileString, setSecureLocalProfileString } from "@/utils/security";
import { appState } from "@/state/app-state";
import { calculateTodayStudyHours, calculateTotalStudyHours, getRankProgression, calculateVerificationScore, calculateStreak, calculateBestStreak } from "@/utils/calc.utils";
import type { UserProfile } from "@/types/profile.types";
import { saveProfileData } from "./profile.manager";

const AVATARS = [
  "🦇", "🕷️", "⚡", "🦸‍♂️", "🦹‍♂️", "🚀",
  "🛰", "🪐", "☁️", "🌌", "🦾", "🥷",
  "🏀", "🏎️", "🥊", "🏂", "🛹", "⚽",
  "🏋️‍♂️", "🎯", "🐉", "🦖", "🦈", "🐺",
  "🦅", "🐍", "🦂", "🦍", "🗿", "👽",
  "💀", "🥶", "👺", "👑", "💎", "🎲",
  "👰‍♀️", "🐼", "🦄", "🎧", "⚒️", "🖥️",
  "✈️", "🛩️", "🛴", "🚨",
  "🔥", "🌪️", "🌊", "❄️", "☠️", "🧨",
  "🛡️", "⚔️", "🔱", "🪓", "🏹", "🔨",
  "🤖", "👾", "👻", "🎭", "🎮", "🕹️",
  "💻", "⌚", "📱", "📸", "🎥", "📡",
  "🚁", "🚂", "🚢", "⛵", "🚤", "🏍️",
  "🚗", "🚓", "🚑", "🚒", "🚜", "🛻",
  "🐅", "🦁", "🐆", "🦓", "🦬", "🦣",
  "🦏", "🐘", "🦌", "🦉", "🦜",
  "🌋", "🏔️", "🏝️", "🌃", "🌠", "🌙",
];

export async function openProfileModal(): Promise<void> {
  const modal = document.getElementById("profileSetupModal");
  if (!modal) return;

  modal.classList.add("active");
  modal.style.display = "flex";

  const hasProfile = !!getSecureLocalProfileString();
  const passportPane = document.getElementById("passportViewPane");
  const editPane = document.getElementById("profileEditPane");

  if (hasProfile && passportPane && editPane) {
    passportPane.classList.remove("hidden");
    editPane.classList.add("hidden");
  } else if (passportPane && editPane) {
    passportPane.classList.add("hidden");
    editPane.classList.remove("hidden");
  }

  const totalHours = calculateTotalStudyHours(appState.trackerData);
  const todayHours = calculateTodayStudyHours(appState.trackerData);
  const totalHoursEl = document.getElementById("totalHoursPassport");
  const todayHoursEl = document.getElementById("todayHoursPassport");

  if (totalHoursEl) totalHoursEl.textContent = `${totalHours.toFixed(1)}`;
  if (todayHoursEl) todayHoursEl.textContent = `${todayHours.toFixed(1)}`;

  const bestStreak = document.getElementById("bestStreakPassport");
  const { calculateBestStreak } = await import("@/utils/calc.utils");
  if (bestStreak) bestStreak.textContent = `${calculateBestStreak(appState.trackerData)}`;

  const beacon = document.getElementById("statusBeacon");
  if (beacon) {
    beacon.className = `status-beacon ${appState.activeTimer.isRunning ? "focusing" : "idle"}`;
  }

  hydrateIdentityFields();
  hydrateRankProgression(totalHours);
  hydrateStatsTab(totalHours);
  setupAvatarPicker();
  bindActions();
  loadProfilePosts();
}

function hydrateRankProgression(totalHours: number): void {
  const prog = getRankProgression(totalHours);
  const rankDisplay = document.getElementById("displayRank");
  if (rankDisplay) {
    rankDisplay.textContent = prog.current.toUpperCase();
  }
}

function bindActions(): void {
  const passportPane = document.getElementById("passportViewPane");
  const editPane = document.getElementById("profileEditPane");
  const closeModal = () => {
    const modal = document.getElementById("profileSetupModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.style.display = "none";
  };

  document.getElementById("closeProfileModal")?.addEventListener("click", closeModal);
  document.getElementById("closeProfileModalAlt")?.addEventListener("click", closeModal);
  document.getElementById("switchToEditProfileBtn")?.addEventListener("click", () => {
    passportPane?.classList.add("hidden");
    editPane?.classList.remove("hidden");
  });
  document.getElementById("switchToPassportBtn")?.addEventListener("click", () => {
    editPane?.classList.add("hidden");
    passportPane?.classList.remove("hidden");
  });

  // Tab switching
  document.querySelectorAll('.profile-tab').forEach(tab => {
    (tab as HTMLElement).addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.profile-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = (tab as HTMLElement).dataset.tab;
      document.getElementById(`profile${capitalize(target || '')}Tab`)?.classList.add('active');
    });
  });

  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.onclick = handleProfileSaveSubmission;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hydrateStatsTab(totalHours: number): void {
  const prog = getRankProgression(totalHours);
  const streak = calculateStreak(appState.trackerData);
  const bestStreak = calculateBestStreak(appState.trackerData);
  const trackerTotal = calculateTotalStudyHours(appState.trackerData);
  const verifiedScore = calculateVerificationScore(appState.verifiedHours || 0, trackerTotal);

  const rankFull = document.getElementById('dossierRankFull');
  if (rankFull) {
    rankFull.textContent = prog.current.toUpperCase();
    const colors: Record<string, string> = {
      'IRON': '#94a3b8', 'BRONZE': '#cd7f32', 'SILVER': '#c0c0c0',
      'GOLD': '#fbbf24', 'PLATINUM': '#22d3ee', 'DIAMOND': '#a78bfa',
      'MASTER': '#f43f5e', 'LEGEND': '#ff6b35'
    };
    rankFull.style.color = colors[prog.current.toUpperCase()] || '#94a3b8';
  }

  const trustEl = document.getElementById('dossierTrustScore');
  if (trustEl) {
    trustEl.textContent = `${verifiedScore}%`;
    trustEl.style.color = verifiedScore > 75 ? '#10b981' : (verifiedScore > 40 ? '#fbbf24' : '#ef4444');
  }

  const streakEl = document.getElementById('dossierCurrentStreak');
  if (streakEl) streakEl.textContent = `${streak} days`;

  const bestEl = document.getElementById('dossierBestStreak');
  if (bestEl) bestEl.textContent = `${bestStreak} days`;
}

async function loadProfilePosts(): Promise<void> {
  const listEl = document.getElementById('profilePostsList');
  if (!listEl) return;

  // Get user's auth ID to fetch their posts
  try {
    const { apiRequest } = await import('@/services/api.service');
    const posts = await apiRequest<any[]>('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'user_posts', user_id: 'me' }
    });

    const postCountEl = document.getElementById('postCountPassport');
    if (postCountEl) postCountEl.textContent = String(posts.length);

    if (posts.length === 0) {
      listEl.innerHTML = '<div class="profile-posts-empty">No posts yet. Share something in the World Feed!</div>';
      return;
    }

    listEl.innerHTML = posts.map((t: any) => {
      const time = getRelativeTime(new Date(t.created_at));
      return `
        <div class="profile-feed-card">
          <div class="pfc-content">${escapeHtml(t.content)}</div>
          <div class="pfc-meta">
            <span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 7.501 4.435 5.605 8.222l-1.97 4.079a.75.75 0 0 1-1.42-.332l-.23-4.124a.75.75 0 0 0-.75-.697h-.975a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 0-.75-.75H8.375a.75.75 0 0 0-.75.697l-.23 4.124a.75.75 0 0 1-1.42.332L4.005 14C2.505 11.987 1.751 10 1.751 10z"/></svg>
              ${t.replies_count || 0}
            </span>
            <span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>
              ${t.reposts_count || 0}
            </span>
            <span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/></svg>
              ${t.likes_count || 0}
            </span>
            <span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/></svg>
              ${t.views_count || 0}
            </span>
            <span class="pfc-time">${time}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch {
    listEl.innerHTML = '<div class="profile-posts-empty">Could not load posts.</div>';
  }
}

function getRelativeTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hydrateIdentityFields(): void {
  const saved = getSecureLocalProfileString();
  if (!saved) return;

  const profile = JSON.parse(saved) as UserProfile;
  const passportAvatar = document.getElementById("passportAvatar");
  const profileName = document.getElementById("profileDisplayName");
  const handleEl = document.getElementById("displayHandle");
  const nationBadge = document.getElementById("profileNationBadge");
  const dossierName = document.getElementById("dossierRealName");
  const dossierEmail = document.getElementById("dossierEmail");
  const dossierPhone = document.getElementById("dossierPhone");

  if (profileName) profileName.textContent = profile.realName || profile.displayName;
  if (handleEl) handleEl.textContent = `@${profile.displayName}`;
  if (passportAvatar) passportAvatar.textContent = profile.avatar || "👤";
  if (nationBadge) nationBadge.textContent = profile.nation || "Global";
  
  const setDossierVal = (el: HTMLElement | null, val: string | undefined) => {
    if (!el) return;
    if (val) {
      el.textContent = val;
      el.style.color = '#f8fafc';
      el.style.fontStyle = 'normal';
      el.style.opacity = '1';
    } else {
      el.textContent = '[ NOT SET ]';
      el.style.color = '#ef4444';
      el.style.fontStyle = 'italic';
      el.style.opacity = '0.7';
    }
  };

  setDossierVal(dossierName, profile.realName);
  setDossierVal(dossierEmail, profile.email);
  setDossierVal(dossierPhone, profile.phoneNumber);

  const trackerTotal = calculateTotalStudyHours(appState.trackerData);
  const verifiedScore = calculateVerificationScore(appState.verifiedHours || 0, trackerTotal);
  const dossierTrust = document.getElementById("dossierTrustScore");
  if (dossierTrust) {
    dossierTrust.textContent = `${verifiedScore}%`;
    dossierTrust.style.color = verifiedScore > 75 ? '#10b981' : (verifiedScore > 40 ? '#fbbf24' : '#ef4444');
  }

  const hInput = document.getElementById("profileNameInput") as HTMLInputElement;
  const rnInput = document.getElementById("profileRealNameInput") as HTMLInputElement;
  const dInput = document.getElementById("profileDobInput") as HTMLInputElement;
  const eInput = document.getElementById("profileEmailInput") as HTMLInputElement;
  const pInput = document.getElementById("profilePhoneInput") as HTMLInputElement;
  const nSelect = document.getElementById("profileNationSelect") as HTMLSelectElement;

  if (hInput) { hInput.value = profile.displayName || ""; if (profile.displayName) hInput.setAttribute('disabled', 'true'); }
  if (rnInput) { rnInput.value = profile.realName || ""; if (profile.realName) rnInput.setAttribute('disabled', 'true'); }
  if (dInput) { dInput.value = profile.dob || ""; if (profile.dob) dInput.setAttribute('disabled', 'true'); }
  if (eInput) { eInput.value = profile.email || ""; if (profile.email) eInput.setAttribute('disabled', 'true'); }
  if (pInput) { pInput.value = profile.phoneNumber || ""; if (profile.phoneNumber) pInput.setAttribute('disabled', 'true'); }
  if (nSelect) { nSelect.value = profile.nation || "Global"; if (profile.nation && profile.nation !== "Global") nSelect.setAttribute('disabled', 'true'); }

  const publicToggle = document.getElementById("profilePublicToggle") as HTMLInputElement | null;
  const focusToggle = document.getElementById("profileFocusPrivacyToggle") as HTMLInputElement | null;
  if (publicToggle) publicToggle.checked = profile.isPublic !== false;
  if (focusToggle) focusToggle.checked = profile.isFocusPublic !== false;

  const editPreview = document.getElementById("editAvatarPreview");
  if (editPreview) editPreview.textContent = profile.avatar || "👤";
}

function setupAvatarPicker(): void {
  const avatarGrid = document.getElementById("avatarPickerGrid");
  if (!avatarGrid) return;

  if (avatarGrid.children.length === 0) {
    AVATARS.forEach((emoji) => {
      const div = document.createElement("div");
      div.className = "avatar-item";
      div.setAttribute("data-avatar", emoji);
      div.textContent = emoji;
      avatarGrid.appendChild(div);
    });
  }

  const currentAvatar =
    (() => {
      try {
        const raw = getSecureLocalProfileString();
        return raw ? (JSON.parse(raw) as UserProfile).avatar : "👤";
      } catch {
        return "👤";
      }
    })() || "👤";

  avatarGrid.querySelectorAll(".avatar-item").forEach((item) => {
    item.classList.toggle(
      "active",
      item.getAttribute("data-avatar") === currentAvatar,
    );

    (item as HTMLElement).onclick = () => {
      avatarGrid.querySelectorAll(".avatar-item").forEach((node) => node.classList.remove("active"));
      item.classList.add("active");
      const livePassportAvatar = document.getElementById("passportAvatar");
      const editPreview = document.getElementById("editAvatarPreview");
      const avatar = item.getAttribute("data-avatar") || "👤";
      if (livePassportAvatar) livePassportAvatar.textContent = avatar;
      if (editPreview) editPreview.textContent = avatar;
    };
  });
}

async function handleProfileSaveSubmission(): Promise<void> {
  const saveBtn = document.getElementById("saveProfileBtn") as HTMLButtonElement | null;
  const originalText = saveBtn?.textContent || "Save";

  const data: UserProfile = {
    displayName: (document.getElementById("profileNameInput") as HTMLInputElement).value.trim(),
    realName: (document.getElementById("profileRealNameInput") as HTMLInputElement).value.trim(),
    dob: (document.getElementById("profileDobInput") as HTMLInputElement).value,
    nation: (document.getElementById("profileNationSelect") as HTMLSelectElement).value,
    phoneNumber: (document.getElementById("profilePhoneInput") as HTMLInputElement).value.trim(),
    email: (document.getElementById("profileEmailInput") as HTMLInputElement).value.trim(),
    isPublic: (document.getElementById("profilePublicToggle") as HTMLInputElement)?.checked ?? true,
    isFocusPublic: (document.getElementById("profileFocusPrivacyToggle") as HTMLInputElement)?.checked ?? true,
    avatar:
      document
        .querySelector("#avatarPickerGrid .avatar-item.active")
        ?.getAttribute("data-avatar") || "👤",
  };

  if (!data.displayName || !data.email) {
    alert("Handle and email are required.");
    return;
  }

  try {
    if (saveBtn) {
      saveBtn.textContent = "SYNCHRONIZING...";
      saveBtn.disabled = true;
    }

    const success = await saveProfileData(data);
    if (success) {
      setSecureLocalProfileString(JSON.stringify(data));
      await openProfileModal();
    }
  } catch (error) {
    console.error(error);
    alert("Identity sync interrupted.");
  } finally {
    if (saveBtn) {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }
}
