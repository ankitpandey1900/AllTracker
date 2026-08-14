/**
 * The Weekly Progress view modal.
 */
export const weeklyModal = `
  <div class="modal" id="weeklyModal">
    <div class="modal-content wide">
      <div class="modal-header" style="position: relative; display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 24px 16px 24px; border-bottom: none;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--wm-accent);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <h2 style="text-transform: uppercase; letter-spacing: 1.5px; font-size: 1.1rem; margin: 0; font-weight: 800; color: var(--wm-text);">Weekly Summary</h2>
          </div>
          <div style="font-size:0.85rem; color:var(--wm-text-muted); font-weight:500;">Your focus overview for the week</div>
        </div>
        <div style="display:flex; align-items:center; gap: 12px;">
          <button id="exportWeeklyBtn" class="sh-btn-edit" style="display:flex; align-items:center; gap:6px; padding:6px 12px; font-size:0.75rem; font-weight:700; color:var(--wm-text); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius:8px; cursor: pointer; transition: all 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button id="closeWeeklyModal" class="modal-close" style="position: static; margin: 0; padding: 4px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">&times;</button>
        </div>
      </div>
      <div id="weeklySummaryContent" class="modal-body"></div>
    </div>
  </div>
`;
