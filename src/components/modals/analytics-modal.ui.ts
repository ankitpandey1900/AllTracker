/**
 * HTML template for the Analytics popup.
 */
export const analyticsModal = `
  <div class="modal" id="analyticsModal">
    <div class="modal-content wide" style="max-width: 1000px">
      <div class="modal-header">
        <h2>Analytics</h2>
        <button id="closeAnalyticsModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="grid-2">
          <article class="card">
            <div class="row-between">
              <h2>Study Output Trends</h2>
              <div class="label" id="studyTrendLabel">Last 21 Days</div>
            </div>
            <div class="chart-wrap">
              <canvas id="studyTrendChart"></canvas>
            </div>
          </article>
          <article class="card">
            <div class="row-between">
              <h2>Subject Focus</h2>
              <div class="label" id="subjectRadarLabel">Last 21 Days</div>
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
