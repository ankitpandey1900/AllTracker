/**
 * HTML template for the Share Card preview popup.
 */
export const shareModal = `
  <div class="modal share-modal" id="sharePreviewModal" style="z-index: 1000; display: none;">
    <div class="modal-content" style="max-width: 650px; max-height: 95vh; background: #09090b; padding: 0; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;">
        <div class="modal-header" style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #09090b; z-index: 20;">
            <h2 id="shareModalTitle" style="font-family: 'Tektur'; font-size: 1.1rem; letter-spacing: 2px;">SHARE YOUR PROGRESS</h2>
            <button id="closeSharePreviewBtn" class="modal-close" style="position: static;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 20px 25px 25px; flex: 1;">
            <!-- Theme Selection -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
              <div id="customBriefingTrigger" style="font-size: 0.7rem; font-weight: 800; color: #60a5fa; cursor: pointer; letter-spacing: 1px; text-decoration: underline;">CUSTOM QUOTE</div>
            </div>

            <!-- Custom Text Input (Hidden by default) -->
            <div id="customTextContainer" style="display: none; margin-bottom: 20px;">
              <textarea id="customBriefingInput" placeholder="Type your custom briefing here..." style="width: 100%; background: #000; border: 1px solid #27272a; border-radius: 8px; color: #fff; padding: 12px; font-family: inherit; font-size: 0.9rem; resize: vertical; min-height: 60px;" maxlength="250"></textarea>
              <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <button id="applyCustomTextBtn" class="btn btn-ghost" style="font-size: 0.7rem; padding: 4px 12px;">Apply Changes</button>
              </div>
            </div>

            <div id="shareImageContainer" style="width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); background: #111; position: relative;">
                <!-- Image will be injected here -->
                <div id="shareLoadingOverlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 10; font-family: 'Tektur'; font-size: 0.8rem; letter-spacing: 2px; color: #60a5fa;">RE-GENERATING ASSETS...</div>
            </div>
            
            <div class="share-actions-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px;">
                <button id="copyShareBtn" class="btn btn-ghost" style="padding: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; border-color: rgba(96, 165, 250, 0.3);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Copy</span>
                </button>
                <button id="shareNativeBtn" class="btn btn-primary" style="padding: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; border: none; font-size: 0.85rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    <span>Share</span>
                </button>
                <button id="downloadShareBtn" class="btn btn-ghost" style="padding: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>PNG</span>
                </button>
            </div>
            
            <p style="text-align: center; color: #71717a; font-size: 0.7rem; margin-top: 15px; font-weight: 500;">
              Tip: Press **Copy** to paste directly into WhatsApp or Discord.
            </p>
        </div>
    </div>
  </div>
`;
