/**
 * The Quick Entry / Mini-Log modal.
 */
export const quickEntryModal = `
  <div class="modal" id="quickEntryModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <h2>Quick Entry</h2>
        <button id="closeQuickEntryModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <h3>Single Day</h3>
        <div class="form-grid" style="margin-bottom: 30px;">
          <input id="quickEntryDay" class="input" type="number" min="1" placeholder="Day #" />
          <div id="quickEntryHoursGrid" class="form-grid-full"></div>
          <input id="quickProblems" class="input" type="number" min="0" placeholder="Problems Solved" />
          <input id="quickProject" class="input" placeholder="Project" />
          <textarea id="quickTopics" class="input" placeholder="Topics"></textarea>
          <label><input id="quickCompleted" type="checkbox" /> Completed</label>
          <button id="saveQuickEntryBtn" class="btn btn-primary">
            Save Day
          </button>
        </div>

        <h3>Bulk Entry</h3>
        <div class="form-grid" style="margin-bottom: 30px;">
          <input id="bulkStartDay" class="input" type="number" min="1" placeholder="Start day" />
          <input id="bulkEndDay" class="input" type="number" min="1" placeholder="End day" />
          <div id="bulkEntryHoursGrid" class="form-grid-full"></div>
          <label><input id="bulkCompleted" type="checkbox" /> Mark
            completed</label>
          <button id="saveBulkEntryBtn" class="btn">Apply Bulk</button>
        </div>

        <h3>Jump to Day</h3>
        <div class="row" style="gap: 12px;">
          <input id="jumpToDayInput" class="input small" type="number" min="1" placeholder="Day #" />
          <button id="jumpToDayBtn" class="btn">Jump</button>
        </div>
      </div>
    </div>
  </div>
`;
