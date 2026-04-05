export const routineModalContents = `
  <div class="modal" id="routineModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add New Routine Item</h2>
        <button id="closeRoutineModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <input id="routineTitleInput" class="input" placeholder="Title" />
        <input id="routineTimeInput" class="input" type="time" />
        <textarea id="routineNoteInput" class="input" rows="3" placeholder="Notes"></textarea>
        
        <div class="routine-days-selector" style="margin: 15px 0;">
          <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Repeat on</label>
          <div style="display: flex; gap: 8px; justify-content: space-between;">
            <label class="day-chip"><input type="checkbox" data-day="1"><span>M</span></label>
            <label class="day-chip"><input type="checkbox" data-day="2"><span>T</span></label>
            <label class="day-chip"><input type="checkbox" data-day="3"><span>W</span></label>
            <label class="day-chip"><input type="checkbox" data-day="4"><span>T</span></label>
            <label class="day-chip"><input type="checkbox" data-day="5"><span>F</span></label>
            <label class="day-chip"><input type="checkbox" data-day="6" class="weekend"><span>S</span></label>
            <label class="day-chip"><input type="checkbox" data-day="0" class="weekend"><span>S</span></label>
          </div>
        </div>

        <button id="saveRoutineBtn" class="btn btn-primary">
          Add to Routine
        </button>
      </div>
    </div>
  </div>
`;
