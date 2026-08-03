/**
 * The Shell UI Templates
 * 
 * Defines the persistent frame (Header, Nav, View Containers)
 */

export const shellView = `
  <header id="appHeader" class="app-header backdrop-blur-md">
    <div class="brand-group" style="flex-shrink: 0; display: flex; align-items: center; gap: 32px;">
      <img src="/app-logo.png" alt="All Tracker Logo: High-Performance Study Management" class="app-logo" title="All Tracker — Home">
      
      <!-- Navigation Tabs next to Logo -->
      <nav class="header-nav-tabs" role="tablist" style="display: flex; gap: 12px;">
        <button class="nav-item active" data-target="dashboardPane" role="tab" aria-selected="true" title="View Dashboard" aria-label="Open study dashboard">Dashboard</button>
        <button class="nav-item" data-target="worldStagePane" role="tab" aria-selected="false" title="View Global Leaderboard" aria-label="Open global leaderboard">World Stage</button>
        <button class="nav-item" data-target="roadmapPane" role="tab" aria-selected="false" title="View Strategy Roadmap" aria-label="Open strategy roadmap">Roadmap</button>
        <button class="nav-item" data-target="tasksPane" role="tab" aria-selected="false" title="View Tasks" aria-label="Open mission task board">Tasks</button>
      </nav>
    </div>

    <!-- Pushes the right actions all the way to the right -->
    <div style="flex: 1;"></div>

    <div class="header-actions" style="flex-shrink: 1; min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 16px; white-space: nowrap;">
      
      <!-- Canvas toggle (Tool) -->
      <button id="excalidrawToggle" class="btn btn-ghost hide-mobile" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px; font-weight: 500;" title="Toggle Canvas" aria-label="Open or close sketching canvas">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        Canvas
      </button>

      <div class="header-divider" style="width: 1px; height: 24px; background: rgba(255,255,255,0.15); border-radius: 1px; margin: 0 8px;"></div>

      <!-- Core Action -->
      <button id="startTimerBtn" class="btn btn-primary" style="padding: 8px 24px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px;" title="Start Focus Timer" aria-label="Start study focus timer">Start Timer</button>
      
      <div id="headerDesktopActions" class="header-desktop-actions">
        <button class="btn nav-item" data-target="routinePane" title="View Routines" aria-label="Open routine habits tracker">Routine</button>
        <button class="btn nav-item" data-target="feedPane" title="Arena Feed" aria-label="Open arena feed">Feed</button>
        <button class="btn nav-item" data-target="intelligencePane" title="Ask Maamu AI" aria-label="Open Maamu AI">Maamu</button>
        <button class="btn nav-item" data-target="bookmarksPane" title="View Bookmarks" aria-label="Open bookmarks">Bookmarks</button>
        <button id="userManualBtn" class="btn" title="Open User Manual" aria-label="View documentation and user guide">User Manual</button>
        <button id="settingsBtn" class="btn" title="App Settings" aria-label="Configure display and sync settings">Settings</button>
      </div>

      <!-- Overflow Menu (3-dots) -->
      <button id="headerMoreBtn" class="btn btn-ghost" style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; padding: 0; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);" title="More Options" aria-label="Open mobile navigation menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      <div class="header-divider" style="width: 1px; height: 24px; background: rgba(255,255,255,0.15); border-radius: 1px; margin: 0 8px;"></div>

      <!-- Auth State -->
      <div id="headerRight" style="display: flex; align-items: center; flex-shrink: 1; min-width: 0;">
        <!-- Auth state is handled dynamically by auth.service.ts -->
      </div>
    </div>
  </header>

  <main class="layout mx-auto">
    <!-- Main layout now begins directly with content panes, no extra tab row needed -->

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
    <section id="worldStagePane" class="view-pane" aria-label="World Stage Leaderboard"></section>
    <section id="roadmapPane" class="view-pane" aria-label="Strategy Roadmap"></section>
    <section id="routinePane" class="view-pane" aria-label="Routine Tracker"></section>
    <section id="tasksPane" class="view-pane" aria-label="Task Missions"></section>
    <section id="feedPane" class="view-pane" aria-label="Arena Feed"></section>
    <section id="intelligencePane" class="view-pane" aria-label="Maamu AI Intelligence"></section>
    <section id="bookmarksPane" class="view-pane" aria-label="Bookmarks Vault"></section>
  </main>

  <footer class="app-footer" style="text-align: center; padding: 2rem 1rem; color: #6b7280; font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 2rem;">
    <div style="display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 0.5rem;">
      <a href="/privacy.html" style="color: #818cf8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#a5b4fc'" onmouseout="this.style.color='#818cf8'">Privacy Policy</a>
      <a href="/terms.html" style="color: #818cf8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#a5b4fc'" onmouseout="this.style.color='#818cf8'">Terms &amp; Conditions</a>
    </div>
    <p>&copy; ${new Date().getFullYear()} All Tracker. All rights reserved.</p>
  </footer>

  <div id="modal-root"></div>
`;
