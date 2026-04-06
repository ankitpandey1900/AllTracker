export const routineView = `
      <article class="card">
        <div class="row-between">
          <h2>Routine</h2>
          <button id="addRoutineBtn" class="btn btn-primary">
            Add Routine
          </button>
        </div>
        <div id="habitPulseContainer" class="habit-pulse-container" style="display: none;">
          <div class="habit-pulse-header">
            <span class="pulse-icon">🧠</span>
            <span class="pulse-label">MAAMU'S HABIT PULSE</span>
          </div>
          <div id="habitPulseContent" class="habit-pulse-content">Analyzing habit patterns...</div>
        </div>
        <div id="routineList"></div>
      </article>
      <div class="grid-2">
        <article class="card">
          <div class="row-between">
            <h2>Routine Performance</h2>
            <div class="filter-row">
              <select id="chartDateFilter" class="input">
                <option value="21">Last 21 days</option>
                <option value="60">Last 60 days</option>
                <option value="all">All</option>
                <option value="custom">Custom</option>
              </select>
              <div id="customChartRange" style="display: none">
                <input id="chartStartDay" class="input small" type="number" placeholder="Start day" />
                <input id="chartEndDay" class="input small" type="number" placeholder="End day" />
                <button id="applyChartFilterBtn" class="btn">Apply</button>
              </div>
            </div>
          </div>
          <div class="stats-line">
            <span>Active Days: <strong id="habitActiveDays">0</strong></span>
            <span>Consistency: <strong id="habitConsistency">0%</strong></span>
          </div>
          <div class="chart-wrap">
            <canvas id="performanceChart"></canvas>
          </div>
        </article>

        <article class="card">
          <div class="row-between">
            <h2>Arena Skill Radar</h2>
            <div class="label">Today's Stats</div>
          </div>
          <div class="chart-wrap radar-wrap">
            <canvas id="skillRadarChart"></canvas>
          </div>
          <div class="stats-line mini">
            <span>Discipline: <strong id="radarDiscipline">0%</strong></span>
            <span>Endurance: <strong id="radarEndurance">0%</strong></span>
          </div>
        </article>
      </div>
`;
