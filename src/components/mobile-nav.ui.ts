export const mobileNav = `
  <nav class="mobile-nav show-mobile">
    <button class="mobile-nav-item active" data-target="dashboardPane">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span>Home</span>
    </button>
    <button class="mobile-nav-item" data-target="routinePane">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
      </svg>
      <span>Habits</span>
    </button>
    
    <div class="mobile-nav-fab-container">
      <button id="mobileNavStartTimerBtn" class="mobile-fab">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="6 3 20 12 6 21 6 3"/>
        </svg>
      </button>
    </div>

    <button class="mobile-nav-item" data-target="tasksPane">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m19.07 4.93-14.14 14.14"/>
      </svg>
      <span>Missions</span>
    </button>
    <button class="mobile-nav-item" data-target="intelligencePane">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
      </svg>
      <span>Maamu</span>
    </button>
  </nav>
`;
