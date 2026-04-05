export const profileModal = `
  <div class="modal" id="profileSetupModal">
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header"
        style="justify-content: flex-start; padding: 20px; border-bottom: 2px solid rgba(16, 185, 129, 0.2);">
        <div class="passport-avatar" id="passportAvatar"
          style="width: 45px; height: 45px; background: rgba(16, 185, 129, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #10b981; margin-right: 15px;">
          👤</div>
        <div class="passport-identity" style="display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="passport-handle" id="displayHandle"
              style="font-weight: 900; font-size: 1.1rem; color: #fff;">@new_participant</span>
            <span id="verifiedBadge"
              style="font-size: 0.6rem; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: 900; letter-spacing: 0.5px;">VERIFIED</span>
          </div>
          <span class="passport-rank-badge" id="displayRank"
            style="font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase;">UNRANKED •
            PILOT</span>
        </div>
        <button id="closeProfileModal" class="modal-close" style="top: 15px; right: 15px;">&times;</button>
      </div>

      <div class="modal-body" style="padding: 24px;">
        <div class="passport-form">
          <div class="settings-group" style="margin-bottom: 25px;">
            <label style="color: #10b981; letter-spacing: 2px;">SELECT PILOT ARCHETYPE</label>
            <div id="avatarPickerGrid" class="avatar-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 12px; max-height: 250px; overflow-y: auto; padding: 5px;">
              <div class="avatar-item active" data-avatar="👨‍🚀" title="The Astronaut">👨‍🚀</div>
              <div class="avatar-item" data-avatar="🦸‍♂️" title="The Avenger">🦸‍♂️</div>
              <div class="avatar-item" data-avatar="🦇" title="The Dark Knight">🦇</div>
              <div class="avatar-item" data-avatar="🤖" title="The Automaton">🤖</div>
              <div class="avatar-item" data-avatar="🦾" title="The Cyborg">🦾</div>
              <div class="avatar-item" data-avatar="🚀" title="The Martian">🚀</div>
              <div class="avatar-item" data-avatar="💻" title="The Terminal">💻</div>
              <div class="avatar-item" data-avatar="📡" title="The Uplink">📡</div>
              <div class="avatar-item" data-avatar="🔭" title="The Observer">🔭</div>
              <div class="avatar-item" data-avatar="🧬" title="The Architect">🧬</div>
              <div class="avatar-item" data-avatar="🥷" title="The Shinobi">🥷</div>
              <div class="avatar-item" data-avatar="👺" title="The Oni">👺</div>
              <div class="avatar-item" data-avatar="🍥" title="The Hokage">🍥</div>
              <div class="avatar-item" data-avatar="🐉" title="The Shenron">🐉</div>
              <div class="avatar-item" data-avatar="🌌" title="The Nebula">🌌</div>
              <div class="avatar-item" data-avatar="🏏" title="The Batter">🏏</div>
              <div class="avatar-item" data-avatar="⚽" title="The Striker">⚽</div>
              <div class="avatar-item" data-avatar="🏀" title="The Hooper">🏀</div>
              <div class="avatar-item" data-avatar="🥊" title="The Fighter">🥊</div>
              <div class="avatar-item" data-avatar="🕶️" title="The Operative">🕶️</div>
            </div>
          </div>
          <div class="settings-group">
            <label>ARENA DISPLAY NAME</label>
            <input id="profileNameInput" class="input" placeholder="Enter your display name..." />
          </div>
          <div class="grid-2" style="margin-top: 15px;">
            <div class="settings-group">
              <label>AGE</label>
              <input id="profileAgeInput" class="input" type="number" placeholder="Years" />
            </div>
            <div class="settings-group">
              <label>NATION</label>
              <select id="profileNationSelect" class="input">
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
          <button id="saveProfileBtn" class="btn btn-primary w-full"
            style="margin-top: 25px; padding: 14px; background: #10b981; border: none; font-weight: 800; letter-spacing: 1px;">
            CREATE PROFILE & SECURE IDENTITY
          </button>
        </div>

        <!-- Security Migration Section -->
        <div class="security-migration-section"
          style="margin-top: 40px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.05);">
          <div class="intel-label"
            style="display: flex; align-items: center; gap: 8px; color: #ef4444; margin-bottom: 5px; font-weight: 800; letter-spacing: 1px; font-size: 0.75rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            [ VAULT SECURITY MIGRATION ]
          </div>
          <p class="reflection-sub" style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 20px;">Move study history
            to a new vault key.</p>

          <div class="settings-group">
            <label style="font-size: 0.65rem;">CURRENT VAULT KEY</label>
            <div class="input-with-eye" style="position: relative;">
              <input id="currentSecretKeyInput" class="input" type="password" placeholder="Verify current key" />
              <span id="toggleCurrentKey" class="eye-toggle"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 0.7rem;">👁️</span>
            </div>
          </div>
          <div class="settings-group" style="margin-top: 12px;">
            <label style="font-size: 0.65rem;">NEW VAULT KEY</label>
            <div class="input-with-eye" style="position: relative;">
              <input id="newSecretKeyInput" class="input" type="password" placeholder="Enter target key" />
              <span id="toggleNewKey" class="eye-toggle"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 0.7rem;">👁️</span>
            </div>
          </div>
          <button id="migrateIdentityBtn" class="btn btn-ghost w-full"
            style="margin-top: 20px; border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;">
            INITIALIZE IDENTITY MIGRATION
          </button>
        </div>
      </div>
    </div>
  </div>
`;
