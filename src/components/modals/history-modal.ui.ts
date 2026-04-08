/**
 * The Session History modal.
 */
export const historyModal = `
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
        <div class="responsive-table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Category</th>
                <th>Hours</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody id="recentSessionsBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;
