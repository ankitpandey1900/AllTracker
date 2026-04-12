/**
 * The Session History modal.
 */
export const historyModal = `
  <style>
    #historyModal .modal-content.wide {
      width: min(1200px, 98%) !important;
      max-width: 98% !important;
      background: rgba(10, 15, 25, 0.9) !important;
      backdrop-filter: blur(24px) saturate(180%) !important;
    }
    #historyModal .modal-body {
      padding: 12px 6px !important;
    }
    #historyModal .responsive-table-container,
    #historyModal table {
      display: block !important;
      width: 100% !important;
    }
    #historyModal #recentSessionsBody {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
      gap: 16px !important;
      width: 100% !important;
      padding: 10px 0 !important;
    }
    #historyModal .history-date-group,
    #historyModal .history-subject-row {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      box-sizing: border-box !important;
      display: block !important;
    }
    #historyModal .history-session-detail {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 12px !important;
      padding: 18px !important;
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(100, 150, 255, 0.15) !important;
      border-radius: 16px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      align-items: flex-start !important;
    }
    #historyModal .history-session-detail td {
      flex: 1 1 42% !important;
      display: block !important;
      width: auto !important;
      border: none !important;
      padding: 0 !important;
      word-break: break-word !important; /* Safety against overlap */
      min-width: 0 !important; /* Allow flex shrink if needed */
    }
    #historyModal td.session-log-note {
      flex: 1 1 100% !important;
      border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
      margin-top: 10px !important;
      padding-top: 10px !important;
    }
  </style>
  <div class="modal" id="historyModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <h2>Session History</h2>
        <button id="closeHistoryModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="history-filter-bar">
          <div class="filter-group">
            <label for="historyDateFilter" class="label-caps small">Filter by Date</label>
            <input type="date" id="historyDateFilter" class="input small">
          </div>
          <button id="clearHistoryFilter" class="btn btn-outline small">Clear Filter</button>
        </div>
        <div id="historyMigrationBanner" style="display: none; margin-bottom: 20px;"></div>
        <div class="responsive-table-container">
          <table style="width: 100%; border-collapse: collapse;">
            <tbody id="recentSessionsBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;
