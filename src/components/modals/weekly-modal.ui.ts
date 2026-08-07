/**
 * The Weekly Progress view modal.
 */
export const weeklyModal = `
  <div class="modal" id="weeklyModal">
    <div class="modal-content wide">
      <div class="modal-header" style="position: relative; justify-content: center; padding-top: 24px; padding-bottom: 24px; border-bottom: none;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--wm-accent);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <h2 style="text-transform: uppercase; letter-spacing: 1px; font-size: 1.2rem; margin: 0; font-weight: 800;">Weekly Summary</h2>
            <button id="exportWeeklyBtn" class="sh-btn-edit" style="display:flex; align-items:center; gap:6px; padding:4px 10px; font-size:0.75rem; font-weight:600; color:var(--wm-text); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius:6px; margin-left: 4px; cursor: pointer; transition: all 0.2s;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
          <div style="font-size:0.85rem; color:var(--wm-text-muted); font-weight:600;">Your focus overview for the week</div>
        </div>
        <button id="closeWeeklyModal" class="modal-close" style="position: absolute; right: 24px; top: 24px;">&times;</button>
      </div>
      <div id="weeklySummaryContent" class="modal-body"></div>
    </div>
  </div>
`;
