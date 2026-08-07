/**
 * The Badges collection modal.
 */
export const badgesModal = `
  <div class="modal" id="badgesModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="modal-header-titles">
          <h2>Earned Badges</h2>
          <p class="modal-subtitle">Celebrate your progress and achievements</p>
        </div>
        <button id="closeBadgesModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div id="badgeGrid" class="badge-grid"></div>
      </div>
      <div class="modal-footer" style="text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-light);">
        Keep going! More badges, more growth.
      </div>
    </div>
  </div>
`;
