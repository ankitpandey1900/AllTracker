export const breakModalView = `
  <div id="breakModal" class="modal">
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2 style="font-family: 'Tektur', sans-serif;">Take a Break</h2>
        <button id="closeBreakModal" class="btn-icon" aria-label="Close" title="Cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="modal-body" style="padding-top: 10px;">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px;">
          Log your interruption to keep track of your focus blocks.
        </p>
        
        <div class="break-tags" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
          <button class="btn btn-outline break-tag-btn" data-reason="Food">🥪 Food</button>
          <button class="btn btn-outline break-tag-btn" data-reason="Bathroom">🚻 Bathroom</button>
          <button class="btn btn-outline break-tag-btn" data-reason="Hydration">💧 Hydration</button>
          <button class="btn btn-outline break-tag-btn" data-reason="Distraction">📱 Distraction</button>
          <button class="btn btn-outline break-tag-btn" data-reason="Rest">🧘 Rest</button>
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label for="breakReasonInput">Or type a custom reason</label>
          <input type="text" id="breakReasonInput" class="input" placeholder="e.g. Phone Call..." maxlength="30" />
        </div>

        <button id="startBreakBtn" class="btn btn-primary glow-primary" style="width: 100%;">Start Break</button>
      </div>
    </div>
  </div>
`;
