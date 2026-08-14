/**
 * HTML template for the Analytics popup.
 */
export const analyticsModal = `
  <div class="modal" id="analyticsModal">
    <div class="modal-content wide" style="max-width: 1000px">
      <div class="modal-header" style="position: relative; display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 24px 16px 24px; border-bottom: none;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--wm-accent, #3b82f6);"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <h2 style="text-transform: uppercase; letter-spacing: 1.5px; font-size: 1.1rem; margin: 0; font-weight: 800; color: var(--wm-text, #f1f6ff);">Analytics</h2>
          </div>
          <select id="analyticsTimeFilter" class="settings-input" style="width: auto; padding: 4px 10px; height: 32px; font-size: 0.8rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; cursor: pointer; color: var(--text-primary);">
            <option value="21">Last 21 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="120">Last 120 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <button id="closeAnalyticsModal" class="modal-close" style="position: static; margin: 0; padding: 4px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">&times;</button>
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
