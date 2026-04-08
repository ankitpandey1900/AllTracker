/**
 * The Focus Timer selection / start modal.
 */
export const timerModal = `
  <div id="focusHud" class="focus-hud">
    <div id="activeTimerSection" style="display: none">
      <div class="hud-top-bar">
        <div class="hud-status" style="display: flex; align-items: center; gap: 8px;">
          <div class="pulse-emerald" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
          <span style="font-size: 0.6rem; font-weight: 800; color: #10b981; letter-spacing: 1px;">ACTIVE PHASE</span>
        </div>
        <button id="manualFocusToggle" class="btn-icon minimize-btn" title="Toggle Mini-Player">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14h6v6" />
            <path d="M20 10h-6V4" />
            <path d="M14 10l7-7" />
            <path d="M3 21l7-7" />
          </svg>
          <span id="focusToggleText" style="display:none;">Minimize HUD</span>
        </button>
      </div>

      <div class="timer-circle-container">
        <div class="ring-wrap">
          <svg class="progress-ring" width="280" height="280">
            <defs>
              <linearGradient id="timerRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee" />
                <stop offset="50%" stop-color="#6a86ff" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle class="progress-ring__bg" stroke="rgba(255,255,255,0.04)" stroke-width="2" fill="transparent"
              r="130" cx="140" cy="140"></circle>
            <circle class="progress-ring__circle" stroke="url(#timerRingGradient)" stroke-linecap="round"
              stroke-width="6" fill="transparent" r="130" cx="140" cy="140"></circle>
          </svg>
        </div>
        <div class="timer-center-content">
          <div class="label" id="timerSubject">DEEP FOCUS</div>
          <div id="timerDisplay" class="timer-display">00:00:00</div>
          <div id="focusActiveTaskContainer" style="display: none">
            <span id="nowPlayingTask" class="timer-task-text">--</span>
          </div>
        </div>
      </div>

      <div class="control-row">
        <button id="timerPauseBtn" class="btn btn-outline">Pause</button>
        <button id="timerStopBtn" class="btn btn-danger glow-danger">Stop</button>
      </div>
      <div class="session-goal-row">
        <label for="sessionGoalInput">Session Goal (mins)</label>
        <input id="sessionGoalInput" class="input small" type="number" min="1" value="60" />
      </div>
    </div>
  </div>

  <div id="toastContainer" class="toast-container"></div>

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
