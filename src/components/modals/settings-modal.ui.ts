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
              <div class="row" style="gap: 10px; align-items: stretch;">
                <select id="themeSelectInput" class="settings-input" style="background:#0f172a; flex: 1;">
                  <option value="midnight">All Tracker Original</option>
                  <option value="himavat">Himavat (Himalayan Ice)</option>
                  <option value="chanakya-strategy">Chanakya Strategy (Technical)</option>
                  <option value="ayodhya">Ayodhya (Divine Order)</option>
                  <option value="kamala-grace">Kamala's Grace (Prosperity)</option>
                  <option value="vajra-shakti">Vajra Shakti (Divine Stadium)</option>
                </select>
                <button id="applyThemeBtn" class="btn btn-primary" style="white-space: nowrap; padding: 0 20px;">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-card">
            <div class="settings-card-header">
              <h4>Date Range</h4>
            </div>
            <div class="range-grid">
              <div class="settings-group">
                <label>Start Date</label>
                <input id="startDateInput" class="settings-input" type="date" />
              </div>
              <div class="settings-group">
                <label>End Date</label>
                <input id="endDateInput" class="settings-input" type="date" />
              </div>
            </div>
            <button id="applyDateSettings" class="btn btn-primary w-full">
              Apply Dates
            </button>
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
