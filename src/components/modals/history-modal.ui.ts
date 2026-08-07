/**
 * Session History Modal — Professional v4 (Theme-aware & Mobile-first)
 */
export const historyModal = `
  <style>
    #historyModal {
      /* Base Theme Variables - Mockup Exact Colors */
      --sh-accent: #3b82f6; /* Soft blue */
      --sh-bg: #121212; /* Dark flat background */
      --sh-header-bg: #121212;
      --sh-border: #27272a; /* Zinc 800 */
      --sh-card-bg: rgba(255,255,255,0.03);
      --sh-hover: rgba(255,255,255,0.02);
      --sh-text: #fafafa;
      --sh-text-muted: #a1a1aa;
      
      box-sizing: border-box;
    }
    #historyModal * { box-sizing: border-box; }

    @keyframes shRowFade {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .sh-row { 
      opacity: 0;
      animation: shRowFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
    }

    /* ════════════════════════════════════════════════
       MODAL SHELL
    ════════════════════════════════════════════════ */
    #historyModal .modal-content.wide {
      width: min(1080px, 95vw) !important;
      max-width: 95vw !important;
      max-height: 90vh !important;
      background: var(--sh-bg) !important;
      border: 1px solid var(--sh-border) !important;
      border-radius: 12px !important;
      box-shadow: 0 32px 80px rgba(0,0,0,0.8) !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    #historyModal .modal-header {
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 20px 24px 16px 24px !important;
      background: var(--sh-bg) !important;
      border-bottom: 1px solid var(--sh-border) !important;
    }
    #historyModal .modal-header h2 {
      font-size: 1.1rem !important;
      font-weight: 600 !important;
      color: var(--sh-text) !important;
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
      border-color: color-mix(in srgb, var(--sh-accent) 50%, transparent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--sh-accent) 10%, transparent);
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
      color: var(--sh-text);
    }

    /* ════════════════════════════════════════════════
       STATS BAR
    ════════════════════════════════════════════════ */
    #sh-stats-bar {
      display: none;
      align-items: stretch;
      gap: 16px;
      padding: 16px 24px;
      background: var(--sh-bg);
      border-bottom: 1px solid var(--sh-border);
    }
    .sh-stat-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
    }
    .sh-stat-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      color: var(--sh-text-muted);
    }
    .sh-stat-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sh-stat-val {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--sh-text);
      font-variant-numeric: tabular-nums;
    }
    .sh-stat-lbl {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--sh-text-muted);
    }
    .sh-stat-range { font-size: 0.8rem; }

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
    .sh-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--sh-accent) 25%, transparent); border-radius: 4px; }

    /* ════════════════════════════════════════════════
       DESKTOP: CSS GRID — 6 columns
    ════════════════════════════════════════════════ */
    .sh-row {
      display: grid;
      grid-template-columns: 24% 20% 12% 18% 16% 10%;
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
      background: var(--sh-header-bg);
      border-bottom: 1px solid var(--sh-border);
    }
    .sh-col-header .sh-row > div {
      padding: 12px 14px;
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      color: var(--sh-text-muted);
      white-space: nowrap;
    }
    .sh-col-header .sh-row > div:first-child { padding-left: 28px; }

    /* Date group row */
    .sh-date-row {
      cursor: pointer;
      background: transparent;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      user-select: none;
    }
    .sh-date-row:hover { background: rgba(255,255,255,0.015); }
    .sh-date-row > div { padding: 14px; }
    .sh-date-row > div:first-child { padding-left: 20px; }

    .sh-date-label { display: flex; align-items: center; gap: 12px; }
    .sh-chevron-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px; height: 24px;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--sh-border);
      border-radius: 6px;
      color: var(--sh-text-muted);
      cursor: pointer;
    }
    .sh-chevron-icon { transition: transform 0.2s; }
    .sh-date-row.open .sh-chevron-icon { transform: rotate(90deg); }
    
    .sh-date-icon-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      color: var(--sh-text-muted);
    }
    .sh-date-stack { display: flex; flex-direction: column; gap: 2px; }
    .sh-date-primary { font-size: 0.9rem; font-weight: 600; color: var(--sh-text); }
    .sh-date-secondary { font-size: 0.75rem; color: var(--sh-text-muted); font-weight: 400; }
    .sh-date-sessions-label {
      font-size: 0.8rem; font-weight: 400;
      color: var(--sh-text-muted);
      display: flex; flex-direction: column; gap: 2px;
    }
    .sh-break-label { font-size: 0.75rem; color: var(--sh-accent); opacity: 0.9; }

    /* Session row */
    .sh-session-row {
      background: rgba(255,255,255,0.01);
      border-bottom: 1px solid rgba(255,255,255,0.02);
      transition: background 0.15s;
    }
    .sh-session-row > div {
      padding: 12px 14px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sh-session-row > div:first-child { padding-left: 28px; display: flex; align-items: center; gap: 16px; overflow: visible !important; text-overflow: clip !important; }
    
    .sh-dot {
      width: 6px; height: 6px; border-radius: 50%;
      flex-shrink: 0;
    }
    .sh-session-num { 
      font-size: 0.85rem; font-weight: 500; color: var(--sh-text);
      display: flex; align-items: center; gap: 14px;
    }
    .sh-break-badge {
      font-size: 0.7rem; font-weight: 600;
      color: var(--sh-accent);
    }
    .sh-time { font-size: 0.8rem; color: var(--sh-text-muted); font-variant-numeric: tabular-nums; }
    .sh-time-sep { margin: 0 4px; }
    .sh-duration { font-size: 0.9rem; }
    .sh-category { font-size: 0.8rem; color: var(--sh-text-muted); }
    .sh-note {
      font-size: 0.8rem; color: var(--sh-text-muted);
      white-space: normal !important; /* Allow note text to wrap */
      overflow: visible !important;
      text-overflow: clip !important;
      line-height: 1.4;
      padding-right: 24px; /* Add breathing room before actions column */
    }
    .sh-note.empty { opacity: 0.5; }

    /* ── Action buttons ─────────────────────────────── */
    .sh-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-end;
      padding-right: 14px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .sh-session-row:hover .sh-actions { opacity: 1; }
    .sh-btn-edit, .sh-btn-delete {
      background: none;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 3px 7px;
      transition: all 0.15s;
      line-height: 1;
    }
    .sh-btn-edit { color: #a5b4fc; }
    .sh-btn-edit:hover { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.4); color: #fff; }
    .sh-btn-delete { color: #f87171; }
    .sh-btn-delete:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #fff; }

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

      .sh-row { width: auto !important; }

      .sh-scroll {
        padding-bottom: 90px !important; /* Offset for bottom nav bar */
      }

      /* Hide desktop column header */
      .sh-col-header { display: none !important; }

      /* Stats bar 2x2 grid on mobile */
      #sh-stats-bar {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        padding: 12px 16px !important;
        gap: 8px !important;
      }
      .sh-stat-card {
        padding: 10px 12px !important;
        gap: 10px !important;
      }
      .sh-stat-icon-wrapper {
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
      }
      .sh-stat-icon-wrapper svg { width: 16px !important; height: 16px !important; }
      .sh-stat-val { font-size: 0.85rem !important; }
      .sh-stat-lbl { font-size: 0.65rem !important; }
      .sh-stat-range { font-size: 0.75rem !important; }

      /* All rows switch to grid: none → block-based cards */
      .sh-date-row.sh-row { display: flex !important; }

      /* DATE GROUP ROW — full-width banner card */
      .sh-date-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px !important;
        margin: 12px 12px 0 !important;
        border-radius: 12px !important;
        border: 1px solid var(--sh-border) !important;
      }
      .sh-date-row > div { padding: 0 !important; }
      
      /* Hide empty cells on mobile date rows */
      .sh-date-row > div:nth-child(4),
      .sh-date-row > div:nth-child(5),
      .sh-date-row > div:nth-child(6) { display: none !important; }

      /* SESSION DETAIL ROW — full info card */
      .sh-session-row {
        display: none;
        margin: 6px 12px 0 20px !important;
        padding: 14px 16px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255,255,255,0.06) !important;
        background: rgba(255,255,255,0.02) !important;
      }
      .sh-session-row.expanded { display: block !important; }
      .sh-session-row:hover {
        background: rgba(255,255,255,0.04) !important;
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
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        color: var(--sh-text) !important;
        margin-bottom: 6px !important;
        padding-left: 0 !important;
        gap: 10px !important;
      }
      /* Time range — second line */
      .sh-session-row > div:nth-child(2) {
        font-size: 0.85rem !important;
        color: var(--sh-text-muted) !important;
      }
      /* Duration — third line */
      .sh-session-row > div:nth-child(3) {
        text-align: left !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        margin: 8px 0 !important;
      }
      /* Category */
      .sh-session-row > div:nth-child(4) {
        font-size: 0.8rem !important;
      }
      /* Notes */
      .sh-session-row > div:nth-child(5) {
        padding-left: 0 !important;
        font-size: 0.75rem !important;
        margin-top: 4px !important;
      }

      /* last session row bottom margin */
      .sh-session-row:last-child { margin-bottom: 16px !important; }

      .sh-note { padding-left: 0 !important; }

      /* Hide actions column on mobile, show as full-width row */
      .sh-actions {
        opacity: 1 !important;
        justify-content: flex-end !important;
        padding: 12px 0 0 0 !important;
        border-top: 1px solid rgba(255,255,255,0.05) !important;
        margin-top: 8px !important;
      }
    }

    /* ════════════════════════════════════════════════
       SMALL MOBILE ≤380px
    ════════════════════════════════════════════════ */
    @media (max-width: 380px) {
      #historyModal .modal-header { padding: 14px 16px !important; }
      .sh-filter-bar { 
        padding: 10px 12px !important; 
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .sh-filter-group { justify-content: space-between !important; }
      #clearHistoryFilter { margin-top: 8px !important; margin-left: 0 !important; }
      .sh-filter-sep { display: none !important; }
      
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
        <div class="sh-scroll">
          <div class="sh-filter-bar">
            <div class="sh-filter-group">
              <label for="sh-from-date">From</label>
              <input type="date" id="sh-from-date">
            </div>
            <div class="sh-filter-group">
              <label for="sh-to-date">To</label>
              <input type="date" id="sh-to-date">
            </div>
            <button id="clearHistoryFilter">Clear Filter</button>
          </div>
          <div id="sh-stats-bar" style="display:none;"></div>
          <div id="historyMigrationBanner" style="display:none;"></div>
          <div class="sh-col-header">
            <div class="sh-row">
              <div>Date</div>
              <div>Time</div>
              <div>Duration</div>
              <div>Subject</div>
              <div>Notes</div>
              <div></div>
            </div>
          </div>
          <div id="recentSessionsBody"></div>
        </div>
      </div>
    </div>
  </div>
`;
