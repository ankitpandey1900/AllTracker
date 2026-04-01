import { getTacticalBriefing, calculatePeakHourMatrix, type PeakHourMatrixItem } from './intelligence.service';

/** Renders the AI Study Strategist full-view briefing */
export function renderIntelligenceBriefing(): void {
  const body = document.getElementById('intelligenceFullBody');
  if (!body) return;

  const briefing = getTacticalBriefing();
  const matrix = calculatePeakHourMatrix();

  let html = `
    <div class="intel-full-layout">
      <div class="intel-main-briefing">
        <div class="intel-header-row">
          <div class="intel-tags">
            <span class="intel-tag intel-tag-peak">⚡ ${briefing.peakHourStr} PEAK</span>
            <span class="intel-tag intel-tag-momentum">${briefing.momentumLabel}</span>
            ${briefing.vulnerableDay !== 'None' ? `<span class="intel-tag intel-tag-vulnerability">⚠️ ${briefing.vulnerableDay} DROP</span>` : ''}
          </div>
        </div>
        
        <div class="intel-section">
          <div class="intel-label">STRATEGIC CONTEXT</div>
          <ul class="intel-context-list">
            ${briefing.strategicContext.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>

        <div class="intel-insight-hero">
          ${briefing.insight}
        </div>
      </div>

      <div class="intel-visuals">
        <div class="intel-matrix-title">NEURAL PERFORMANCE MATRIX</div>
        <div class="intel-matrix-grid">
          ${matrix.map((m: PeakHourMatrixItem) => `
            <div class="intel-matrix-bar-wrap" title="${m.hourStr}: ${m.duration} mins">
              <div class="intel-matrix-bar" style="height: ${m.percentage}%"></div>
              <span class="intel-matrix-label">${m.hour % 4 === 0 ? m.hour : ''}</span>
            </div>
          `).join('')}
        </div>
        <div class="intel-matrix-footer">Peak activity across 24-hour mission cycle</div>
      </div>
    </div>

    <div class="intel-action-panel">
      <div class="intel-recommendation intel-full">
        <div class="intel-rec-label">MISSION ACTION</div>
        <div class="intel-rec-content">${briefing.recommendation}</div>
      </div>
    </div>
  `;

  body.innerHTML = html;
}
