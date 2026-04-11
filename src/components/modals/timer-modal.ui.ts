/**
 * The Focus Timer selection / start modal.
 */
export const timerModal = `
  <!-- Timer Start Modal -->
  <div class="modal" id="timerModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Start Session</h2>
        <button id="closeTimerModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <select id="timerCategorySelect" class="input"></select>
        <button id="confirmStartTimerBtn" class="btn btn-primary">
          Start Timer
        </button>
      </div>
    </div>
  </div>
`;
