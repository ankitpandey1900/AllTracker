/**
 * Session History Modal — Professional v3 (Mobile-first responsive)
 */
export const historyModal = `
  <style>
    #historyModal * { box-sizing: border-box; }

    /* ════════════════════════════════════════════════
       MODAL SHELL
    ════════════════════════════════════════════════ */
    #historyModal .modal-content.wide {
      width: min(1080px, 95vw) !important;
      max-width: 95vw !important;
      max-height: 90vh !important;
      background: #070c1a !important;
      border: 1px solid rgba(96,165,250,0.16) !important;
      border-radius: 20px !important;
      box-shadow: 0 0 0 1px rgba(96,165,250,0.06), 0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05) !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    #historyModal .modal-header {
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 16px 22px !important;
      background: linear-gradient(135deg,rgba(96,165,250,0.07) 0%,transparent 60%) !important;
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
    }
    #historyModal .modal-header h2 {
      font-size: 0.72rem !important;
      font-weight: 900 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase !important;
      color: #fff !important;
      margin: 0 !important;
    }
    #historyModal .modal-close {
      background: rgba(255,255,255,0.06) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important;
      color: rgba(255,255,255,0.6) !important;
      width: 30px !important;
      height: 30px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      font-size: 1rem !important;
      transition: all 0.2s !important;
    }
    #historyModal .modal-close:hover {
      background: rgba(255,255,255,0.12) !important;
      color: #fff !important;
    }
    #historyModal .modal-body {
      flex: 1 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 0 !important;
    }

    /* ════════════════════════════════════════════════
       FILTER BAR
    ════════════════════════════════════════════════ */
    .sh-filter-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 20px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .sh-filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sh-filter-bar label {
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
      white-space: nowrap;
    }
    .sh-filter-bar input[type="date"] {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 9px;
      padding: 6px 10px;
      color: #e2e8f0;
      font-size: 0.75rem;
      outline: none;
      color-scheme: dark;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .sh-filter-bar input[type="date"]:focus {
      border-color: rgba(96,165,250,0.5);
      box-shadow: 0 0 0 3px rgba(96,165,250,0.1);
    }
    .sh-filter-sep {
      font-size: 0.6rem;
      font-weight: 800;
      color: rgba(255,255,255,0.2);
      text-transform: uppercase;
    }
    #clearHistoryFilter {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 9px;
      padding: 7px 14px;
      color: rgba(255,255,255,0.6);
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      margin-left: auto;
    }
    #clearHistoryFilter:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }

    /* ════════════════════════════════════════════════
       STATS BAR
    ════════════════════════════════════════════════ */
    #sh-stats-bar {
      display: none;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      padding: 10px 20px;
      background: rgba(96,165,250,0.04);
      border-bottom: 1px solid rgba(96,165,250,0.1);
    }
    .sh-stat {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 2px 20px 2px 0;
    }
    .sh-stat-val {
      font-size: 0.88rem;
      font-weight: 800;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }
    .sh-stat-lbl {
      font-size: 0.55rem;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.3);
    }
    .sh-stat-range { font-size: 0.72rem; }
    .sh-stat-div {
      width: 1px;
      height: 26px;
      background: rgba(255,255,255,0.08);
      margin: 0 20px 0 0;
      flex-shrink: 0;
      align-self: center;
    }

    /* ════════════════════════════════════════════════
       SCROLL CONTAINER
    ════════════════════════════════════════════════ */
    .sh-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }
    .sh-scroll::-webkit-scrollbar { width: 4px; }
    .sh-scroll::-webkit-scrollbar-track { background: transparent; }
    .sh-scroll::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.25); border-radius: 4px; }

    /* ════════════════════════════════════════════════
       DESKTOP: CSS GRID — 5 columns
    ════════════════════════════════════════════════ */
    .sh-row {
      display: grid;
      grid-template-columns: 18% 24% 13% 16% 29%;
      align-items: center;
      width: 100%;
    }
    .sh-child { display: none !important; }
    .sh-child.expanded { display: grid !important; }

    /* Sticky column header */
    .sh-col-header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #0b1121;
      border-bottom: 1px solid rgba(96,165,250,0.18);
    }
    .sh-col-header .sh-row > div {
      padding: 11px 14px;
      font-size: 0.57rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: rgba(96,165,250,0.55);
      white-space: nowrap;
    }
    .sh-col-header .sh-row > div:first-child { padding-left: 22px; }
    .sh-col-header .sh-row > div:nth-child(3) { text-align: right; padding-right: 18px; }

    /* Date group row */
    .sh-date-row {
      cursor: pointer;
      background: rgba(96,165,250,0.042);
      border-top: 1px solid rgba(96,165,250,0.1);
      border-bottom: 1px solid rgba(96,165,250,0.12);
      border-left: 3px solid rgba(96,165,250,0.55);
      transition: background 0.15s;
      user-select: none;
    }
    .sh-date-row:hover { background: rgba(96,165,250,0.09); }
    .sh-date-row > div { padding: 12px 14px; }
    .sh-date-row > div:first-child { padding-left: 20px; }
    .sh-date-row > div:nth-child(3) { text-align: right; padding-right: 18px; }

    .sh-date-label { display: flex; align-items: center; gap: 10px; }
    .sh-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px; height: 20px;
      background: rgba(96,165,250,0.1);
      border: 1px solid rgba(96,165,250,0.25);
      border-radius: 5px;
      font-size: 0.52rem;
      color: rgba(96,165,250,0.8);
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.15s;
      flex-shrink: 0;
    }
    .sh-date-row.open .sh-chevron { transform: rotate(90deg); background: rgba(96,165,250,0.2); }
    .sh-date-stack { display: flex; flex-direction: column; gap: 1px; }
    .sh-date-primary { font-size: 0.88rem; font-weight: 800; color: #fff; }
    .sh-date-secondary { font-size: 0.6rem; color: rgba(255,255,255,0.32); font-weight: 600; }
    .sh-date-sessions-label {
      font-size: 0.62rem; font-weight: 700;
      color: rgba(255,255,255,0.28); letter-spacing: 0.8px; text-transform: uppercase;
    }
    .sh-total-hours { font-size: 0.9rem; font-weight: 800; color: #60a5fa; }

    /* Subject row */
    .sh-subject-row {
      background: rgba(255,255,255,0.018);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      border-left: 3px solid rgba(255,255,255,0.06);
    }
    .sh-subject-row > div { padding: 9px 14px; }
    .sh-subject-row > div:first-child { padding-left: 34px; }
    .sh-subject-row > div:nth-child(3) { text-align: right; padding-right: 18px; }

    .sh-subject-badge {
      display: inline-flex; align-items: center;
      border-radius: 6px; padding: 3px 10px;
      font-size: 0.64rem; font-weight: 800; letter-spacing: 0.8px;
      text-transform: uppercase; border: 1px solid;
    }
    .sh-subject-count { font-size: 0.62rem; color: rgba(255,255,255,0.28); font-weight: 600; margin-left: 8px; }
    .sh-sub-hours { font-size: 0.82rem; font-weight: 700; }

    /* Session row */
    .sh-session-row {
      border-bottom: 1px solid rgba(255,255,255,0.028);
      border-left: 3px solid transparent;
      transition: background 0.12s, border-left-color 0.12s;
    }
    .sh-session-row > div {
      padding: 9px 14px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sh-session-row > div:first-child { padding-left: 48px; }
    .sh-session-row > div:nth-child(3) { text-align: right; padding-right: 18px; overflow: visible; }
    .sh-session-row:hover { background: rgba(96,165,250,0.04); border-left-color: rgba(96,165,250,0.2); }
    .sh-session-row.alt { background: rgba(255,255,255,0.01); }

    .sh-session-num { font-size: 0.68rem; font-weight: 700; color: rgba(255,255,255,0.32); }
    .sh-time { font-size: 0.77rem; color: rgba(255,255,255,0.52); font-variant-numeric: tabular-nums; }
    .sh-time-sep { opacity: 0.3; margin: 0 6px; }

    .sh-duration { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .sh-dur-val { font-size: 0.78rem; font-weight: 700; color: #60a5fa; font-variant-numeric: tabular-nums; }
    .sh-dur-bar { width: 100%; height: 2px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
    .sh-dur-fill { height: 100%; border-radius: 2px; opacity: 0.7; transition: width 0.4s ease; }

    .sh-category { font-size: 0.71rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
    .sh-note {
      font-size: 0.75rem; color: rgba(255,255,255,0.48); font-style: italic;
      padding-left: 14px !important; border-left: 1px solid rgba(255,255,255,0.06);
      overflow: hidden; text-overflow: ellipsis;
    }
    .sh-note.empty { color: rgba(255,255,255,0.18); font-style: normal; }

    /* Empty state */
    .sh-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; padding: 60px 24px; color: rgba(255,255,255,0.25);
    }
    .sh-empty-icon { font-size: 2.5rem; opacity: 0.4; }
    .sh-empty-text { font-size: 0.82rem; font-weight: 500; text-align: center; }

    /* ════════════════════════════════════════════════
       MOBILE ≤640px — Card-based layout
    ════════════════════════════════════════════════ */
    @media (max-width: 640px) {
      #historyModal .modal-content.wide {
        width: 100vw !important;
        max-width: 100vw !important;
        max-height: 92vh !important;
        border-radius: 20px 20px 0 0 !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
      }

      /* Hide desktop column header */
      .sh-col-header { display: none !important; }

      /* Stats bar wraps on mobile */
      #sh-stats-bar {
        padding: 10px 16px !important;
        gap: 8px !important;
      }
      .sh-stat-div { display: none; }
      .sh-stat { padding: 4px 12px 4px 0; }
      .sh-stat-val { font-size: 1rem; }

      /* All rows switch to grid: none → block-based cards */
      /* Specific selector to avoid forcing children to be visible */
      .sh-date-row.sh-row { display: flex !important; }

      /* DATE GROUP ROW — full-width banner card */
      .sh-date-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 14px 16px !important;
        margin: 8px 12px 0 !important;
        border-radius: 12px !important;
        border: 1px solid rgba(96,165,250,0.18) !important;
        border-left: 4px solid rgba(96,165,250,0.55) !important;
      }
      .sh-date-row > div { padding: 0 !important; }
      .sh-date-row > div:nth-child(3) { text-align: right !important; padding: 0 !important; }
      /* Hide empty cells on mobile date rows */
      .sh-date-row > div:nth-child(4),
      .sh-date-row > div:nth-child(5) { display: none !important; }

      /* SUBJECT ROW — sub-card */
      .sh-subject-row {
        display: none;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 10px 16px !important;
        margin: 4px 12px 0 16px !important;
        border-radius: 8px !important;
        border: 1px solid rgba(255,255,255,0.07) !important;
        border-left: 3px solid rgba(96,165,250,0.2) !important;
      }
      .sh-subject-row.expanded { display: flex !important; }
      .sh-subject-row > div { padding: 0 !important; }
      .sh-subject-row > div:nth-child(3) { text-align: right !important; padding: 0 !important; }
      .sh-subject-row > div:nth-child(4),
      .sh-subject-row > div:nth-child(5) { display: none !important; }

      /* SESSION DETAIL ROW — full info card */
      .sh-session-row {
        display: none;
        margin: 4px 12px 0 20px !important;
        padding: 12px 14px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255,255,255,0.06) !important;
        border-left: 3px solid transparent !important;
        background: rgba(255,255,255,0.02) !important;
      }
      .sh-session-row.expanded { display: block !important; }
      .sh-session-row:hover {
        background: rgba(96,165,250,0.06) !important;
        border-left-color: rgba(96,165,250,0.3) !important;
      }
      /* Override grid-cell padding — render as stacked rows */
      .sh-session-row > div {
        display: flex !important;
        align-items: center !important;
        padding: 3px 0 !important;
        overflow: visible !important;
        white-space: normal !important;
      }
      /* Session number — top line, bold */
      .sh-session-row > div:first-child {
        font-size: 0.72rem !important;
        font-weight: 800 !important;
        color: rgba(255,255,255,0.5) !important;
        margin-bottom: 4px !important;
      }
      /* Time range — second line */
      .sh-session-row > div:nth-child(2) {
        font-size: 0.8rem !important;
        color: rgba(255,255,255,0.65) !important;
      }
      /* Duration — third line */
      .sh-session-row > div:nth-child(3) {
        text-align: left !important;
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .sh-dur-bar { width: 80px !important; }
      /* Category */
      .sh-session-row > div:nth-child(4) {
        font-size: 0.75rem !important;
      }
      /* Notes */
      .sh-session-row > div:nth-child(5) {
        border-left: none !important;
        padding-left: 0 !important;
        font-size: 0.75rem !important;
        color: rgba(255,255,255,0.42) !important;
        margin-top: 2px !important;
      }

      /* last session row bottom margin */
      .sh-session-row:last-child { margin-bottom: 12px !important; }

      .sh-note { border-left: none !important; padding-left: 0 !important; }
    }

    /* ════════════════════════════════════════════════
       SMALL MOBILE ≤380px
    ════════════════════════════════════════════════ */
    @media (max-width: 380px) {
      #historyModal .modal-header { padding: 14px 16px !important; }
      .sh-filter-bar { padding: 10px 12px !important; }
      .sh-date-row, .sh-subject-row, .sh-session-row { margin-left: 8px !important; margin-right: 8px !important; }
      .sh-date-primary { font-size: 0.78rem !important; }
    }
  </style>

  <div class="modal" id="historyModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <h2>Session History</h2>
        <button id="closeHistoryModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="sh-filter-bar">
          <div class="sh-filter-group">
            <label for="sh-from-date">From</label>
            <input type="date" id="sh-from-date">
          </div>
          <div class="sh-filter-sep">TO</div>
          <div class="sh-filter-group">
            <label for="sh-to-date">To</label>
            <input type="date" id="sh-to-date">
          </div>
          <button id="clearHistoryFilter">Clear Filter</button>
        </div>
        <div id="sh-stats-bar" style="display:none;"></div>
        <div id="historyMigrationBanner" style="display:none;"></div>
        <div class="sh-scroll">
          <div class="sh-col-header">
            <div class="sh-row">
              <div>Date</div>
              <div>Time</div>
              <div>Duration</div>
              <div>Subject</div>
              <div>Notes</div>
            </div>
          </div>
          <div id="recentSessionsBody"></div>
        </div>
      </div>
    </div>
  </div>
`;
