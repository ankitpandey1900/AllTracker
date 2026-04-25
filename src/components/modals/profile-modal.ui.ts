/**
 * The Social Study Profile / Identity editor modal.
 */
export const profileModal = `
  <div class="modal" id="profileSetupModal">
    <div class="modal-content social-profile-card">
      
      <!-- 🔄 VAULT SWAP CONTAINER -->
      <div class="vault-swap-container">
        
        <!-- 🪪 PANE 1: THE SOCIAL PROFILE (View Mode) -->
        <div id="passportViewPane" class="vault-pane">
          
          <div class="social-header">
            <div class="profile-avatar-container">
              <div class="profile-avatar-box tactical-ring">
                <div class="profile-avatar" id="passportAvatar">👤</div>
              </div>
              <div id="statusBeacon" class="status-beacon idle" title="Current Status"></div>
            </div>

            <div class="profile-identity-info">
              <div class="name-row">
                <h2 id="profileDisplayName" class="social-full-name">Operative Name</h2>
                <div id="profileNationBadge" class="nation-badge">Global</div>
              </div>
              <div class="handle-row">
                <span class="social-handle" id="displayHandle">@User</span>
                <span class="rank-tag" id="displayRank">RECRUIT</span>
              </div>
            </div>
            
            <button id="closeProfileModal" class="social-close-btn">&times;</button>
          </div>

          <div class="profile-content-body">
            
            <!-- SOCIAL CREDIBILITY BAR -->
            <div class="social-stats-bar">
              <div class="stat-item">
                <div class="stat-val-row"><span id="totalHoursPassport" class="stat-value">0.0</span><span class="stat-unit">HRS</span></div>
                <div class="stat-label">TOTAL STUDY</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-val-row"><span id="bestStreakPassport" class="stat-value">0</span><span class="stat-unit">DAYS</span></div>
                <div class="stat-label">BEST STREAK</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-val-row"><span id="todayHoursPassport" class="stat-value">0.0</span><span class="stat-unit">HRS</span></div>
                <div class="stat-label">TODAY</div>
              </div>
            </div>

            <!-- PERSONAL DOSSIER SECTION -->
            <div class="profile-dossier">
              <div class="dossier-row">
                <div class="dossier-label">TRUST SCORE</div>
                <div id="dossierTrustScore" class="dossier-value">[ VERIFYING... ]</div>
              </div>
              <div class="dossier-row">
                <div class="dossier-label">Real Name</div>
                <div id="dossierRealName" class="dossier-value">[ NOT SET ]</div>
              </div>
              
              <div class="dossier-row">
                <div class="dossier-label">Email UPLINK</div>
                <div id="dossierEmail" class="dossier-value">[ NOT SET ]</div>
              </div>

              <div class="dossier-row">
                <div class="dossier-label">MOBILE SECURE</div>
                <div id="dossierPhone" class="dossier-value">[ NOT SET ]</div>
              </div>

            </div>

            <div class="profile-social-actions">
              <button id="switchToEditProfileBtn" class="social-btn btn-outline">Edit Profile</button>
              <button id="closeProfileModalAlt" class="social-btn btn-solid">Back to Home</button>
            </div>
          </div>
        </div>

        <!-- ⚒️ PANE 2: THE PROFILE EDITOR (Edit Mode) -->
        <div id="profileEditPane" class="vault-pane hidden">
           <div class="social-edit-header">
             <h3 class="social-edit-title">VAULT // IDENTITY_CONFIG</h3>
             <button id="switchToPassportBtn" class="social-cancel-btn">[ BACK ]</button>
           </div>
           
           <div class="social-edit-body">
              <div class="edit-group" style="margin-bottom: 25px;">
                <label class="social-input-label" style="text-align: center; width: 100%; display: block; margin-bottom: 12px; font-size: 0.75rem; letter-spacing: 2px;">SELECT TACTICAL ARCHETYPE</label>
                <div id="avatarPickerContainer" class="avatar-vault-grid">
                  <div id="avatarPickerGrid" class="avatar-social-grid" style="grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <!-- Avatar items injected/setup in profile.ui.ts -->
                  </div>
                </div>
              </div>

              <div class="input-stack">
                <div class="edit-group">
                  <label class="social-input-label">FULL NAME</label>
                  <input id="profileRealNameInput" class="social-input" placeholder="Operative Name" />
                </div>
                
                <div class="edit-group">
                  <label class="social-input-label">HANDLE</label>
                  <input id="profileNameInput" class="social-input" placeholder="@handle" />
                </div>

                <div class="input-row">
                  <div class="edit-group">
                    <label class="social-input-label">DOB</label>
                    <input id="profileDobInput" class="social-input" type="date" />
                  </div>
                  <div class="edit-group">
                    <label class="social-input-label">NATION</label>
                    <select id="profileNationSelect" class="social-input">
                      <option value="Global">Global</option>
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                    </select>
                  </div>
                </div>

                <div class="edit-group">
                  <label class="social-input-label">SECURE EMAIL</label>
                  <input id="profileEmailInput" class="social-input" type="email" placeholder="pilot@alltracker.online" />
                </div>

                <div class="edit-group">
                  <label class="social-input-label">MOBILE UPLINK</label>
                  <input id="profilePhoneInput" class="social-input" type="tel" placeholder="+91 XXXX XXXX" />
                </div>

                <div class="social-toggle-group">
                  <div class="toggle-info">
                    <div class="toggle-title">SHARE FOCUS STATUS</div>
                    <div class="toggle-sub">Show current study mission to others?</div>
                  </div>
                  <label class="switch-v2">
                    <input type="checkbox" id="profileFocusPrivacyToggle" checked>
                    <span class="slider-v2"></span>
                  </label>
                </div>
              </div>

              <button id="saveProfileBtn" class="social-save-btn">
                Save Profile Changes
              </button>
           </div>
        </div>
      </div>
    </div>
  </div>
`;
