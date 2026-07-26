/**
 * The Bottom Navigation for Mobile devices.
 */
export const mobileNav = `
  <nav class="mobile-nav show-mobile">
    <button class="mobile-nav-item active" data-target="dashboardPane">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span>Home</span>
    </button>
    <button class="mobile-nav-item" data-target="worldStagePane">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20M2 12h20"/><path d="m4.93 4.93 14.14 14.14M19.07 4.93 4.93 19.07"/>
      </svg>
      <span>Arena</span>
    </button>
  </nav>
`;
