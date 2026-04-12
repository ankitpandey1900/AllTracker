import { getSecureLocalProfileString, setSecureLocalProfileString } from '@/utils/security';
import { log } from '@/utils/logger.utils';
/**
 * Handles the login/logout logic.
 * 
 * Users don't need an email—they just use a text-based "Secret Key" to sync 
 * their data across devices.
 */

import { STORAGE_KEYS } from '@/config/constants';
import { syncDataOnLogin } from '@/services/data-bridge';
import { isUsernameTaken, loadUserProfileCloud, verifyUserCredentials, broadcastGlobalStats, checkIfSyncIdHasData } from '@/services/supabase.service';
import { supabaseClient } from '@/config/supabase';
import { obfuscate, deobfuscate, isObfuscated } from '@/utils/security';
import { appState } from '@/state/app-state';

// --- Internal State ---

const rawId = localStorage.getItem(STORAGE_KEYS.SYNC_ID) || null;
let currentSyncId: string | null = (rawId && isObfuscated(rawId)) ? deobfuscate(rawId) : rawId;

// --- Public Functions ---

/** Returns the current Sync ID, or null if not connected */
export function getCurrentUserId(): string | null {
  return currentSyncId;
}

/** Initializes auth UI and restores previous session */
export function initSyncAuth(): void {
  // Security fix: Make sure old plain-text keys are masked properly in storage.
  const raw = localStorage.getItem(STORAGE_KEYS.SYNC_ID);
  if (raw && !isObfuscated(raw)) {
    log.info('Security Patch: Encrypting legacy Vault Key...', '🔐');
    localStorage.setItem(STORAGE_KEYS.SYNC_ID, obfuscate(raw));
  }

  // Security fix: Remove the plain-text syncId from the profile object if it's still there.
  const profileRaw = getSecureLocalProfileString();
  if (profileRaw) {
    try {
      const profile = JSON.parse(profileRaw);
      if (profile.syncId) {
        log.info('Security Patch: Purging sensitive Sync-ID from Profile cache...', '🧹');
        delete profile.syncId;
        setSecureLocalProfileString(JSON.stringify(profile));
      }
    } catch (e) { /* skip malformed junk */ }
  }

  if (currentSyncId) {
    handleSyncIdEstablished(currentSyncId);
  } else {
    handleUserSignedOut();
  }

  // Bind header button
  const triggerBtn = document.getElementById('authTriggerBtn');
  if (triggerBtn) triggerBtn.onclick = openAuthModal;

  // Bind modal close
  const closeBtn = document.getElementById('closeAuthModal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      const modal = document.getElementById('authModal');
      if (modal) modal.style.display = 'none';
    };
  }

  // Bind form submits
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.onsubmit = handleLoginSubmission;

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.onsubmit = handleRegistrationSubmission;

  const legacyForm = document.getElementById('legacyForm');
  if (legacyForm) legacyForm.onsubmit = handleLegacySubmission;

  const recoveryForm = document.getElementById('recoveryForm');
  if (recoveryForm) recoveryForm.onsubmit = handleRecoverySubmission;

  // Real-time Username Debounce
  const regUserInp = document.getElementById('regUsernameInput') as HTMLInputElement;
  const regStatus = document.getElementById('regUsernameStatus');
  if (regUserInp && regStatus) {
    let timeout: ReturnType<typeof setTimeout>;
    regUserInp.oninput = () => {
      clearTimeout(timeout);
      const val = regUserInp.value.trim();
      if (val.length < 3) {
        regUserInp.style.borderColor = 'rgba(255,255,255,0.1)';
        regStatus.textContent = '';
        return;
      }
      regStatus.style.color = '#94a3b8';
      regStatus.textContent = 'Checking availability...';
      
      timeout = setTimeout(async () => {
        const taken = await isUsernameTaken(val);
        if (taken) {
          regUserInp.style.borderColor = '#ef4444';
          regStatus.style.color = '#ef4444';
          regStatus.textContent = '* Handle is strictly claimed.';
        } else {
          regUserInp.style.borderColor = '#10b981';
          regStatus.style.color = '#10b981';
          regStatus.textContent = '✓ Handle available.';
        }
      }, 400);
    };
  }

  // Bind visibility toggles
  setupPasswordToggle('toggleLoginPass', 'loginPasswordInput');
  setupPasswordToggle('toggleRegPass', 'regPasswordInput');
  setupPasswordToggle('toggleLegacyPass', 'legacySyncInput');

  // Bind Tab Switching
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const legacyTrigger = document.getElementById('legacyAuthTrigger');
  const legacyBack = document.getElementById('backToLoginFromLegacy');
  const recTrigger = document.getElementById('recoveryAuthTrigger');
  const recBack = document.getElementById('backToLoginFromRecovery');
  
  if (tabLoginBtn) tabLoginBtn.onclick = () => switchAuthTab('login');
  if (tabRegisterBtn) tabRegisterBtn.onclick = () => switchAuthTab('register');
  if (legacyTrigger) legacyTrigger.onclick = () => switchAuthTab('legacy');
  if (legacyBack) legacyBack.onclick = () => switchAuthTab('login');
  if (recTrigger) recTrigger.onclick = () => switchAuthTab('recovery');
  if (recBack) recBack.onclick = () => switchAuthTab('login');

  // Bind Identity Portal trigger (for already logged in users)
  rebindAliasTrigger();

  // Populate Register Avatar Grid
  setupRegistrationAvatarPicker();
}

function setupRegistrationAvatarPicker(): void {
  const avatarGrid = document.getElementById('regAvatarPickerGrid');
  const avatarInput = document.getElementById('regAvatarInput') as HTMLInputElement;

  const AVATARS = [
    '🦇', '🕷️', '⚡', '🦸‍♂️', '🦹‍♂️', '🚀', 
    '🛸', '🪐', '☄️', '🌌', '🦾', '🥷', 
    '🏀', '🏎️', '🥊', '🏂', '🛹', '⚽', 
    '🏋️‍♂️', '🎯', '🐉', '🦖', '🦈', '🐺', 
    '🦅', '🐍', '🦂', '🦍', '🗿', '👽', 
    '💀', '🥶', '👺', '👑', '💎', '🎲'
  ];

  if (avatarGrid && avatarGrid.children.length === 0) {
    AVATARS.forEach((emoji, idx) => {
      const div = document.createElement('div');
      div.className = 'avatar-item' + (idx === 0 ? ' active' : '');
      div.setAttribute('data-avatar', emoji);
      div.textContent = emoji;
      avatarGrid.appendChild(div);

      div.onclick = () => {
        avatarGrid.querySelectorAll('.avatar-item').forEach(a => a.classList.remove('active'));
        div.classList.add('active');
        if (avatarInput) avatarInput.value = emoji;
      };
    });
  }
}


/** Toggles between Login and Register tabs */
function switchAuthTab(tab: 'login' | 'register' | 'legacy' | 'recovery'): void {
  const loginBtn = document.getElementById('tabLoginBtn');
  const regBtn = document.getElementById('tabRegisterBtn');
  
  const loginView = document.getElementById('authLoginView');
  const regView = document.getElementById('authRegisterView');
  const legacyView = document.getElementById('authLegacyView');
  const recView = document.getElementById('authRecoveryView');
  
  const errorL = document.getElementById('loginErrorMsg');
  const errorR = document.getElementById('regErrorMsg');
  const errorLegacy = document.getElementById('legacyErrorMsg');
  const errorRec = document.getElementById('recoveryErrorMsg');
  
  if (errorL) errorL.style.display = 'none';
  if (errorR) errorR.style.display = 'none';
  if (errorLegacy) errorLegacy.style.display = 'none';
  if (errorRec) errorRec.style.display = 'none';

  if (!loginBtn || !regBtn || !loginView || !regView || !legacyView || !recView) return;

  // 1. Reset Tabs
  const allTabs = document.querySelectorAll('.auth-tab');
  allTabs.forEach(t => {
     (t as HTMLElement).classList.remove('active');
     (t as HTMLElement).style.borderBottomColor = 'transparent';
     (t as HTMLElement).style.color = '#64748b';
  });

  // 2. Hide all Views
  const views = [loginView, regView, legacyView, recView];
  views.forEach(v => v.classList.remove('active'));

  // 3. Activate Target
  if (tab === 'login') {
    loginBtn.classList.add('active');
    loginBtn.style.borderBottomColor = '#10b981';
    loginBtn.style.color = '#fff';
    loginView.classList.add('active');
  } else if (tab === 'register') {
    regBtn.classList.add('active');
    regBtn.style.borderBottomColor = '#10b981';
    regBtn.style.color = '#fff';
    regView.classList.add('active');
  } else if (tab === 'legacy') {
    legacyView.classList.add('active');
  } else if (tab === 'recovery') {
    recView.classList.add('active');
  }
}

/** Helper to toggle password visibility */
export function setupPasswordToggle(toggleId: string, inputId: string): void {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!toggle || !input) return;

  toggle.onclick = () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    toggle.textContent = isPass ? '🔒' : '👁️';
  };
}

/** Sets up the header scroll effect */
export function setupHeaderScroll(): void {
  const header = document.getElementById('appHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// --- UI Updates ---

async function handleSyncIdEstablished(syncId: string): Promise<void> {
  currentSyncId = syncId;
  localStorage.setItem(STORAGE_KEYS.SYNC_ID, obfuscate(syncId));

  // Pull the profile from Supabase so it follows the user to this device.
  try {
    const { loadUserProfileCloud } = await import('./supabase.service');
    const cloudProfile = await loadUserProfileCloud();
    
    if (cloudProfile) {
      const localProfile: any = {
        displayName: cloudProfile.display_name,
        dob: cloudProfile.dob,
        nation: cloudProfile.nation,
        avatar: cloudProfile.avatar,
        phoneNumber: cloudProfile.phone_number,
        isFocusPublic: cloudProfile.is_focus_public,
        email: cloudProfile.email
      };
      setSecureLocalProfileString(JSON.stringify(localProfile));
      localStorage.setItem('tracker_username', localProfile.displayName);
      log.success(`BROADCAST MATRIX: Monitoring private data for profile.`);
      
      // 📡 ALL TRACKER EVENT: Notify the rest of the system that identity is ready
      window.dispatchEvent(new CustomEvent('all-tracker-identity-sync', { detail: localProfile }));
    }
  } catch (err) {
    log.error('Failed to hydrate profile from cloud');
  }

  // Update header UI with latest profile info
  updateHeaderProfileUI();

  // Hide modal
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';

  // Trigger sync (Force cloud pull to ensure any local wipe is healed)
  await syncDataOnLogin(true);

  // 🔐 IDENTITY-LINKED VAULT (V3): Refresh settings with the new salt
  const { loadSettingsFromStorage } = await import('./data-bridge');
  const freshSettings = await loadSettingsFromStorage();
  if (freshSettings) {
    appState.settings = freshSettings;
    // Re-render components that depend on these settings
    const { renderIntelligenceBriefing } = await import('@/features/intelligence/intelligence');
    renderIntelligenceBriefing();
  }
}

/** Re-renders the header user pill with the latest avatar/handle from storage */
export function updateHeaderProfileUI(): void {
  const headerRight = document.getElementById('headerRight');
  if (!headerRight) return;

  const userAlias = localStorage.getItem('tracker_username') || 'Tracker User';
  const profileSaved = getSecureLocalProfileString();
  let avatarIcon = '👤';
  
  if (profileSaved) {
    try {
      const p = JSON.parse(profileSaved);
      if (p.avatar) avatarIcon = p.avatar;
    } catch(e) {}
  }

  const existingAlias = document.getElementById('headerUserAlias');
  if (existingAlias) {
    existingAlias.innerHTML = `
      <div class="pilot-hud-avatar">${avatarIcon}</div>
      <span>${userAlias}</span>
    `;
  } else {
    headerRight.innerHTML = `
      <div class="user-info-group" style="display: flex; align-items: center; gap: 12px;">
        <div id="headerUserAlias" class="pilot-hud-pill">
          <div class="pilot-hud-avatar">${avatarIcon}</div>
          <span>${userAlias}</span>
        </div>
        <div id="syncStatus" class="data-stream-active" style="display: flex; align-items: center; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.3); padding: 5px 14px; border-radius: 30px; font-size: 0.65rem; font-weight: 900; color: #10b981; letter-spacing: 1px; text-transform: uppercase;">
          <div class="pulse-emerald" style="width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 8px #10b981;"></div>
          Live Ready
        </div>
        <button class="btn btn-ghost" id="logoutBtn" style="height: 32px; width: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); color: #ef4444; cursor: pointer; transition: all 0.2s;">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = handleUserSignedOut;
    rebindAliasTrigger();
  }
}

function handleUserSignedOut(): void {
  currentSyncId = null;
  localStorage.removeItem(STORAGE_KEYS.SYNC_ID);
  localStorage.removeItem('tracker_username');
  log.info('Sync ID disconnected.', '🔌');

  // 📡 GLOBAL IDENTITY RESET: Notify components to clear stale views
  window.dispatchEvent(new CustomEvent('all-tracker-identity-sync', { detail: null }));

  const headerRight = document.getElementById('headerRight');
  if (headerRight) {
    headerRight.innerHTML = `
      <button class="btn btn-primary glow-blue" id="authTriggerBtn" style="font-size: 0.65rem; font-weight: 800; letter-spacing: 1px; padding: 6px 14px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; height: 32px; background: #10b981; border: none; color: white;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        <span class="btn-text">LOGIN</span>
      </button>
    `;
    const triggerBtn = document.getElementById('authTriggerBtn');
    if (triggerBtn) triggerBtn.onclick = openAuthModal;
  }
}

// --- Core Actions ---

function openAuthModal(): void {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
    
    const errorL = document.getElementById('loginErrorMsg');
    const errorR = document.getElementById('regErrorMsg');
    if (errorL) errorL.style.display = 'none';
    if (errorR) errorR.style.display = 'none';

    switchAuthTab('login');
  }
}

/** Handles existing user login */
async function handleLoginSubmission(e: Event): Promise<void> {
  e.preventDefault();
  
  const userInp = document.getElementById('loginUsernameInput') as HTMLInputElement;
  const passInp = document.getElementById('loginPasswordInput') as HTMLInputElement;
  const submitBtn = document.getElementById('loginSubmitBtn') as HTMLButtonElement;
  const errorMsg = document.getElementById('loginErrorMsg') as HTMLElement;

  const username = userInp.value.trim();
  const password = passInp.value.trim();
  
  if (!username || !password) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'AUTHENTICATING...';
  errorMsg.style.display = 'none';

  try {
    const isValid = await verifyUserCredentials(username, password);
    if (!isValid) {
        errorMsg.textContent = 'Authentication Failed: Invalid User ID or Vault Key.';
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'AUTHENTICATE';
        return;
    }

    // Success
    localStorage.setItem('tracker_username', username);
    await handleSyncIdEstablished(password);

  } catch (err) {
    log.error('Login Error: Internal authentication fault.');
    errorMsg.textContent = 'A network error occurred. Please try again.';
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'AUTHENTICATE';
  }
}

/** Handles users from the old system (Sync ID only, no handle yet) */
async function handleLegacySubmission(e: Event): Promise<void> {
  e.preventDefault();

  const syncInp = document.getElementById('legacySyncInput') as HTMLInputElement;
  const submitBtn = document.getElementById('legacySubmitBtn') as HTMLButtonElement;
  const errorMsg = document.getElementById('legacyErrorMsg') as HTMLElement;

  const syncId = syncInp.value.trim();
  if (!syncId) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'LOCATING VAULT...';
  errorMsg.style.display = 'none';

  try {
    const cloudProfile = await loadUserProfileCloud(syncId);
    
    if (!cloudProfile) {
      // Fallback Check: Does data exist for this ID even if no profile does?
      const dataExists = await checkIfSyncIdHasData(syncId);
      
      if (!dataExists) {
        errorMsg.textContent = 'Vault Not Found: This Legacy ID does not exist securely in any cloud archives.';
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'FETCH VAULT';
        return;
      }

      // If data exists but no profile, they are a "Legacy Pilot" who needs to migrate
      log.warn('Legacy data found but no profile exists. Proceeding to migration.', '🛡️');
    }

    // Success - Emulate setting them up.
    // Use whatever name they have, or generate a placeholder.
    const tempName = cloudProfile?.display_name || `Legacy_${syncId.substring(0,5)}`;
    localStorage.setItem('tracker_username', tempName);
    await handleSyncIdEstablished(syncId);

    // Force Open the Profile Setup Modal so they can formally "Migrate"
    setTimeout(async () => {
      alert("Legacy Vault Recovered. Please complete your Official Identity Profile to finalize migration.");
      const { openProfileModal } = await import('@/features/profile/profile.ui');
      openProfileModal();
    }, 1000);

  } catch (err) {
    console.error('Legacy Login Error:', err);
    errorMsg.textContent = 'A network error occurred.';
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'FETCH VAULT';
  }
}

/** Helps recover a lost Secret Key using a Discovery Key */
async function handleRecoverySubmission(e: Event): Promise<void> {
  e.preventDefault();
  const userInp = document.getElementById('recUsernameInput') as HTMLInputElement;
  const keyInp = document.getElementById('recRecoveryKeyInput') as HTMLInputElement;
  const submitBtn = document.getElementById('recoverySubmitBtn') as HTMLButtonElement;
  const errorMsg = document.getElementById('recoveryErrorMsg') as HTMLElement;
  const successMsg = document.getElementById('recoverySuccessMsg') as HTMLElement;

  const username = userInp.value.trim();
  const rKey = keyInp.value.trim();
  if (!username || !rKey) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'DECRYPTING...';
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';

  try {
    const { SUPABASE_TABLES } = await import('@/config/constants');
    const { data, error } = await supabaseClient!
      .from(SUPABASE_TABLES.PROFILES)
      .select('sync_id')
      .ilike('handle', username)
      .eq('recovery_key', rKey)
      .maybeSingle();

    if (error || !data) {
      errorMsg.textContent = 'Recovery Failed: Invalid or unmatched Handle and Recovery Key.';
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'DECRYPT VAULT DATA';
      return;
    }

    // Success
    const recoveredPassword = data.sync_id;
    successMsg.innerHTML = `VAULT DECRYPTED!<br><br>Your permanent Password is:<br><strong style="font-size: 1.1rem; color: #10b981; letter-spacing: 1px;">${recoveredPassword}</strong><br><br>Please copy it to log in.`;
    successMsg.style.display = 'block';
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'DECRYPT VAULT DATA';
    
  } catch(err) {
    errorMsg.textContent = 'Network Error.';
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'DECRYPT VAULT DATA';
  }
}

/** Handles new user registration */
async function handleRegistrationSubmission(e: Event): Promise<void> {
  e.preventDefault();

  const userInp = document.getElementById('regUsernameInput') as HTMLInputElement;
  const passInp = document.getElementById('regPasswordInput') as HTMLInputElement;
  const dobInp = document.getElementById('regDobInput') as HTMLInputElement;
  const nationSel = document.getElementById('regNationSelect') as HTMLSelectElement;
  const emailInp = document.getElementById('regEmailInput') as HTMLInputElement;
  const phoneInp = document.getElementById('regPhoneInput') as HTMLInputElement;
  const submitBtn = document.getElementById('regSubmitBtn') as HTMLButtonElement;
  const errorMsg = document.getElementById('regErrorMsg') as HTMLElement;
  const realNameInp = document.getElementById('regRealNameInput') as HTMLInputElement;

  const username = userInp.value.trim();
  const realName = realNameInp ? realNameInp.value.trim() : '';
  const password = passInp.value.trim();
  const dob = dobInp.value;
  const nation = nationSel.value;
  const email = emailInp.value.trim();
  const phone = phoneInp.value.trim();

  if (!username || !realName || !password || !dob || !nation || !email || !phone) {
    errorMsg.textContent = 'SECURITY ALERT: All profile fields are strictly required.';
    errorMsg.style.display = 'block';
    return;
  }

  // Strong Email Validation: Must have a proper domain suffix (e.g., .com)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    errorMsg.textContent = 'INVALID CREDENTIALS: Enter a proper, real email address.';
    errorMsg.style.display = 'block';
    return;
  }

  // Strong Phone Validation: No overly simple repeating numbers like '00000'
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const phoneRegex = /^\+?\d{10,15}$/;
  if (!phoneRegex.test(cleanPhone) || /^(\d)\1{7,}$/.test(cleanPhone.replace('+', '')) || cleanPhone.includes('12345678')) {
    errorMsg.textContent = 'SECURITY ALERT: Please provide a real mobile number.';
    errorMsg.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errorMsg.textContent = 'SECURITY ALERT: Vault Key must be at least 6 characters.';
    errorMsg.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'INITIALIZING PROFILE...';
  errorMsg.style.display = 'none';

  try {
    // 1. Check if Username, Email, or Phone is taken
    const { isEmailTaken, isPhoneTaken } = await import('./supabase.service');
    const nameTaken = await isUsernameTaken(username);
    if (nameTaken) {
      errorMsg.textContent = `IDENTITY CONFLICT: The handle "@${username}" is already claimed.`;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'CREATE MISSION PROFILE';
      return;
    }

    const emailTaken = await isEmailTaken(email);
    if (emailTaken) {
      errorMsg.textContent = `IDENTITY CONFLICT: This Email is already linked to another Vault.`;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'CREATE MISSION PROFILE';
      return;
    }

    const phoneTaken = await isPhoneTaken(phone);
    if (phoneTaken) {
      errorMsg.textContent = `IDENTITY CONFLICT: This Mobile Number is already registered.`;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'CREATE MISSION PROFILE';
      return;
    }

    // 2. Check if Vault Key (Password / SyncID PK) is already in use by ANY profile
    const existingKey = await loadUserProfileCloud(password);
    if (existingKey) {
      errorMsg.textContent = `SECURITY ALERT: This Vault Key is already active in the system. Please use a unique secure key.`;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'CREATE MISSION PROFILE';
      return;
    }

    // 3. Fake the 'currentSyncId' temporarily
    currentSyncId = password; 
    
    // Generate Secure Recovery Key
    const recoveryKey = 'N7X-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const avatarInp = document.getElementById('regAvatarInput') as HTMLInputElement;
    const finalAvatar = avatarInp ? avatarInp.value : '👨‍🚀';

    // Directly register the new profile in the database
    const { SUPABASE_TABLES } = await import('@/config/constants');
    const { error: profileErr } = await supabaseClient!
      .from(SUPABASE_TABLES.PROFILES)
      .insert({
        sync_id: password,
        handle: username,
        real_name: realName,
        dob: dob,
        nation: nation,
        recovery_key: recoveryKey,
        phone: phone,
        is_public: true,
        email: email,
        avatar: finalAvatar
      });

    if (profileErr) {
       throw profileErr;
    }

    // Now trigger global stats broadcast (which will safely resolve the Profile ID)
    await broadcastGlobalStats({
      total_hours: 0,
      today_hours: 0,
      current_rank: 'RECRUIT'
    } as any);

    // 4. Initialization successful
    alert(`CRITICAL SECURITY ALERT: Vault Created.\n\nYour secret Recovery Key is: [ ${recoveryKey} ]\n\nWrite this down immediately! You will need it to recover your Vault Backup if you forget your Password.`);
    localStorage.setItem('alltracker_username', username);
    await handleSyncIdEstablished(password); // Sets it for real and syncs

  } catch (err) {
    log.error('Registration Error: Identity creation fault.');
    errorMsg.textContent = 'Initialization failed. Please try again later.';
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'CREATE MISSION PROFILE';
    // Revert temp state on fail
    currentSyncId = localStorage.getItem(STORAGE_KEYS.SYNC_ID);
  }
}

async function handleDisconnect(): Promise<void> {
  if (confirm('Disconnect from cloud? Your local data will remain, but syncing will stop.')) {
    handleUserSignedOut();
  }
}

/** Robustly rebinds the alias click trigger */
function rebindAliasTrigger(): void {
  const aliasBtn = document.getElementById('headerUserAlias');
  if (aliasBtn) {
    aliasBtn.onclick = async () => {
      log.info('Identity Portal Triggered', '👤');
      const { openProfileModal } = await import('@/features/profile/profile.ui');
      openProfileModal();
    };
  }
}
