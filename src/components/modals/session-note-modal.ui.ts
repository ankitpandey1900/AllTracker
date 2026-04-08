/**
 * The Modal for adding notes to a timer session.
 */
export const sessionNoteModal = `
  <div id="sessionNoteModal" class="modal">
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px; color: var(--accent-blue);">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span class="gradient-text">Mission Reflection</span>
        </h2>
      </div>
      <div class="modal-body">
        <p class="reflection-sub">What did you accomplish in this tactical session?</p>
        <textarea id="sessionNoteInput" class="cell-input reflection-textarea"
          placeholder="e.g., Completed 5 DSA problems on Graphs..."></textarea>
        <div class="modal-actions" style="display: flex; gap: 12px; margin-top: 10px;">
          <button id="saveSessionNoteBtn" class="btn btn-primary glow-blue" style="flex: 2;">
            Secure Reflection
          </button>
          <button id="skipSessionNoteBtn" class="btn btn-ghost"
            style="flex: 1; border: 1px solid rgba(255,255,255,0.1); color: #94a3b8;">
            Skip
          </button>
        </div>
      </div>
    </div>
  </div>
`;
