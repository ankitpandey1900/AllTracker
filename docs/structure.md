# All Tracker: Repository Architecture

Welcome to the internal map of **All Tracker**. This document details our folder organization and file-level responsibilities.

## 📂 Project Hierarchy

```text
Tracker/
├── docs/                      # Blueprints & Guides
│   ├── development.md        # SOP & Design Patterns
│   ├── structure.md          # This Map
│   └── guide.md              # User Manual
├── src/
│   ├── components/            # UI Architecture
│   │   ├── modals/           # Generic Modal Fragments
│   │   ├── hud.ui.ts         # Tactical Focus Overlays
│   │   └── ui-registry.ts    # The Injection Engine (UI Hub)
│   ├── features/              # Modular Pillars
│   │   ├── dashboard/        # Stats, XP & Rank Logic
│   │   ├── tasks/            # Mission Control (Logic + UI)
│   │   │   ├── tasks.ts      # [SOP] Core logic
│   │   │   └── tasks.ui.ts   # [SOP] UI Template
│   │   ├── routines/         # Daily Tracker & Reset Logic
│   │   │   ├── routines.ts   # [SOP] 
│   │   │   └── routines.ui.ts # [SOP]
│   │   ├── intelligence/     # Maamu AI (Logic Separation)
│   │   │   ├── intelligence.ts # API & Session Logic
│   │   │   └── intelligence.ui.ts # UI Template
│   │   ├── timer/            # Focus Mode & Midnight Split
│   │   └── settings/         # Vault Access & UI Prefs
│   ├── services/              # Core Logic Gatekeepers
│   │   ├── auth.service.ts   # Login & Sync Management
│   │   ├── data-bridge.ts    # The Persistence Vault
│   │   └── groq.service.ts   # AI Brain Connection
│   ├── state/                 # Single Source of Truth
│   ├── styles/                # Global Design System
│   └── main.ts                # Application Entry Point
├── index.html                 # The Global Frame
└── package.json               # Engine Configuration
```

## 🏗️ Structural Logic

1.  **Component Hub**: All UI fragments are dynamically injected into `#modal-root` or specific `#pane` containers via `ui-registry.ts`.
2.  **Logic First**: We never import HTML into logic files (except strings in `.ui.ts`). Logic files (`.ts`) should remain pure and testable.
3.  **Naming Convention**: Feature folders use **plural** names (`tasks/`, `routines/`), and their primary files follow the folder name (`tasks.ts`, `tasks.ui.ts`).
4.  **Dynamic Hybrid Loading**: Persistence is handled via a **Local-First** approach. The app renders from `localStorage` immediately, while `data-bridge.ts` orchestrates an asynchronous, differential background sync with Supabase.
