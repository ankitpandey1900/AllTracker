/**
 * The App Settings modal.
 */
export const settingsModal = `
  <div class="modal" id="settingsModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <h2>Settings</h2>
        <button id="closeSettingsModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="settings-section">
          <div class="settings-card">
            <div class="settings-card-header">
              <h4>Appearance / Theme</h4>
            </div>
            <div class="settings-group" style="margin-top: 10px;">
              <label>Select Visual Theme</label>
              <div class="row" style="gap: 10px; align-items: stretch; margin-bottom: 12px;">
                <select id="themeSelectInput" class="settings-input" style="flex: 1;">
                  <option value="stealth-midnight">Stealth Midnight</option>
                  <option value="obsidian-glass">Obsidian Glass (Default)</option>
                  <option value="tactical-navy">Tactical Navy</option>
                  <option value="solar-gold">Solar Gold</option>
                  <option value="pristine-white">Pristine White (Light Mode)</option>
                  <option value="quantum-purple">Quantum Purple</option>
                </select>
              </div>
              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                <label for="accentColorInput" style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; width: 120px;">Accent Color</label>
                <input type="color" id="accentColorInput" class="settings-input" style="flex: 1; height: 38px; padding: 2px;" value="#3b82f6" />
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <label for="timerStyleSelectInput" style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; width: 120px;">Timer Layout</label>
                <select id="timerStyleSelectInput" class="settings-input" style="flex: 1;">
                  <option value="block">Neon Block (Recommended)</option>
                  <option value="ring">Cyber Ring (Classic)</option>
                </select>
              </div>
              <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
                <label for="timerFontSelectInput" style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; width: 120px;">Timer Font</label>
                <select id="timerFontSelectInput" class="settings-input" style="display:none;">
                  <option value="fira">Fira Code (Hacker)</option>
                  <option value="digital">Orbitron (Digital)</option>
                  <option value="tektur">Tektur (Sci-Fi)</option>
                  <option value="inter">Inter (Apple-Style)</option>
                  <option value="monoton">Monoton (Neon Racing)</option>
                  <option value="blackops">Black Ops (Tactical Stencil)</option>
                  <option value="silkscreen">Silkscreen (Retro Pixel)</option>
                  <option value="bungee">Bungee (Massive 3D)</option>
                </select>
                <div class="font-select-wrapper" id="timerFontCustomWrapper">
                  <div class="font-select-trigger settings-input" id="timerFontTrigger"><span id="timerFontSelectedText">Fira Code (Hacker)</span> <span style="font-size: 0.7rem; opacity: 0.7;">▼</span></div>
                  <div class="font-select-options" id="timerFontOptions">
                    <div class="font-option" data-value="fira" style="font-family: 'Fira Code', monospace;">Fira Code (Hacker)</div>
                    <div class="font-option" data-value="digital" style="font-family: 'Orbitron', sans-serif;">Orbitron (Digital)</div>
                    <div class="font-option" data-value="tektur" style="font-family: 'Tektur', sans-serif;">Tektur (Sci-Fi)</div>
                    <div class="font-option" data-value="inter" style="font-family: 'Inter', sans-serif;">Inter (Apple-Style)</div>
                    <div class="font-option" data-value="monoton" style="font-family: 'Monoton', cursive;">Monoton (Neon Racing)</div>
                    <div class="font-option" data-value="blackops" style="font-family: 'Black Ops One', system-ui;">Black Ops (Tactical Stencil)</div>
                    <div class="font-option" data-value="silkscreen" style="font-family: 'Silkscreen', cursive;">Silkscreen (Retro Pixel)</div>
                    <div class="font-option" data-value="bungee" style="font-family: 'Bungee', cursive;">Bungee (Massive 3D)</div>
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
                <label for="uiFontSelectInput" style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; width: 120px;">UI Text Font</label>
                <select id="uiFontSelectInput" class="settings-input" style="display:none;">
                  <option value="default">Theme Default</option>
                  <option value="inter">Inter (Clean & Professional)</option>
                  <option value="space-grotesk">Space Grotesk (Modern Tech)</option>
                  <option value="rajdhani">Rajdhani (Cyberpunk/Sci-Fi)</option>
                  <option value="orbitron">Orbitron (Digital/HUD)</option>
                  <option value="chakra-petch">Chakra Petch (Mecha)</option>
                  <option value="righteous">Righteous (Art Deco Tech)</option>
                  <option value="bebas-neue">Bebas Neue (Cinematic Impact)</option>
                  <option value="cinzel">Cinzel (Luxury/Fantasy)</option>
                  <option value="cormorant">Cormorant (Academic/Elite)</option>
                  <option value="poppins">Poppins (Modern Geometric)</option>
                  <option value="syne">Syne (Avant-Garde)</option>
                  <option value="fira">Fira Code (Hacker Monospace)</option>
                </select>
                <div class="font-select-wrapper" id="uiFontCustomWrapper">
                  <div class="font-select-trigger settings-input" id="uiFontTrigger"><span id="uiFontSelectedText">Theme Default</span> <span style="font-size: 0.7rem; opacity: 0.7;">▼</span></div>
                  <div class="font-select-options" id="uiFontOptions">
                    <div class="font-option" data-value="default" style="font-family: inherit;">Theme Default</div>
                    <div class="font-option" data-value="inter" style="font-family: 'Inter', sans-serif;">Inter (Clean & Professional)</div>
                    <div class="font-option" data-value="space-grotesk" style="font-family: 'Space Grotesk', sans-serif;">Space Grotesk (Modern Tech)</div>
                    <div class="font-option" data-value="rajdhani" style="font-family: 'Rajdhani', sans-serif;">Rajdhani (Cyberpunk/Sci-Fi)</div>
                    <div class="font-option" data-value="orbitron" style="font-family: 'Orbitron', sans-serif;">Orbitron (Digital/HUD)</div>
                    <div class="font-option" data-value="chakra-petch" style="font-family: 'Chakra Petch', sans-serif;">Chakra Petch (Mecha)</div>
                    <div class="font-option" data-value="righteous" style="font-family: 'Righteous', sans-serif;">Righteous (Art Deco Tech)</div>
                    <div class="font-option" data-value="bebas-neue" style="font-family: 'Bebas Neue', sans-serif;">Bebas Neue (Cinematic Impact)</div>
                    <div class="font-option" data-value="cinzel" style="font-family: 'Cinzel', serif;">Cinzel (Luxury/Fantasy)</div>
                    <div class="font-option" data-value="cormorant" style="font-family: 'Cormorant Garamond', serif;">Cormorant (Academic/Elite)</div>
                    <div class="font-option" data-value="poppins" style="font-family: 'Poppins', sans-serif;">Poppins (Modern Geometric)</div>
                    <div class="font-option" data-value="syne" style="font-family: 'Syne', sans-serif;">Syne (Avant-Garde)</div>
                    <div class="font-option" data-value="fira" style="font-family: 'Fira Code', monospace;">Fira Code (Hacker Monospace)</div>
                  </div>
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                <button id="applyThemeBtn" class="btn btn-primary" style="white-space: nowrap; padding: 0 20px;">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>



        <div class="settings-section">
          <div class="row-between section-heading" style="margin-top: 10px">
            <h3>Range-Based Category Management</h3>
            <button id="addCustomRangeBtn" class="btn btn-primary">
              + Add New Study Phase (Range)
            </button>
          </div>
          <div id="customRangesList"></div>
        </div>

        <div class="settings-section">
          <div class="row-between section-heading" style="margin-top: 20px">
            <button id="enableNotificationsBtn" class="btn">
              Enable Study Notifications
            </button>
            <button id="applyColumnSettings" class="btn btn-primary" style="padding: 12px 30px">
              Apply All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
