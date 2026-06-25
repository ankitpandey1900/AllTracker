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

  <!-- Timer Extend Modal -->
  <div class="modal" id="timerExtendModal">
    <div class="modal-content" style="max-width: 400px; text-align: center;">
      <div class="modal-header" style="justify-content: center; border-bottom: none; margin-bottom: 10px;">
        <h2 style="font-family: 'Tektur'; font-size: 1.5rem; color: #f59e0b; text-transform: uppercase;">Mission Paused</h2>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem;">
          You've reached your session limit. Are you still actively focusing?
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="extend30MinBtn" class="btn" style="background: rgba(139, 92, 246, 0.1); border: 1px solid #8b5cf6; color: #a78bfa; font-weight: 800;">
            + 30 Mins Focus
          </button>
          <button id="extend60MinBtn" class="btn" style="background: rgba(139, 92, 246, 0.2); border: 1px solid #8b5cf6; color: #c4b5fd; font-weight: 800;">
            + 1 Hour Focus
          </button>
          <button id="extendEndSessionBtn" class="btn btn-primary" style="margin-top: 12px;">
            End Session & Save
          </button>
        </div>
      </div>
    </div>
  </div>
`;
