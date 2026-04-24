# THE MASTER MAP: COMPLETE REPO TREE 🗺️🏗️

This is the entire "DNA" of AllTracker. I’ve mapped out every single file so you know exactly where the bones are buried. No more guessing.

---

## 📂 THE FULL RECURSIVE TREE

```text
AllTracker/
├── api/                       # THE CLOUD (Vercel Serverless Backend)
│   ├── app/                   # App-specific endpoints (Sessions, Tasks, Profile)
│   ├── auth/                  # Better Auth OAuth endpoints
│   └── _lib/                  # Shared backend logic and Database patterns
├── docs/                      # THE MANUALS (Where you are now)
│   ├── engineering/           # Empty for now (Legacy)
│   ├── development.md         # The Hacker's Blueprint
│   ├── guide.md               # The Pilot's Survival Guide
│   └── structure.md           # This file (The Master Map)
├── public/                    # THE ASSETS (Logos, Icons, and MP3s)
│   ├── logo.png               # The face of the app
│   ├── interstellar.mp3       # The mood
│   └── manifest.json          # PWA configuration
├── src/                       # THE FRONTEND (The Heart of the App)
│   ├── main.ts                # THE ORCHESTRATOR (App Entry Point)
│   ├── vite-env.d.ts          # Global types for Vite
│   ├── core/                  # THE HEART (Lifecycle & System logic)
│   │   ├── app-ignition.ts    # The Spark (Auth check & data hydration)
│   │   ├── command-center.ts  # The CNS (Global events & navigation)
│   │   └── mission-pulse.ts   # The Heartbeat (12s Sync loop)
│   ├── features/              # THE MUSCLE (Specific App Pillars)
│   │   ├── dashboard/         # Leaderboard, Analytics, and Particles
│   │   ├── intelligence/      # Maamu AI (Prompts, Math, and Chat)
│   │   ├── timer/             # Focus sessions & Midnight Split logic
│   │   ├── tracker/           # The 120-day categorical grid
│   │   ├── tasks/             # Priority-based task management
│   │   ├── routines/          # Habit tracking and 14-day trends
│   │   └── layout/            # The Shell and persistent UI
│   ├── services/              # THE NERVES (Data & API Gatekeepers)
│   │   ├── data-bridge.ts     # The Gatekeeper (Local-First sync)
│   │   ├── groq.service.ts    # The AI Uplink (Maamu's brain)
│   │   ├── vault.service.ts   # The Registry (Mapping data to API)
│   │   ├── auth.service.ts    # The Identity Guard (OAuth management)
│   │   └── api.service.ts     # The Resilient Uplink (Fetch wrapper)
│   ├── components/            # THE FRAGMENTS (Shared UI Modals)
│   │   └── modals/            # 15+ specialized UI overlays
│   ├── state/                 # THE MEMORY (App State)
│   │   └── app-state.ts       # Single Source of Truth
│   ├── styles/                # THE SKIN (Modular CSS)
│   │   ├── themes/            # Chanakya, Ayodhya, and Default themes
│   │   └── components/        # Feature-specific styles (Intelligence, Modal, etc.)
│   ├── types/                 # THE DNA (TypeScript Definitions)
│   └── utils/                 # THE TOOLS (Math, Date, and Security helpers)
├── index.html                 # The mounting point for the SPA
├── vercel.json                # Deployment configuration
└── package.json               # Dependencies and build scripts
```

---

## 🏗️ THE STRUCTURAL LOGIC

1.  **Pure TypeScript**: I skipped the heavy frameworks. We use Vanilla TS for near-zero memory footprint and total control over the DOM.
2.  **Logic + UI Split**: In `src/features/`, you'll notice `feature.ts` handles the math/state, while `feature.ui.ts` handles the HTML. Never mix them.
3.  **Local-First Sync**: We save to `localStorage` first (instant), then the **Data Bridge** pushes it to the cloud in the background.
4.  **The Service Hierarchy**: 
    - `api.service` = Low-level Fetch.
    - `vault.service` = Data Mapping.
    - `data-bridge` = Sync Orchestration.

---

**This map is the ground truth. Use it to navigate the grind.** 🚀
