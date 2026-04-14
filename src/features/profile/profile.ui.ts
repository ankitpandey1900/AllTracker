import { getSecureLocalProfileString, setSecureLocalProfileString } from '@/utils/security';
import { appState } from '@/state/app-state';
import { calculateTodayStudyHours, calculateTotalStudyHours, getRankProgression, getTopCategories } from '@/utils/calc.utils';
import type { UserProfile } from '@/types/profile.types';
import { saveProfileData, handleIdentityMigration } from './profile.manager';

/** Opens the Mission Profile Identity Portal with Professional Entrance */
export async function openProfileModal(): Promise<void> {
  const modal = document.getElementById('profileSetupModal');
  if (!modal) return;

  // 🛡️ PROFESSIONAL ENTRANCE: Smooth backdrop + Content Pop
  modal.classList.add('active');
  modal.style.display = 'flex';

  // State Management: Default to Passport view if profile exists
  const hasProfile = !!getSecureLocalProfileString();
  const passportPane = document.getElementById('passportViewPane');
  const editPane = document.getElementById('profileEditPane');
  
  if (hasProfile && passportPane && editPane) {
    passportPane.classList.remove('hidden');
    editPane.classList.add('hidden');
  } else if (passportPane && editPane) {
    passportPane.classList.add('hidden');
    editPane.classList.remove('hidden');
  }

  const totalHours = calculateTotalStudyHours(appState.trackerData);
  const todayHours = calculateTodayStudyHours(appState.trackerData);

  // Populate Social Stats Bar
  const totalHoursEl = document.getElementById('totalHoursPassport');
  const todayHoursEl = document.getElementById('todayHoursPassport');
  if (totalHoursEl) totalHoursEl.textContent = `${totalHours.toFixed(1)}h`;
  if (todayHoursEl) todayHoursEl.textContent = `${todayHours.toFixed(1)}h`;

  const bestStreak = document.getElementById('bestStreakPassport');
  const { calculateBestStreak } = await import('@/utils/calc.utils');
  if (bestStreak) bestStreak.textContent = `${calculateBestStreak(appState.trackerData)}d`;

  // Social Status Beacon
  const beacon = document.getElementById('statusBeacon');
  if (beacon) {
    beacon.className = `status-beacon ${appState.activeTimer.isRunning ? 'focusing' : 'idle'}`;
  }

  // Identity Hydration
  hydrateIdentityFields();
  hydrateRankProgression(totalHours);

  // --- UI Bindings ---
  setupAvatarPicker();
  bindV2Actions();
}

function hydrateRankProgression(totalHours: number): void {
  const prog = getRankProgression(totalHours);
  const rankDisplay = document.getElementById('displayRank');

  if (rankDisplay) {
    rankDisplay.textContent = prog.current.toUpperCase();
  }
}

function bindV2Actions(): void {
  const pPane = document.getElementById('passportViewPane');
  const ePane = document.getElementById('profileEditPane');
  const closeModal = () => {
    const modal = document.getElementById('profileSetupModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  };

  document.getElementById('closeProfileModal')?.addEventListener('click', closeModal);
  document.getElementById('closeProfileModalAlt')?.addEventListener('click', closeModal);
  document.getElementById('switchToEditProfileBtn')?.addEventListener('click', () => {
    pPane?.classList.add('hidden');
    ePane?.classList.remove('hidden');
  });
  document.getElementById('switchToPassportBtn')?.addEventListener('click', () => {
    ePane?.classList.add('hidden');
    pPane?.classList.remove('hidden');
  });

  const saveBtn = document.getElementById('saveProfileBtn');
  if (saveBtn) saveBtn.onclick = handleProfileSaveSubmission;
}

function hydrateIdentityFields(): void {
  const saved = getSecureLocalProfileString();
  const syncId = localStorage.getItem('tracker_sync_id') || 'unlinked';
  if (!saved) return;
  const profile = JSON.parse(saved) as UserProfile;

  // Header
  const passportAvatar = document.getElementById('passportAvatar');
  const profileName = document.getElementById('profileDisplayName');
  const handleEl = document.getElementById('displayHandle');
  const nationBadge = document.getElementById('profileNationBadge');

  if (profileName) profileName.textContent = profile.realName || profile.displayName;
  if (handleEl) handleEl.textContent = `@${profile.displayName}`;
  if (passportAvatar) passportAvatar.textContent = profile.avatar || '👨‍🚀';
  if (nationBadge) nationBadge.textContent = profile.nation || 'Global';

  // Dossier
  const dossierName = document.getElementById('dossierRealName');
  const dossierEmail = document.getElementById('dossierEmail');
  const dossierPhone = document.getElementById('dossierPhone');

  if (dossierName) dossierName.textContent = profile.realName || '-';
  if (dossierEmail) dossierEmail.textContent = (profile as any).email || '-';
  if (dossierPhone) dossierPhone.textContent = profile.phoneNumber || '-';

  // Fill Inputs
  (document.getElementById('profileNameInput') as HTMLInputElement).value = profile.displayName || '';
  (document.getElementById('profileRealNameInput') as HTMLInputElement).value = profile.realName || '';
  (document.getElementById('profileDobInput') as HTMLInputElement).value = profile.dob || '';
  (document.getElementById('profileEmailInput') as HTMLInputElement).value = (profile as any).email || '';
  (document.getElementById('profilePhoneInput') as HTMLInputElement).value = profile.phoneNumber || '';
  (document.getElementById('profileNationSelect') as HTMLSelectElement).value = profile.nation || 'Global';
  const publicToggle = document.getElementById('profilePublicToggle') as HTMLInputElement;
  const focusToggle = document.getElementById('profileFocusPrivacyToggle') as HTMLInputElement;
  
  if (publicToggle) publicToggle.checked = profile.isPublic !== false;
  if (focusToggle) focusToggle.checked = profile.isFocusPublic !== false;
  
  // 🔒 SECURITY LOCKDOWN: Make all core identity fields strictly un-editable (except Avatar)
  const lockedFields = ['profileNameInput', 'profileRealNameInput', 'profileDobInput', 'profileEmailInput', 'profilePhoneInput', 'profileNationSelect'];
  lockedFields.forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
    if (el) {
      el.disabled = true;
      el.style.opacity = '0.5';
      el.style.cursor = 'not-allowed';
      el.parentElement?.setAttribute('title', 'Locked by Vault Security. Identity components cannot be altered.');
    }
  });
  
  // Sync Edit Preview
  const editPreview = document.getElementById('editAvatarPreview');
  if (editPreview) editPreview.textContent = profile.avatar || '👨‍🚀';
}

/** Handles the Avatar Grid interactions */
function setupAvatarPicker(): void {
  const avatarGrid = document.getElementById('avatarPickerGrid');
  const avatarToggle = document.getElementById('toggleAvatarPickerBtn');
  const avatarContainer = document.getElementById('avatarPickerContainer');

  const AVATARS = [
  '🦇', '🕷️', '⚡', '🦸‍♂️', '🦹‍♂️', '🚀',
  '🛸', '🪐', '☄️', '🌌', '🦾', '🥷',
  '🏀', '🏎️', '🥊', '🏂', '🛹', '⚽',
  '🏋️‍♂️', '🎯', '🐉', '🦖', '🦈', '🐺',
  '🦅', '🐍', '🦂', '🦍', '🗿', '👽',
  '💀', '🥶', '👺', '👑', '💎', '🎲',
  '👰‍♀️', '🐼', '🦄', '🎧', '⚒️', '🖥️',
  '✈️', '🛩️', '🛴', '🚨',

  '🔥', '🌪️', '🌊', '❄️', '☠️', '🧨',
  '🛡️', '⚔️', '🔱', '🪓', '🏹', '🔨',
  '🤖', '👾', '👻', '🎭', '🎮', '🕹️',
  '💻', '⌚', '📱', '📸', '🎥', '📡',
  '🚁', '🚂', '🚢', '⛵', '🚤', '🏍️',
  '🚗', '🚓', '🚑', '🚒', '🚜', '🛻',
  '🐅', '🦁', '🐆', '🦓', '🦬', '🦣',
  '🦏', '🐘', '🦌', '🦉', '🦜',
  '🌋', '🏔️', '🏝️', '🌃', '🌠', '🌙'
];

  if (avatarGrid && avatarGrid.children.length === 0) {
    AVATARS.forEach(emoji => {
      const div = document.createElement('div');
      div.className = 'avatar-item';
      div.setAttribute('data-avatar', emoji);
      div.textContent = emoji;
      avatarGrid.appendChild(div);
    });
  }

  if (avatarGrid) {
    avatarGrid.querySelectorAll('.avatar-item').forEach(item => {
      (item as HTMLElement).onclick = () => {
        avatarGrid.querySelectorAll('.avatar-item').forEach(a => a.classList.remove('active'));
        item.classList.add('active');
        const livePassAv = document.getElementById('passportAvatar');
        if (livePassAv) livePassAv.textContent = item.getAttribute('data-avatar') || '👤';
      };
    });
  }
}

async function handleProfileSaveSubmission(): Promise<void> {
  const saveBtn = document.getElementById('saveProfileBtn') as HTMLButtonElement;
  const originalText = saveBtn.textContent;

  const data: UserProfile = {
    displayName: (document.getElementById('profileNameInput') as HTMLInputElement).value.trim(),
    realName: (document.getElementById('profileRealNameInput') as HTMLInputElement).value.trim(),
    dob: (document.getElementById('profileDobInput') as HTMLInputElement).value,
    nation: (document.getElementById('profileNationSelect') as HTMLSelectElement).value,
    phoneNumber: (document.getElementById('profilePhoneInput') as HTMLInputElement).value.trim(),
    email: (document.getElementById('profileEmailInput') as HTMLInputElement).value.trim(),
    isPublic: (document.getElementById('profilePublicToggle') as HTMLInputElement)?.checked ?? true,
    isFocusPublic: (document.getElementById('profileFocusPrivacyToggle') as HTMLInputElement)?.checked ?? true,
    avatar: document.querySelector('#avatarPickerGrid .avatar-item.active')?.getAttribute('data-avatar') || '👨‍🚀'
  };

  if (!data.displayName || !data.email || !data.phoneNumber) {
    alert("Mission Critical: Handle, Email, and Mobile are required for identity sync.");
    return;
  }

  try {
    saveBtn.textContent = "SYNCHRONIZING...";
    saveBtn.disabled = true;
    const success = await saveProfileData(data);
    if (success) {
      setSecureLocalProfileString(JSON.stringify(data));
      openProfileModal(); // Switch back to passport view
    }
  } catch (err) {
    console.error(err);
    alert("Identity Sync Interrupted.");
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

