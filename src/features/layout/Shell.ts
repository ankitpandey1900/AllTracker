import { shellView } from './shell.ui';
import { log } from '@/utils/logger.utils';

/**
 * Shell Manager
 * 
 * Manages the persistent App Frame (Header, Nav, View Containers).
 * It handles top-level navigation and global UI interactions.
 */
export class Shell {
  private static instance: Shell;
  
  private constructor() {}

  public static getInstance(): Shell {
    if (!Shell.instance) {
      Shell.instance = new Shell();
    }
    return Shell.instance;
  }

  /**
   * Renders the shell into the provided mounting point.
   */
  public init(mountPointId: string = 'app-root'): void {
    const mountPoint = document.getElementById(mountPointId);
    if (!mountPoint) {
      console.error(`Mount point #${mountPointId} not found for Shell.`);
      return;
    }

    mountPoint.innerHTML = shellView;
    this.setupEventListeners();
    log.info('Shell Hub Initialized.', '🐚');
  }

  private setupEventListeners(): void {
    this.setupTabNavigation();
    this.setupMobileMenu();
    this.setupCanvasHub();
  }

  public setupTabNavigation(): void {
    const navItems = document.querySelectorAll(".nav-item[data-target], .mobile-nav-item[data-target]");
    
    // Clear old listeners by cloning (to prevent double-bindings if called twice)
    navItems.forEach((item) => {
      const newItem = item.cloneNode(true) as HTMLElement;
      if (item.parentNode) {
        item.parentNode.replaceChild(newItem, item);
      }
      
      newItem.addEventListener("click", () => {
        const target = newItem.getAttribute("data-target");
        if (!target) return;

        // 1. Update All Nav States
        document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((n) => {
          n.classList.remove("active");
          if (n.getAttribute("data-target") === target) n.classList.add("active");
        });

        // 2. Switch View Panes
        this.switchView(target);

        // 3. Scroll to top on view change
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  /** Switches between application views (Dashboard, Routine, etc) */
  public switchView(viewId: string): void {
    // 🛡️ HUD CLEANUP: Dismiss any active Leaderboard HUDs when switching views
    document.querySelectorAll('.leaderboard-item.force-hud').forEach(el => el.classList.remove('force-hud'));

    const panes = document.querySelectorAll('.view-pane');
    const targetPane = document.getElementById(viewId);
    
    if (!targetPane) return;

    // ⚡ INSTANT FEEDBACK: Premium Scanline Sync
    if (!targetPane.classList.contains('active')) {
      document.body.classList.add("view-glitch-sync");
      targetPane.classList.add("active", "shimmer-pane");
      
      setTimeout(() => {
        targetPane.classList.remove("shimmer-pane");
        document.body.classList.remove("view-glitch-sync");
      }, 400);
    }

    // Deactivate other panes
    panes.forEach(p => { if (p.id !== viewId) p.classList.remove('active'); });

    // 🛰️ DYNAMIC HYDRATION: Trigger feature logic
    this.triggerFeatureRender(viewId);

    // 🔗 PREFETCH NEXT TARGETS: Smart preloading of likely next modules
    this.prefetchModules(viewId);

    // 📡 SEO SYNC: Update tab title and metadata
    this.updateMetadata(viewId);
  }

  private updateMetadata(viewId: string): void {
    const titles: Record<string, string> = {
      'dashboardPane': 'Dashboard | All Tracker',
      'worldStagePane': 'World Stage Arena | All Tracker',
      'routinePane': 'Habit Rituals | All Tracker',
      'tasksPane': 'Mission Control | All Tracker',
      'intelligencePane': 'Maamu AI | All Tracker',
      'bookmarksPane': 'Bookmark Vault | All Tracker',
      'feedPane': 'Arena Feed | All Tracker'
    };
 
    const descriptions: Record<string, string> = {
      'dashboardPane': 'Your elite study performance dashboard.',
      'worldStagePane': 'Compete on the global study leaderboard.',
      'routinePane': 'Manage your DSA and daily coding rituals.',
      'tasksPane': 'Execute your mission-critical tasks.',
      'intelligencePane': 'Get AI-powered study briefings from Maamu AI.',
      'bookmarksPane': 'Your curated library of elite study resources.',
      'feedPane': 'Global study transmissions and learning in public.'
    };

    if (titles[viewId]) document.title = titles[viewId];
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && descriptions[viewId]) {
      metaDesc.setAttribute('content', `${descriptions[viewId]} Built for peak performance.`);
    }
  }

  private prefetchModules(currentId: string): void {
    // If on Dashboard, prefetch Tasks and Routine
    if (currentId === 'dashboardPane') {
      import("@/features/tasks/tasks");
      import("@/features/routines/routines");
    }
  }

  private triggerFeatureRender(target: string): void {
    if (target === "tasksPane") import("@/features/tasks/tasks").then(m => m.renderTasks());
    if (target === "intelligencePane") import("@/features/intelligence/intelligence").then(m => m.renderIntelligenceBriefing());
    if (target === "routinePane") import("@/features/routines/routines").then(m => m.renderRoutine());
    if (target === "worldStagePane") import("@/features/dashboard/leaderboard").then(m => m.initWorldStage());
    if (target === "feedPane") import("@/features/feed/feed.ui").then(m => m.renderFeedView(document.getElementById('feedPane')!));
  }

  private setupMobileMenu(): void {
    const moreBtn = document.getElementById("headerMoreBtn");
    const desktopActions = document.getElementById("headerDesktopActions");
    
    if (moreBtn && desktopActions) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        desktopActions.classList.toggle("mobile-menu-overlay");
      });

      document.addEventListener("click", (e) => {
        if (window.innerWidth <= 768) {
          if (desktopActions && !desktopActions.contains(e.target as Node)) {
            desktopActions.classList.remove("mobile-menu-overlay");
          }
        }
      });
    }
  }

  private setupCanvasHub(): void {
    const canvasToggle = document.getElementById("excalidrawToggle");
    const drawSection = document.getElementById("drawSection");
    const tldrawBtn = document.getElementById("toolSwitchTldraw");
    const excalidrawBtn = document.getElementById("toolSwitchExcalidraw");
    const frameContainer = document.getElementById("canvasFrameContainer");

    const getCanvasUrl = (tool: 'tldraw' | 'excalidraw') => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = isDark ? 'dark' : 'light';
      
      if (tool === 'excalidraw') {
        return `https://excalidraw.com?theme=${theme}`;
      }
      // tldraw often respects system theme automatically if no param, 
      // but we'll try to nudge it with a theme param if supported
      return `https://www.tldraw.com?theme=${theme}`;
    };

    const setTool = (tool: 'tldraw' | 'excalidraw') => {
      if (!frameContainer) return;
      
      // Update Buttons
      tldrawBtn?.classList.toggle('active', tool === 'tldraw');
      excalidrawBtn?.classList.toggle('active', tool === 'excalidraw');

      // Inject Iframe
      frameContainer.innerHTML = `<iframe src="${getCanvasUrl(tool)}" width="100%" height="100%" style="border: none;" frameborder="0"></iframe>`;
    };

    canvasToggle?.addEventListener("click", () => {
      if (!drawSection) return;
      const isHidden = drawSection.style.display === "none" || drawSection.style.display === "";
      
      if (isHidden) {
        if (frameContainer && !frameContainer.querySelector('iframe')) {
          setTool('tldraw'); // Default as requested
        }
        drawSection.style.display = "block";
        canvasToggle.classList.add("active");
        canvasToggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg> Hide Canvas`;
      } else {
        drawSection.style.display = "none";
        drawSection.classList.remove('canvas-hub-fullscreen');
        canvasToggle.classList.remove("active");
        canvasToggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Canvas`;
      }
    });

    let currentTool: 'tldraw' | 'excalidraw' = 'tldraw';
    
    tldrawBtn?.addEventListener('click', () => {
      currentTool = 'tldraw';
      setTool('tldraw');
    });
    excalidrawBtn?.addEventListener('click', () => {
      currentTool = 'excalidraw';
      setTool('excalidraw');
    });

    const refreshBtn = document.getElementById("toolRefresh");
    refreshBtn?.addEventListener('click', () => setTool(currentTool));

    const fullscreenBtn = document.getElementById("toolFullscreen");
    fullscreenBtn?.addEventListener('click', () => {
      drawSection?.classList.toggle('canvas-hub-fullscreen');
    });

    // ⌨️ KEYBOARD SHORTCUTS: ESC to exit Fullscreen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawSection?.classList.contains('canvas-hub-fullscreen')) {
        drawSection.classList.remove('canvas-hub-fullscreen');
      }
    });

    // ↕️ VERTICAL RESIZER LOGIC
    const resizer = document.getElementById("canvasResizer");
    if (resizer && drawSection) {
      let isDragging = false;

      resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.classList.add('dragging-canvas');
        resizer.classList.add('dragging');
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Calculate new height based on mouse position relative to drawSection top
        const rect = drawSection.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        
        if (newHeight > 300 && newHeight < (window.innerHeight - 100)) {
          drawSection.style.height = `${newHeight}px`;
        }
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('dragging-canvas');
        resizer.classList.remove('dragging');
      });
    }
  }
}

export const shell = Shell.getInstance();
