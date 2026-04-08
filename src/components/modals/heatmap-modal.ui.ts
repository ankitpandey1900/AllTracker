/**
 * The Heatmap visualization modal.
 */
export const heatmapModal = `
  <div class="modal" id="heatmapModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="row-between w-full">
          <h2>Study Heatmap</h2>
          <div class="row" style="gap: 15px; margin-right: 40px">
            <select id="heatmapYearSelect" class="btn small" style="
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  color: #fff;
                ">
              <option value="2025">2025</option>
              <option value="2026" selected>2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
        <button id="closeHeatmapModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="heatmap-matrix-hub">
          <!-- KPI Row -->
          <div class="heatmap-kpi-row">
            <div class="kpi-card">
              <div class="label">Total Study Days</div>
              <div id="heatmapModalStudyDays" class="value">0</div>
            </div>
            <div class="kpi-card highlight">
              <div class="label">Daily Average</div>
              <div class="value">
                <span id="heatmapModalAvgHours">0</span>h
              </div>
            </div>
            <div class="kpi-card shadow-gold">
              <div class="label">Best Performance</div>
              <div id="heatmapModalBestDay" class="value small-txt">-</div>
            </div>
          </div>

          <!-- Grid Row -->
          <div class="heatmap-grid-area">
            <div class="heatmap-scroll-viewport">
              <div id="heatmapModalMonths" class="heatmap-months"></div>
              <div id="heatmapModalGrid" class="heatmap-grid centered-grid"></div>
            </div>
          </div>

          <!-- Legend Footer -->
          <div class="heatmap-legend-footer">
            <div class="legend-content">
              <span>Less</span>
              <div class="heatmap-cell" data-level="0"></div>
              <div class="heatmap-cell" data-level="1"></div>
              <div class="heatmap-cell" data-level="2"></div>
              <div class="heatmap-cell" data-level="3"></div>
              <div class="heatmap-cell" data-level="4"></div>
              <div class="heatmap-cell" data-level="5"></div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
