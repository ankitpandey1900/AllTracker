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
              <label>Focus Timer Design</label>
              <div class="row" style="gap: 10px; align-items: stretch;">
                <select id="timerStyleSelectInput" class="settings-input" style="flex: 1;">
                  <option value="block">Digital</option>
                  <option value="ring">Classic</option>
                </select>
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
