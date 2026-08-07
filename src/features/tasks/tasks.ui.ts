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
          <!-- Toggle Daily vs Weekly -->
          <div class="task-type-toggle">
            <button class="type-btn active" data-type="daily">Daily Mission</button>
            <button class="type-btn" data-type="weekly">Weekly Goal</button>
          </div>
          
          <div class="input-wrapper" style="margin-top: 12px;">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <input id="newTaskInput" class="mc-input" placeholder="Initiate new objective..." />
          </div>
          
          <div id="taskPrioritySelector" class="mc-priority-toggles" style="margin-top: 12px;">
            <button type="button" class="priority-toggle" data-priority="1" title="Low Priority">L</button>
            <button type="button" class="priority-toggle active" data-priority="2" title="Medium Priority">M</button>
            <button type="button" class="priority-toggle" data-priority="3" title="High Priority">H</button>
          </div>
          
          <button id="addTaskBtn" class="mc-add-btn" style="margin-top: 12px;">
            <span>Deploy</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div class="mc-tasks-container split-layout">
          <!-- Left Column: Daily -->
          <div class="mc-task-column">
            <div class="mc-task-section active-missions">
              <h3 class="mc-section-title today-title">
                <span class="pulse-dot"></span> Active Missions (Daily)
              </h3>
              <div id="todayTasksList" class="mc-task-list"></div>
            </div>
            
            <div class="mc-task-section backlog-missions">
              <h3 class="mc-section-title backlog-title">Daily Backlog</h3>
              <div id="backlogTasksList" class="mc-task-list"></div>
            </div>
          </div>

          <!-- Right Column: Weekly & History -->
          <div class="mc-task-column">
            <div class="mc-task-section weekly-missions">
              <h3 class="mc-section-title weekly-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Weekly Objectives
              </h3>
              <div id="weeklyTasksList" class="mc-task-list"></div>
            </div>

            <div class="mc-task-section history-missions">
              <h3 class="mc-section-title history-title">Mission History</h3>
              <div id="completedTasksList" class="mc-task-list"></div>
            </div>
          </div>
        </div>
      </article>
`;
