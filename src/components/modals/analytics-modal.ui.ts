/**
 * HTML template for the Analytics popup.
 */
export const analyticsModal = `
  <div class="modal" id="analyticsModal">
    <div class="modal-content wide" style="max-width: 1000px">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <h2>Analytics</h2>
          <select id="analyticsTimeFilter" class="settings-input" style="width: auto; padding: 4px 10px; height: 28px; font-size: 0.8rem; background: rgba(13, 22, 45, 0.8);">
            <option value="21">Last 21 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="120">Last 120 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <button id="closeAnalyticsModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="grid-2">
          <article class="card">
            <div class="row-between">
              <h2>Study Output Trends</h2>
            </div>
            <div class="chart-wrap">
              <canvas id="studyTrendChart"></canvas>
            </div>
          </article>
          <article class="card">
            <div class="row-between">
              <h2>Subject Focus</h2>
            </div>
            <div class="chart-wrap radar-wrap">
              <canvas id="subjectRadarChart"></canvas>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
`;
