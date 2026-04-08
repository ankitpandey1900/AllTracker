/**
 * HTML template for the Share Card preview popup.
 */
export const shareModal = `
  <div class="modal share-modal" id="sharePreviewModal" style="z-index: 1000; display: none;">
    <div class="modal-content" style="max-width: 650px; background: #09090b; padding: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
        <div class="modal-header" style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-family: 'Tektur'; font-size: 1.2rem; letter-spacing: 2px;">SHARE YOUR PROGRESS</h2>
            <button id="closeSharePreviewBtn" class="modal-close" style="position: static;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 25px;">
            <div id="shareImageContainer" style="width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); background: #111;">
                <!-- Image will be injected here -->
            </div>
            
            <div class="share-actions-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 25px;">
                <button id="shareNativeBtn" class="btn btn-primary" style="padding: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; background: #2563eb; border: none;">
                    <span>Share Moment</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </button>
                <button id="downloadShareBtn" class="btn btn-ghost" style="padding: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <span>Download PNG</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
            </div>
            
            <p style="text-align: center; color: #71717a; font-size: 0.75rem; margin-top: 20px; font-weight: 500;">
              Tip: Long-press or right-click the image to copy directly to clipboard.
            </p>
        </div>
    </div>
  </div>
`;
