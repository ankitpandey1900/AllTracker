# All Tracker: Repository Architecture

Welcome to the internal map of **All Tracker**. This document details our folder organization and file-level responsibilities.

## 📂 Project Hierarchy

```text
Tracker/
├── docs/                      # Blueprints & Guides
│   ├── development.md        # SOP & Design Patterns
│   ├── structure.md          # This Map
│   └── guide.md              # User Manual
├── public/                    # Static Assets
│   └── css/                  # Boot-critical styles (loader.css)
├── src/
│   ├── core/                  # Engine Foundation
│   ├── components/            # UI Architecture (Shared Fragments)
│   │   ├── modals/           # Dedicated Auth, Profile, & Stats Fragments
│   │   └── ui-registry.ts    # The Injection Engine (Feature Loader)
│   ├── features/              # Feature Dedicated Pillars
│   │   ├── layout/           # Persistent Shell (Header, Tabs, View Panes)
│   │   ├── dashboard/        # HUD, Stats, XP & World Stage
│   │   ├── tasks/            # Mission Control (Granular Vault)
│   │   ├── routines/         # Daily Habit Tracker (Granular Vault)
│   │   ├── profile/          # Identity Registry (Avatar & Handle Logic)
│   │   ├── timer/            # Focus Mode & Supabase Heartbeat
│   │   └── settings/         # Operational Configuration
│   ├── services/              # Core Logic Gatekeepers
│   │   ├── supabase.service.ts # The Granular Cloud Uplink
│   │   ├── auth.service.ts   # MFA & Sync ID Management
│   │   ├── data-bridge.ts    # Sync Persistence & Mirroring
│   │   └── identity.service.ts # Migration Logic (Legacy Sync ID)
│   ├── state/                 # Single Source of Truth
│   ├── utils/                 # Calculation & Security Helpers
│   └── main.ts                # Application Bootstrapper
├── index.html                 # The Thin Shell (Mounting Point)
└── package.json               # Engine Configuration
```

## 🏗️ Structural Logic

1.  **Thin Shell Architecture**: `index.html` is a minimal entry point containing only metadata, the bootloader, and the `#app-root` mounting point.
2.  **Persistent Layout Shell**: The `features/layout` module (Shell.ts) is the first feature to initialize. It renders the Header, Navigation Tabs, and persistent View Containers dynamically.
3.  **UI Registry (Hydration)**: All feature-specific HTML fragments are dynamically injected into the containers created by the Shell via `ui-registry.ts`.
4.  **Logic First**: We never import HTML into logic files (except strings in `.ui.ts`). Logic files (`.ts`) should remain pure and testable.
5.  **Naming Convention**: Feature folders use **plural** names (`tasks/`, `routines/`), and their primary files follow the folder name (`tasks.ts`, `tasks.ui.ts`).
6.  **Dynamic Hybrid Loading**: Persistence is handled via a **Local-First** approach. The app renders from `localStorage` immediately, while `data-bridge.ts` orchestrates an asynchronous, differential background sync with Supabase.
