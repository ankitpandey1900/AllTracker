/**
 * HTML templates for the Study Tasks (Daily Missions) page.
 */
export const tasksView = `
      <article class="card">
        <div class="row-between">
          <h2>Mission Control</h2>
          <div class="task-stats">
            <span id="backlogCount" class="badge-backlog">0 Backlog</span>
          </div>
        </div>

        <div class="mission-clearance-hud">
          <div class="hud-header">
            <span class="hud-title">Daily Clearance</span>
            <span id="clearanceText" class="hud-percent">0%</span>
          </div>
          <div class="hud-track">
            <div id="clearanceFill" class="hud-fill" style="width: 0%"></div>
          </div>
        </div>

        <div class="task-input-wrap">
          <input id="newTaskInput" class="input" placeholder="Add a new objective (e.g., React Lec - 1)..." />
          <div id="taskPrioritySelector" class="priority-segmented-control">
            <button type="button" class="priority-btn" data-priority="1" title="Low Priority">L</button>
            <button type="button" class="priority-btn active" data-priority="2" title="Medium Priority">M</button>
            <button type="button" class="priority-btn" data-priority="3" title="High Priority">H</button>
          </div>
          <button id="addTaskBtn" class="btn btn-primary">Add Task</button>
        </div>

        <div class="tasks-container">
          <div class="task-section">
            <h3 class="section-title today-title">Today's Missions</h3>
            <div id="todayTasksList" class="task-list"></div>
          </div>

          <div class="task-section">
            <h3 class="section-title backlog-title">The Backlog</h3>
            <div id="backlogTasksList" class="task-list"></div>
          </div>

          <div class="task-section">
            <h3 class="section-title history-title">History</h3>
            <div id="completedTasksList" class="task-list"></div>
          </div>
        </div>
      </article>
`;
