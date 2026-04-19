/**
 * The 'Focus HUD' overlay.
 * 
 * This is the timer that floats on top of everything when you're 
 * in a deep focus session.
 */
export const hudView = `
  <div id="focusHud" class="focus-hud">
    <div id="activeTimerSection" style="display: none">
      <div class="hud-top-bar">
        <div class="hud-status" style="display: flex; align-items: center; gap: 8px;">
          <div class="pulse-emerald" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
          <span style="font-size: 0.6rem; font-weight: 800; color: #10b981; letter-spacing: 1px;">ACTIVE PHASE</span>
          
          <!-- Sync Status Indicator -->
          <div id="timerSyncStatus" class="sync-indicator sync-live" title="Cloud Sync Active" style="margin-left: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.5 19c.7 0 1.3-.2 1.8-.7.5-.4.7-1 .7-1.7 0-1.4-1.1-2.5-2.5-2.5-.2 0-.4 0-.6.1C16 12.1 14.2 11 12.1 11c-2.6 0-4.8 1.8-5.4 4.3-.1 0-.2 0-.3 0-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5h11.1z" />
            </svg>
          </div>
        </div>
        <button id="manualFocusToggle" class="btn-icon minimize-btn" title="Toggle Mini-Player">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14h6v6" />
            <path d="M20 10h-6V4" />
            <path d="M14 10l7-7" />
            <path d="M3 21l7-7" />
          </svg>
      </div>
      
      <!-- 🎙️ LIVE COMMS: News Ticker for focus telemetry -->
      <div id="hudLiveComms" class="hud-live-comms" style="margin: -10px 0 15px; overflow: hidden; white-space: nowrap; border-radius: 4px; background: rgba(0,0,0,0.2); padding: 4px 0;">
        <div id="hudTicker" class="hud-ticker" style="display: inline-block; padding-left: 100%; animation: ticker 25s linear infinite; font-size: 0.62rem; color: #60a5fa; font-weight: 800; letter-spacing: 0.5px; opacity: 0.8;">
          📡 CONNECTING TO TELEMETRY... 
        </div>
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
          <div class="neon-glow-bg"></div>
          <div class="glass-block-content">
            <div class="label" id="timerSubject">DEEP FOCUS</div>
            <div id="timerDisplay" class="timer-display">00:00:00</div>
            <div id="focusActiveTaskContainer" style="display: none">
              <span id="nowPlayingTask" class="timer-task-text">--</span>
            </div>
          </div>
        </div>
      </div>

      <div class="control-row">
        <button id="timerPauseBtn" class="btn btn-outline">Pause</button>
        <button id="timerTerminateBtn" class="btn btn-ghost" title="Discard session — no data saved" style="border: 1px solid rgba(239,68,68,0.4); color: #ef4444; font-size: 0.65rem; letter-spacing: 1px; opacity: 0.8;">TERMINATE</button>
        <button id="timerStopBtn" class="btn btn-danger glow-danger">Stop</button>
      </div>
      <div class="session-goal-row">
        <label for="sessionGoalInput">Session Goal (mins)</label>
        <input id="sessionGoalInput" class="input small" type="number" min="1" value="60" />
      </div>
    </div>
  </div>

  <div id="toastContainer" class="toast-container"></div>
`;
