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
      <button class="nav-item" data-target="feedPane" role="tab" aria-selected="false" title="View Feed" aria-label="Open arena feed">Feed</button>
      <button class="nav-item" data-target="intelligencePane" role="tab" aria-selected="false" title="Ask Maamu AI" aria-label="Open Maamu AI study mentor">Maamu</button>
      <button class="nav-item" data-target="bookmarksPane" role="tab" aria-selected="false" title="View Bookmarks" aria-label="Open resource bookmark vault">Bookmarks</button>
      <button id="excalidrawToggle" class="nav-item" style="margin-left: auto; display: flex; align-items: center; gap: 6px;" title="Toggle Canvas" aria-label="Open or close sketching canvas">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        Canvas
      </button>
    </nav>

    <!-- Canvas Hub Section -->
    <div id="drawSection" style="display: none; height: calc(100vh - 200px); min-height: 600px;">
      <div class="canvas-hub-toolbar">
        <button id="toolSwitchTldraw" class="canvas-tool-btn active" title="Switch to tldraw">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
          tldraw (Default)
        </button>
        <button id="toolSwitchExcalidraw" class="canvas-tool-btn" title="Switch to Excalidraw">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          Excalidraw
        </button>

        <div style="margin-left: auto; display: flex; gap: 8px;">
          <button id="toolRefresh" class="canvas-tool-btn" title="Reload Canvas Tool">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          </button>
          <button id="toolFullscreen" class="canvas-tool-btn" title="Toggle Focus Fullscreen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>
          </button>
        </div>
      </div>
      <div id="canvasFrameContainer" style="height: calc(100% - 40px);"></div>
      <div id="canvasResizer" class="canvas-resizer" title="Drag to Resize Height"></div>
    </div>

    <!-- View Panes: Content is injected dynamically by ui-registry.ts -->
    <section id="dashboardPane" class="view-pane active" aria-label="Study Dashboard"></section>
    <section id="routinePane" class="view-pane" aria-label="Routine Tracker"></section>
    <section id="tasksPane" class="view-pane" aria-label="Task Missions"></section>
    <section id="feedPane" class="view-pane" aria-label="Arena Feed"></section>
    <section id="intelligencePane" class="view-pane" aria-label="Maamu AI Intelligence"></section>
    <section id="bookmarksPane" class="view-pane" aria-label="Bookmarks Vault"></section>
  </main>

  <div id="modal-root"></div>
`;
