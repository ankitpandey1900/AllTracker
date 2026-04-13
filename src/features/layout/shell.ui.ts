/**
 * The Shell UI Templates
 * 
 * Defines the persistent frame (Header, Nav, View Containers)
 */

export const shellView = `
  <header id="appHeader" class="app-header backdrop-blur-md">
    <div class="brand-group">
      <img src="/logo.png" alt="All Tracker Logo: High-Performance Study Management" class="app-logo" title="All Tracker — Home">
      <div class="brand" role="heading" aria-level="2">ALL TRACKER</div>
    </div>
    <div class="header-actions">
      <button id="startTimerBtn" class="btn btn-primary" title="Start Focus Timer" aria-label="Start study focus timer">Start Timer</button>
      <div id="headerDesktopActions" class="header-desktop-actions" style="display: flex; gap: 8px;">
        <button id="userManualBtn" class="btn" title="Open User Manual" aria-label="View documentation and user guide">User Manual</button>
        <button id="settingsBtn" class="btn" title="App Settings" aria-label="Configure display and sync settings">Settings</button>
      </div>
      <button id="headerMoreBtn" class="btn btn-ghost show-mobile" style="padding: 8px; border-radius: 8px;" title="More Options" aria-label="Open mobile navigation menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      <div id="headerRight">
        <!-- Auth state is handled dynamically by auth.service.ts -->
      </div>
    </div>
  </header>

  <main class="layout mx-auto">
    <nav class="tabs" role="tablist" aria-label="Main Navigation">
      <button class="nav-item active" data-target="dashboardPane" role="tab" aria-selected="true" title="View Dashboard" aria-label="Open study dashboard">Dashboard</button>
      <button class="nav-item" data-target="routinePane" role="tab" aria-selected="false" title="View Routines" aria-label="Open routine habits tracker">Routine</button>
      <button class="nav-item" data-target="tasksPane" role="tab" aria-selected="false" title="View Tasks" aria-label="Open mission task board">Tasks</button>
      <button class="nav-item" data-target="intelligencePane" role="tab" aria-selected="false" title="Ask Maamu AI" aria-label="Open Maamu AI study mentor">Maamu</button>
      <button class="nav-item" data-target="bookmarksPane" role="tab" aria-selected="false" title="View Bookmarks" aria-label="Open resource bookmark vault">Bookmarks</button>
      <button id="excalidrawToggle" class="nav-item" style="margin-left: auto; display: flex; align-items: center; gap: 6px;" title="Toggle Canvas" aria-label="Open or close Excalidraw sketching canvas">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        Canvas
      </button>
    </nav>

    <div id="drawSection" style="display: none; height: 600px"></div>

    <!-- View Panes: Content is injected dynamically by ui-registry.ts -->
    <section id="dashboardPane" class="view-pane active" aria-label="Study Dashboard"></section>
    <section id="routinePane" class="view-pane" aria-label="Routine Tracker"></section>
    <section id="tasksPane" class="view-pane" aria-label="Task Missions"></section>
    <section id="intelligencePane" class="view-pane" aria-label="Maamu AI Intelligence"></section>
    <section id="bookmarksPane" class="view-pane" aria-label="Bookmarks Vault"></section>
  </main>

  <div id="modal-root"></div>
`;
