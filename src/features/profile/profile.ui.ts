import { getSecureLocalProfileString, setSecureLocalProfileString } from "@/utils/security";
import { appState } from "@/state/app-state";
import { calculateTodayStudyHours, calculateTotalStudyHours, getRankProgression } from "@/utils/calc.utils";
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
  setupAvatarPicker();
  bindActions();
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

  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.onclick = handleProfileSaveSubmission;
  }
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
