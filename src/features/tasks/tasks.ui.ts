/**
 * HTML templates for the Study Tasks (Daily Missions) page.
 */
export const tasksView = `
      <article class="card mission-control-panel">
        <header class="mc-header row-between">
          <div>
            <h2 class="mc-title">MISSION CONTROL</h2>
            <p class="mc-subtitle">Daily Objective Tracking</p>
          </div>
          <div class="task-stats">
            <span id="backlogCount" class="badge-backlog">0 Backlog</span>
          </div>
        </header>

        <!-- Segmented Telemetry Clearance HUD -->
        <div class="mc-clearance-hud">
          <div class="hud-header">
            <span class="hud-label">CLEARANCE RATE</span>
            <span id="clearanceText" class="hud-percent">0%</span>
          </div>
          <div class="hud-track">
            <div id="clearanceFill" class="hud-fill" style="width: 0%"></div>
            <!-- Glow effect element -->
            <div class="hud-fill-glow" style="width: 0%"></div>
          </div>
        </div>

        <!-- Glassmorphic Input Dock -->
        <div class="mc-input-dock">
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <input id="newTaskInput" class="mc-input" placeholder="Initiate new objective (e.g., React Lec - 1)..." />
          </div>
          
          <div id="taskPrioritySelector" class="mc-priority-toggles">
            <button type="button" class="priority-toggle" data-priority="1" title="Low Priority">L</button>
            <button type="button" class="priority-toggle active" data-priority="2" title="Medium Priority">M</button>
            <button type="button" class="priority-toggle" data-priority="3" title="High Priority">H</button>
          </div>
          
          <button id="addTaskBtn" class="mc-add-btn">
            <span>Deploy</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div class="mc-tasks-container">
          <div class="mc-task-section active-missions">
            <h3 class="mc-section-title today-title">
              <span class="pulse-dot"></span> Active Missions
            </h3>
            <div id="todayTasksList" class="mc-task-list"></div>
          </div>

          <div class="mc-task-section backlog-missions">
            <h3 class="mc-section-title backlog-title">The Backlog</h3>
            <div id="backlogTasksList" class="mc-task-list"></div>
          </div>

          <div class="mc-task-section history-missions">
            <h3 class="mc-section-title history-title">Mission History</h3>
            <div id="completedTasksList" class="mc-task-list"></div>
          </div>
        </div>
      </article>
`;
