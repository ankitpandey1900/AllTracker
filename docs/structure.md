# All Tracker: Repository Architecture

Welcome to the internal map of **All Tracker**. This document details our folder organization and file-level responsibilities.

## 📂 Project Hierarchy

```text
Tracker/
├── api/                       # Vercel Serverless Backend (Node.js)
├── docs/                      # Blueprints & User Guides
├── server/                    # Shared Server Utilities & DB Logic
├── arena-pilots/              # Contributor Records & Templates
├── public/                    # Static Assets (Logo, Fonts)
├── src/
│   ├── core/                  # Core Constants & Lifecycle Logic
│   ├── components/            # UI Architecture (Shared Modals & Fragments)
│   ├── features/              # Feature Dedicated Pillars
│   │   ├── layout/            # Persistent Shell & Shell UI
│   │   ├── dashboard/         # Leaderboard & Performance HUD
│   │   ├── tasks/             # Priority-based Task Management
│   │   ├── routines/          # Daily Habit Tracking
│   │   ├── profile/           # Identity & World Stage Broadcasts
│   │   ├── timer/             # Focus Mode & Heartbeat logic
│   │   ├── settings/          # Local Configuration & AI Key Management
│   │   ├── notifications/     # Browser-based Alert Engine
│   │   ├── intelligence/      # Maamu AI (Groq Integration)
│   │   └── bookmarks/         # Tactical Link Vault
│   ├── services/              # Core Logic Gatekeepers (API, Auth, Data Bridge)
│   ├── state/                 # Single Source of Truth (App State)
│   ├── utils/                 # Calculation, Security, & Formatting Helpers
│   ├── main.ts                # Application Bootstrapper
│   └── index.css              # Global Design System
├── index.html                 # The Thin Shell (Mounting Point)
├── vercel.json                # Vercel Deployment Configuration
└── package.json               # Engine Configuration & Dependencies
```

## 🏗️ Structural Logic

1.  **Monolithic Vanilla TS**: No heavy frameworks (React/Vue). We use high-performance Vanilla TypeScript for near-zero memory footprint and maximum control over the DOM.
2.  **API-Driven Sync**: The frontend is detached from the database. All persistence happens via secure REST communication with the `api/` directory.
3.  **Local-First Hydration**: The app renders from `localStorage` immediately on boot. `data-bridge.ts` then performs a non-blocking background sync with the Vercel backend.
4.  **Feature Encapsulation**: Each folder in `src/features/` is a self-contained pillar with its own logic (`.ts`) and UI templates (`.ui.ts`).
5.  **Design System**: Global styling is maintained in `index.css` using CSS Variables, ensuring the "Neon Space" aesthetic is consistent across all components.
