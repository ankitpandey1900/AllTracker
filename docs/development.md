# All Tracker: Development Blueprints

Welcome to the engineering hub of **All Tracker**. This document outlines our core design patterns, security protocols, and data integrity standards.

## 🏛️ Module SOP (Standard Operating Procedure)

Every feature in the `src/features/` directory must follow the **Logic + UI** separation:

1.  **`featureName.ts`**: The "Brain." Contains business logic, state management, and side-effect initializers.
2.  **`featureName.ui.ts`**: The "Skin." Contains only the static HTML `view` strings and simple template helpers.
3.  **Refusal of Mixed Files**: Never put substantial DOM manipulation logic directly inside a `.ui.ts` file.

## 🏺 Secure Sync Protocol (V3 Architecture)

To ensure maximum reliability and professional-grade security, All Tracker uses a **Vercel-hosted Backend architecture**.

- **API Uplink**: The frontend communicates exclusively through secure `/api/` routes. No sensitive database credentials or Supabase SDK objects are exposed to the client.
- **Better Auth Integration**: Identity is managed via the **Better Auth** framework, supporting secure Google/GitHub OAuth sessions.
- **Local-First Sync**: Functions in `data-bridge.ts` must return local data immediately from `localStorage`. Synchronization with the cloud happens asynchronously via `performBackgroundSync()`.
- **Granular Payload Mapping**: The `vault.service.ts` maps individual feature objects to server endpoints to ensure partial updates and data isolation.

## 🌓 Midnight Crossover Logic (SOP)

All Tracker uses the **"Absolute Accuracy" (Midnight Split)** approach for sessions that cross calendar days.

- **The Split**: If a session starts at 11:30 PM and ends at 12:30 AM, the system mathematically splits the 60 minutes: 30m are logged to Day 1, and 30m are logged to Day 2.
- **Note Sync**: The session note (message) is duplicated to both days so your project context remains intact across the date boundary.

## ⚡ Performance & Hydration SOP

To maintain an "Elite" user experience, all modules adhere to the **Optimized SPA** pattern:

- **Differential Syncing**: Background sync checks timestamps to only pull or push data when a delta is detected, minimizing network overhead.
- **Dynamic Imports**: Heavy libraries (e.g., `Chart.js`) are only imported via `await import()` inside the relevant execution block.
- **Resource Shielding**: Safety guards like `Chart.getChart(canvas)` are used to prevent instance collision during rapid view swaps.

## 📂 Core File Map

| Path | Purpose |
| :--- | :--- |
| `src/main.ts` | The Orchestrator. Bootstraps all modules and event listeners. |
| `src/state/app-state.ts` | The Single Source of Truth. Global reactive state object. |
| `src/services/data-bridge.ts` | The Gatekeeper. Manages local persistence and sync orchestration. |
| `src/services/api.service.ts` | The Uplink. Secure fetch wrapper for backend communication. |
| `src/services/vault.service.ts` | The Registry. Maps feature data to backend endpoints. |
| `src/services/auth.service.ts` | The Identity Gate. Manages Better Auth session state. |

## 🚀 Building & Releasing

- Always run `npm run build` to verify tree-shaking and asset minification.
- Ensure `.env` contains valid `DATABASE_URL` and Auth credentials before production build.
