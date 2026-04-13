/**
 * The Login/Register modal.
 */
export const authModal = `
  <div class="modal" id="authModal">
    <div class="modal-content">
      <div class="modal-header"
        style="justify-content: center; padding: 20px; border-bottom: 2px solid rgba(16, 185, 129, 0.2);">
        <div class="intel-label" style="color: #10b981; font-size: 0.85rem; font-weight: 800; letter-spacing: 2px;">
          [ SECURE TRACKER ACCESS ]
        </div>
        <button id="closeAuthModal" class="modal-close" style="top: 15px; right: 15px;">&times;</button>
      </div>

      <div class="auth-tabs"
        style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
        <button id="tabLoginBtn" class="auth-tab active"
          style="flex: 1; padding: 14px; background: transparent; color: #fff; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; border: none; border-bottom: 2px solid #10b981; cursor: pointer; transition: all 0.2s;">
          LOGIN
        </button>
        <button id="tabRegisterBtn" class="auth-tab"
          style="flex: 1; padding: 14px; background: transparent; color: #64748b; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s;">
          REGISTER
        </button>
        <button id="recoveryAuthTrigger" class="auth-tab"
          style="flex: 1; padding: 14px; background: transparent; color: #64748b; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s;">
          FORGOT PASSWORD
        </button>
      </div>

      <div class="modal-body auth-views-container">
        
        <!-- Login Form -->
        <div id="authLoginView" class="auth-view active">
          <form id="loginForm">
            <div class="settings-group">
              <label>USER ID / HANDLE</label>
              <input id="loginUsernameInput" class="input" placeholder="e.g. pilot_01" required />
            </div>
            <div class="settings-group" style="margin-top: 20px;">
              <label>PASSWORD</label>
              <div class="input-with-eye" style="position: relative;">
                <input id="loginPasswordInput" class="input" type="password" placeholder="••••••••" required />
                <span id="toggleLoginPass" class="eye-toggle"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;">👁️</span>
              </div>
            </div>
            <div id="loginErrorMsg" class="auth-error-msg"
              style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 15px; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
            </div>
            <button type="submit" id="loginSubmitBtn" class="btn btn-primary w-full"
              style="margin-top: 25px; padding: 14px; background: #10b981; border: none; font-weight: 800; letter-spacing: 1px;">
              LOGIN
            </button>
            <div style="text-align: center; margin-top: 20px;">
              <button type="button" id="legacyAuthTrigger"
                style="background: none; border: none; color: #94a3b8; font-size: 0.7rem; text-decoration: underline; cursor: pointer;">
                Legacy Login (Old Sync ID)
              </button>
            </div>
          </form>
        </div>

        <!-- Legacy Logic -->
        <div id="authLegacyView" class="auth-view">
          <div class="docs-callout docs-callout-info" style="margin-bottom: 20px; font-size: 0.7rem; padding: 12px;">
            Migrate from the old Sync ID system to the new Participant Identity.
          </div>
          <form id="legacyForm">
            <div class="settings-group">
              <label>OLD SYNC ID</label>
              <div class="input-with-eye" style="position: relative;">
                <input id="legacySyncInput" class="input" type="password" placeholder="Paste old ID here..." required />
                <span id="toggleLegacyPass" class="eye-toggle"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;">👁️</span>
              </div>
            </div>
            <div id="legacyErrorMsg" class="auth-error-msg"
              style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 15px; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
            </div>
            <button type="submit" id="legacySubmitBtn" class="btn btn-primary w-full" style="margin-top: 20px;">
              VERIFY LEGACY IDENTITY
            </button>
            <button type="button" id="backToLoginFromLegacy" class="btn btn-ghost w-full" style="margin-top: 10px;">
              Back to Login
            </button>
          </form>
        </div>

        <!-- Register Form -->
        <div id="authRegisterView" class="auth-view">
          <form id="registerForm">
            <!-- Sector 01: Identity -->
            <div class="auth-sector-label" style="font-size: 0.6rem; color: #10b981; font-weight: 800; letter-spacing: 2px; margin-bottom: 12px; opacity: 0.7;">[ SECTOR 01: IDENTITY ]</div>
            
            <div class="settings-group" style="margin-bottom: 15px;">
              <label>SELECT TACTICAL AVATAR</label>
              <div id="regAvatarPickerGrid" class="avatar-grid" style="grid-template-columns: repeat(6, 1fr); gap: 6px;">
                <!-- Auto populated -->
              </div>
              <input type="hidden" id="regAvatarInput" value="👨‍🚀" />
            </div>

            <div class="settings-group">
              <label>REAL NAME</label>
              <input id="regRealNameInput" class="input" placeholder="Your actual full name" required />
            </div>

            <div class="settings-group" style="margin-top: 15px;">
              <label>USER ID / HANDLE</label>
              <input id="regUsernameInput" class="input" placeholder="Permanent unique handle" required />
              <p id="regUsernameStatus" style="font-size: 0.6rem; color: #94a3b8; margin-top: 4px;">Locked after creation. Visible on World Stage.</p>
            </div>

            <!-- Sector 02: Contact Archive -->
            <div class="auth-sector-label" style="font-size: 0.6rem; color: #10b981; font-weight: 800; letter-spacing: 2px; margin: 20px 0 12px; opacity: 0.7;">[ SECTOR 02: CONTACT ]</div>
            <div class="settings-group">
              <label>EMAIL ADDRESS</label>
              <input id="regEmailInput" class="input" type="email" placeholder="pilot@gmail.com" required />
            </div>

            <div class="settings-group" style="margin-top: 15px;">
              <label>MOBILE NUMBER</label>
              <input id="regPhoneInput" class="input" type="tel" placeholder="+91 00000 00000" required />
            </div>

            <!-- Sector 03: Security -->
            <div class="auth-sector-label" style="font-size: 0.6rem; color: #10b981; font-weight: 800; letter-spacing: 2px; margin: 20px 0 12px; opacity: 0.7;">[ SECTOR 03: ENCRYPTION ]</div>
            <div class="settings-group">
              <label>PASSWORD</label>
              <div class="input-with-eye" style="position: relative;">
                <input id="regPasswordInput" class="input" type="password" placeholder="Enter Password" required />
                <span id="toggleRegPass" class="eye-toggle"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;">👁️</span>
              </div>
            </div>

            <!-- Sector 04: Specs -->
            <div class="auth-sector-label" style="font-size: 0.6rem; color: #10b981; font-weight: 800; letter-spacing: 2px; margin: 20px 0 12px; opacity: 0.7;">[ SECTOR 04: PILOT SPECS ]</div>
            <div class="grid-2">
              <div class="settings-group">
                <label>DATE OF BIRTH</label>
                <input id="regDobInput" class="input" type="date" required />
              </div>
              <div class="settings-group">
                <label>NATION</label>
                <select id="regNationSelect" class="input">
                  <option value="Global">Global</option>
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="Japan">Japan</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div id="regErrorMsg" class="auth-error-msg"
              style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 15px; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
            </div>
            <button type="submit" id="regSubmitBtn" class="btn btn-primary w-full"
              style="margin-top: 25px; padding: 14px; background: #10b981; border: none; font-weight: 800; letter-spacing: 1px;">
              CREATE ACCOUNT
            </button>
            <div style="height: 10px;"></div>
          </form>
        </div>

        <!-- Recovery Logic (Forgot Key) -->
        <div id="authRecoveryView" class="auth-view">
          <div class="docs-callout docs-callout-warning" style="margin-bottom: 20px; font-size: 0.7rem; padding: 12px;">
            Use your 12-character Recovery Key to decrypt vault data.
          </div>
          <form id="recoveryForm">
            <div class="settings-group">
              <label>USER ID</label>
              <input id="recUsernameInput" class="input" placeholder="Your handle" required />
            </div>
            <div class="settings-group" style="margin-top: 12px;">
              <label>RECOVERY KEY</label>
              <div class="input-with-eye" style="position: relative;">
                <input id="recRecoveryKeyInput" class="input" type="password" placeholder="12-character code" required />
                <span id="toggleRecoveryPass" class="eye-toggle" onclick="const i=document.getElementById('recRecoveryKeyInput'); i.type=i.type==='password'?'text':'password'; this.textContent=i.type==='password'?'👁️':'🔒'"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;">👁️</span>
              </div>
            </div>
            <div id="recoveryErrorMsg" class="auth-error-msg"
              style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 15px; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
            </div>
            <div id="recoverySuccessMsg"
              style="display: none; color: #10b981; font-size: 0.75rem; margin-top: 15px; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 800;">
            </div>
            <button type="submit" id="recoverySubmitBtn" class="btn btn-ghost w-full"
              style="margin-top: 25px; padding: 14px; font-weight: 800; letter-spacing: 1px; border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444;">
              RESTORE ACCESS
            </button>
            <button type="button" id="backToLoginFromRecovery" class="btn btn-ghost w-full" style="margin-top: 10px;">
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
`;
