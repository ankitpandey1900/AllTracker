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
                  <option value="stealth-midnight">Stealth Midnight (Default)</option>
                  <option value="obsidian-glass">Obsidian Glass</option>
                  <option value="tactical-navy">Tactical Navy</option>
                  <option value="solar-gold">Solar Gold</option>
                  <option value="pristine-white">Pristine White (Light Mode)</option>
                  <option value="quantum-purple">Quantum Purple</option>
                </select>
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
                <select id="timerFontSelectInput" class="settings-input" style="flex: 1;">
                  <option value="fira">Fira Code (Hacker)</option>
                  <option value="digital">Orbitron (Digital)</option>
                  <option value="tektur">Tektur (Sci-Fi)</option>
                  <option value="inter">Inter (Apple-Style)</option>
                  <option value="monoton">Monoton (Neon Racing)</option>
                  <option value="blackops">Black Ops (Tactical Stencil)</option>
                  <option value="silkscreen">Silkscreen (Retro Pixel)</option>
                  <option value="bungee">Bungee (Massive 3D)</option>
                </select>
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
