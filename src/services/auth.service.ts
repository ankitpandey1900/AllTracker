/**
 * Auth service — Sync ID management
 *
 * Provides a frictionless "login" via a text-based Sync ID.
 * No email/password required — users just pick an ID and their data syncs.
 */

import { STORAGE_KEYS } from '@/config/constants';
import { syncDataOnLogin } from '@/services/data-bridge';
import { isUsernameTaken, loadUserProfileCloud, verifyUserCredentials, broadcastGlobalStats, checkIfSyncIdHasData } from '@/services/supabase.service';
import { supabaseClient } from '@/config/supabase';

// ─── State ───────────────────────────────────────────────────

let currentSyncId: string | null = localStorage.getItem(STORAGE_KEYS.SYNC_ID) || null;

// ─── Public API ──────────────────────────────────────────────

/** Returns the current Sync ID, or null if not connected */
export function getCurrentUserId(): string | null {
  return currentSyncId;
}

/** Initializes auth UI and restores previous session */
export function initSyncAuth(): void {
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

  const views = [loginView, regView, legacyView, recView];
  views.forEach(v => {
    v.style.transform = 'translateX(120%)';
    v.style.opacity = '0';
    v.style.pointerEvents = 'none';
  });

  if (tab === 'login') {
    loginBtn.classList.add('active');
    loginBtn.style.borderBottomColor = '#10b981';
    loginBtn.style.color = '#fff';
    regBtn.classList.remove('active');
    regBtn.style.borderBottomColor = 'transparent';
    regBtn.style.color = '#64748b';
    loginView.style.transform = 'translateX(0)';
    loginView.style.opacity = '1';
    loginView.style.pointerEvents = 'auto';
  } else if (tab === 'register') {
    regBtn.classList.add('active');
    regBtn.style.borderBottomColor = '#10b981';
    regBtn.style.color = '#fff';
    loginBtn.classList.remove('active');
    loginBtn.style.borderBottomColor = 'transparent';
    loginBtn.style.color = '#64748b';
    regView.style.transform = 'translateX(0)';
    regView.style.opacity = '1';
    regView.style.pointerEvents = 'auto';
  } else if (tab === 'legacy') {
    regBtn.classList.remove('active');
    regBtn.style.borderBottomColor = 'transparent';
    regBtn.style.color = '#64748b';
    loginBtn.classList.remove('active');
    loginBtn.style.borderBottomColor = 'transparent';
    loginBtn.style.color = '#64748b';
    legacyView.style.transform = 'translateX(0)';
    legacyView.style.opacity = '1';
    legacyView.style.pointerEvents = 'auto';
  } else if (tab === 'recovery') {
    regBtn.classList.remove('active');
    regBtn.style.borderBottomColor = 'transparent';
    regBtn.style.color = '#64748b';
    loginBtn.classList.remove('active');
    loginBtn.style.borderBottomColor = 'transparent';
    loginBtn.style.color = '#64748b';
    recView.style.transform = 'translateX(0)';
    recView.style.opacity = '1';
    recView.style.pointerEvents = 'auto';
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

// ─── UI State ────────────────────────────────────────────────

async function handleSyncIdEstablished(syncId: string): Promise<void> {
  currentSyncId = syncId;
  localStorage.setItem(STORAGE_KEYS.SYNC_ID, syncId);
  console.log('Sync ID active:', syncId);

  const headerRight = document.getElementById('headerRight');
  const userAlias = localStorage.getItem('tracker_username') || 'Arena User';
  
  if (headerRight) {
    headerRight.innerHTML = `
      <div class="user-info-group" style="display: flex; align-items: center; gap: 10px;">
        <div id="headerUserAlias" class="alias-pill" style="display: flex; align-items: center; font-size: 0.75rem; background: #161821; padding: 6px 14px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.2s; font-weight: 800; color: #f8fafc;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#a855f7" stroke="none" style="margin-right: 8px;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          ${userAlias}
        </div>
        <div id="syncStatus" class="data-stream-active" style="display: flex; align-items: center; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 24px; font-size: 0.7rem; font-weight: 800; color: #10b981; letter-spacing: 0.5px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981" style="margin-right: 6px;"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          Synced
        </div>
        <button class="btn btn-ghost" id="logoutBtn" style="display: flex; align-items: center; padding: 6px 14px; border-radius: 24px; font-size: 0.65rem; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(16, 18, 27, 0.5); color: #ef4444; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: all 0.2s;">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" style="margin-right: 6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
           EXIT ARENA
        </button>
      </div>
    `;
    document.getElementById('logoutBtn')!.onclick = handleDisconnect;
    
    // Bind Identity Modal trigger
    rebindAliasTrigger();
  }

  // Hide modal
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';

  // Trigger sync
  await syncDataOnLogin();
}

function handleUserSignedOut(): void {
  currentSyncId = null;
  localStorage.removeItem(STORAGE_KEYS.SYNC_ID);
  console.log('Sync ID disconnected.');

  const headerRight = document.getElementById('headerRight');
  if (headerRight) {
    headerRight.innerHTML = `
      <button class="btn btn-primary glow-blue" id="authTriggerBtn" style="font-size: 0.65rem; font-weight: 800; letter-spacing: 1px; padding: 6px 14px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; height: 32px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        <span class="btn-text">LOGIN</span>
      </button>
    `;
    document.getElementById('authTriggerBtn')!.onclick = openAuthModal;
  }
}

// ─── Actions ─────────────────────────────────────────────────

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
    console.error('Login Error:', err);
    errorMsg.textContent = 'A network error occurred. Please try again.';
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'AUTHENTICATE';
  }
}

/** Handles legacy user login (Sync ID only) */
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
      console.warn('Legacy data found but no profile exists. Proceeding to migration.');
    }

    // Success - Emulate setting them up.
    // Use whatever name they have, or generate a placeholder.
    const tempName = cloudProfile?.display_name || `Legacy_${syncId.substring(0,5)}`;
    localStorage.setItem('tracker_username', tempName);
    await handleSyncIdEstablished(syncId);

    // Force Open the Profile Setup Modal so they can formally "Migrate"
    setTimeout(async () => {
      alert("Legacy Vault Recovered. Please complete your Official Identity Profile to finalize migration.");
      const { openProfileModal } = await import('@/features/dashboard/leaderboard');
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

/** Handles vault recovery via Discovery Key */
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
    const { data, error } = await supabaseClient!
      .from('global_profiles')
      .select('sync_id')
      .ilike('display_name', username)
      .eq('recovery_key', rKey)
      .maybeSingle();

    if (error || !data) {
      errorMsg.textContent = 'Recovery Failed: Invalid or unmatched User ID and Recovery Key.';
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
  const ageInp = document.getElementById('regAgeInput') as HTMLInputElement;
  const nationSel = document.getElementById('regNationSelect') as HTMLSelectElement;
  const submitBtn = document.getElementById('regSubmitBtn') as HTMLButtonElement;
  const errorMsg = document.getElementById('regErrorMsg') as HTMLElement;

  const username = userInp.value.trim();
  const password = passInp.value.trim();
  const age = parseInt(ageInp.value) || 0;
  const nation = nationSel.value;

  if (!username || !password || !age || !nation) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'INITIALIZING PROFILE...';
  errorMsg.style.display = 'none';

  try {
    // 1. Check if Username is taken
    const nameTaken = await isUsernameTaken(username);
    if (nameTaken) {
      errorMsg.textContent = `The handle "@${username}" is already claimed. Choose another.`;
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

    // 3. Fake the 'currentSyncId' temporarily so broadcastGlobalStats uses it to upsert
    currentSyncId = password; 
    
    // Generate Secure Recovery Key
    const recoveryKey = 'N7X-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    await broadcastGlobalStats({
      display_name: username,
      age: age,
      nation: nation,
      current_rank: 'PILOT',
      recovery_key: recoveryKey
    } as any);

    // 4. Initialization successful
    alert(`CRITICAL SECURITY ALERT: Vault Created.\n\nYour secret Recovery Key is: [ ${recoveryKey} ]\n\nWrite this down immediately! You will need it to recover your Vault Backup if you forget your Password.`);
    localStorage.setItem('alltracker_username', username);
    await handleSyncIdEstablished(password); // Sets it for real and syncs

  } catch (err) {
    console.error('Registration Error:', err);
    /** Enforces "ALL Tracker" data validation rules */
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
      console.log('Identity Portal Triggered');
      const { openProfileModal } = await import('@/features/dashboard/leaderboard');
      openProfileModal();
    };
  }
}
