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
