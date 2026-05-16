/**
 * Premium "Share Quote" Modal
 * 
 * Design references: Linear, Raycast, Calm
 * Features:
 *   - Icon + title + subtitle header
 *   - Card preview area
 *   - Shuffle / Custom controls
 *   - Three action buttons (Copy, Download PNG, Share)
 *   - Helper tip footer
 */
export const shareModal = `
<div class="modal share-modal" id="sharePreviewModal" style="z-index:1000;display:none;">
  <div class="modal-content" id="shareModalContent" style="
    max-width:500px; width:92vw; max-height:95vh;
    background:linear-gradient(180deg,#0c0f17 0%,#0a0c14 100%);
    padding:0; overflow-y:auto; overflow-x:hidden;
    border:1px solid rgba(255,255,255,0.06);
    border-radius:24px;
    display:flex; flex-direction:column;
    box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset;
  ">

    <!-- ─── HEADER ─── -->
    <div style="
      padding:22px 24px; display:flex; justify-content:space-between; align-items:center;
      border-bottom:1px solid rgba(255,255,255,0.04);
      position:sticky; top:0; background:rgba(12,15,23,0.95);
      backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      z-index:20; border-radius:24px 24px 0 0;
    ">
      <div style="display:flex;align-items:center;gap:14px;">
        <!-- Icon -->
        <div style="
          width:44px;height:44px; background:rgba(255,255,255,0.04);
          border-radius:13px; display:flex;align-items:center;justify-content:center;
          border:1px solid rgba(255,255,255,0.06);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.8">
            <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <!-- Title Block -->
        <div>
          <h2 id="shareModalTitle" style="
            font-family:'Outfit',sans-serif; font-size:1rem; font-weight:600;
            color:#f0ede8; margin:0; letter-spacing:0.2px;
          ">Share Quote</h2>
          <p style="font-size:0.73rem; color:#5a5e6b; margin:3px 0 0; font-weight:400;">
            Create beautiful quote images to share.
          </p>
        </div>
      </div>
      <!-- Close -->
      <button id="closeSharePreviewBtn" style="
        width:34px;height:34px; background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.06); border-radius:10px;
        color:#5a5e6b; font-size:1.15rem; cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:background 0.15s;
      ">&times;</button>
    </div>

    <!-- ─── BODY ─── -->
    <div style="padding:20px 24px 24px; flex:1;">

      <!-- CARD PREVIEW -->
      <div id="shareImageContainer" style="
        width:100%; border-radius:16px; overflow:hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
        background:#080e1e; position:relative;
      ">
        <div id="shareLoadingOverlay" style="
          position:absolute;inset:0; background:rgba(8,14,30,0.9);
          display:none;align-items:center;justify-content:center;z-index:10;
          font-family:'Outfit';font-size:0.78rem;letter-spacing:1.5px;color:rgba(200,169,110,0.6);
        ">GENERATING...</div>
      </div>

      <!-- SHUFFLE / CUSTOM ROW -->
      <div style="display:flex;justify-content:center;gap:10px;margin-top:16px;">
        <button id="shuffleQuoteBtn" style="
          font-size:0.7rem; font-weight:600; font-family:'Outfit',sans-serif;
          color:rgba(200,169,110,0.85); cursor:pointer; letter-spacing:0.8px;
          display:flex;align-items:center;gap:7px; padding:9px 18px;
          background:rgba(200,169,110,0.06); border-radius:10px;
          border:1px solid rgba(200,169,110,0.12); transition:all 0.2s;
        ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
            <line x1="4" y1="4" x2="9" y2="9"/>
          </svg>
          Shuffle
        </button>
        <button id="customBriefingTrigger" style="
          font-size:0.7rem; font-weight:600; font-family:'Outfit',sans-serif;
          color:#5a5e6b; cursor:pointer; letter-spacing:0.8px;
          display:flex;align-items:center;gap:7px; padding:9px 18px;
          background:rgba(255,255,255,0.025); border-radius:10px;
          border:1px solid rgba(255,255,255,0.06); transition:all 0.2s;
        ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Custom
        </button>
      </div>

      <!-- CUSTOM TEXT (hidden) -->
      <div id="customTextContainer" style="display:none;margin-top:14px;">
        <textarea id="customBriefingInput" placeholder="Write your own wisdom…" style="
          width:100%; background:rgba(255,255,255,0.025);
          border:1px solid rgba(255,255,255,0.06); border-radius:12px;
          color:#e8e0d4; padding:14px 16px; font-family:'Outfit',sans-serif;
          font-size:0.84rem; resize:vertical; min-height:56px; outline:none;
          transition:border-color 0.2s;
        " maxlength="250"></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button id="applyCustomTextBtn" style="
            font-size:0.7rem; padding:7px 18px; border-radius:10px;
            color:rgba(200,169,110,0.9); background:rgba(200,169,110,0.08);
            border:1px solid rgba(200,169,110,0.15); cursor:pointer;
            font-family:'Outfit',sans-serif; font-weight:600; letter-spacing:0.5px;
          ">Apply</button>
        </div>
      </div>
      <!-- THEME TAB BAR -->
      <div style="
        display:flex; gap:0; margin-top:20px;
        border-bottom:1px solid rgba(255,255,255,0.06);
        overflow-x:auto; -webkit-overflow-scrolling:touch;
      ">
        ${['Theme','Font','Background','Size','Branding'].map((label, i) => {
          const icons = [
            '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20"/>',
            '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
            '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
            '<path d="M21 3H3v18h18V3z"/><path d="M9 3v18"/><path d="M3 9h18"/>',
            '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
          ];
          const isActive = i === 0;
          return `<div style="
            flex:none; padding:11px 16px; display:flex; align-items:center; gap:6px;
            cursor:pointer; font-size:0.72rem; font-weight:500; letter-spacing:0.3px;
            color:${isActive ? 'rgba(200,169,110,0.9)' : '#4a4e5a'};
            border-bottom:2px solid ${isActive ? 'rgba(200,169,110,0.6)' : 'transparent'};
            font-family:'Outfit',sans-serif; white-space:nowrap; transition:color 0.2s;
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.8">${icons[i]}</svg>
            ${label}
          </div>`;
        }).join('')}
      </div>

      <!-- THEME PRESETS -->
      <div id="themePresetsContainer" style="display:flex;gap:10px;margin-top:16px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">
        ${[
          { id:'midnight', name:'Midnight',  bg:'linear-gradient(180deg,#0a1628,#1a2e50,#2a4060)' },
          { id:'paper', name:'Paper',     bg:'linear-gradient(180deg,#f5efe4,#e8dfd0,#d9cfc0)' },
          { id:'warm', name:'Warm Light',bg:'linear-gradient(180deg,#c4a06a,#a07840,#806030)' },
          { id:'forest', name:'Forest',    bg:'linear-gradient(180deg,#1a3a2a,#2a5a3a,#1a4a2a)' },
          { id:'aurora', name:'Aurora',    bg:'linear-gradient(180deg,#1a2a4a,#2a4a5a,#3a6a6a)' },
          { id:'minimal', name:'Minimal',   bg:'linear-gradient(180deg,#f8f8f8,#eaeaea,#d8d8d8)' },
        ].map((t, index) => {
          const isActive = index === 0;
          return `
          <div class="theme-preset-btn" data-theme="${t.id}" style="flex:none;text-align:center;cursor:pointer;">
            <div style="
              width:80px; height:56px; border-radius:10px;
              background:${t.bg}; position:relative;
              border:${isActive ? '2px solid rgba(200,169,110,0.5)' : '1px solid rgba(255,255,255,0.08)'};
              overflow:hidden;
              transition: border 0.2s;
            " class="theme-preset-thumb">
              <div class="theme-active-check" style="position:absolute;bottom:6px;right:6px;width:18px;height:18px;
                background:rgba(200,169,110,0.9);border-radius:50%;display:${isActive ? 'flex' : 'none'};align-items:center;justify-content:center;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#080e1e" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            <div style="font-size:0.62rem;color:${isActive ? '#e8e0d4' : '#4a4e5a'};margin-top:6px;font-family:'Outfit',sans-serif;font-weight:500;" class="theme-preset-name">${t.name}</div>
          </div>
        `}).join('')}
      </div>

      <!-- ACTION BUTTONS -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:20px;">
        <button id="copyShareBtn" style="
          padding:14px 0; font-weight:600; display:flex;align-items:center;justify-content:center;gap:8px;
          font-size:0.78rem; background: var(--bg-tertiary);
          border:1px solid rgba(255,255,255,0.07); border-radius:14px;
          color:#7a7e8a; cursor:pointer; font-family:'Outfit',sans-serif;
          transition:all 0.2s;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Quote
        </button>
        <button id="downloadShareBtn" style="
          padding:14px 0; font-weight:700; display:flex;align-items:center;justify-content:center;gap:8px;
          font-size:0.78rem; background:linear-gradient(135deg,#b8860b,#c9a23a);
          border:none; border-radius:14px; color: var(--text-primary); cursor:pointer;
          font-family:'Outfit',sans-serif;
          box-shadow:0 6px 20px rgba(184,134,11,0.25); transition:all 0.2s;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PNG
        </button>
        <button id="shareNativeBtn" style="
          padding:14px 0; font-weight:600; display:flex;align-items:center;justify-content:center;gap:8px;
          font-size:0.78rem; background: var(--bg-tertiary);
          border:1px solid rgba(255,255,255,0.07); border-radius:14px;
          color:#7a7e8a; cursor:pointer; font-family:'Outfit',sans-serif;
          transition:all 0.2s;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share
        </button>
      </div>

      <!-- TIP -->
      <p style="
        text-align:center; color:#3a3e4a; font-size:0.68rem;
        margin-top:16px; font-weight:400; font-family:'Outfit',sans-serif;
        display:flex;align-items:center;justify-content:center;gap:5px;
      ">
        ✨ Tip: High-quality PNG images look best when shared.
      </p>
    </div>
  </div>
</div>
`;
