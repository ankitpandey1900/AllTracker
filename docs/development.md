# All Tracker: Development Blueprints

Welcome to the engineering hub of **All Tracker**. This document outlines our core design patterns, security protocols, and data integrity standards.

## 🏛️ Module SOP (Standard Operating Procedure)

Every feature in the `src/features/` directory must follow the **Logic + UI** separation:

1.  **`featureName.ts`**: The "Brain." Contains business logic, state management, and side-effect initializers.
2.  **`featureName.ui.ts`**: The "Skin." Contains only the static HTML `view` strings and simple template helpers.
3.  **Refusal of Mixed Files**: Never put substantial DOM manipulation logic directly inside a `.ui.ts` file.

## 🏺 Granular Vault (Security Protocol)

To ensure maximum reliability and professional-grade security, All Tracker transition from a single JSON blob to a **Granular Service Schema**.

- **Dedicated Vaults**: Every major feature has its own dedicated table (e.g., `vault_tracker`, `vault_tasks`, `vault_routines`).
- **Identity Registry**: User metadata is stored in `operative_profiles`, while performance metrics live in `operative_stats`.
- **Encryption**: Sensitive field keys are masked using `v1_esc_` or `v2_enc_` logic before local persistence.
- **Bridge**: Always pipe persistence through `src/services/data-bridge.ts`.
- **Cloud-Dominant**: Supabase is the absolute source of truth. Local storage is treated as a transient performance cache.

## 🌓 Midnight Crossover Logic (SOP)

All Tracker uses the **"Absolute Accuracy" (Midnight Split)** approach for sessions that cross calendar days.

- **The Split**: If a session starts at 11:30 PM and ends at 12:30 AM, the system mathematically splits the 60 minutes: 30m are logged to Day 1, and 30m are logged to Day 2.
- **Note Sync**: The session note (message) is duplicated to both days so your project context remains intact across the date boundary.
- **Why?**: This ensures that your "Daily Hours" bars and "Heatmap" remain biologically accurate.

## ⚡ Performance & Hydration SOP

To maintain an "Elite" user experience on mobile and slow networks, all modules must adhere to the **Optimized SPA** pattern:

- **Local-First Hydration**: Functions in `data-bridge.ts` must return local data immediately. Cloud synchronization must happen asynchronously via `performBackgroundSync()`.
- **Dynamic Imports**: Heavy libraries (e.g., `Chart.js`, `html2canvas`) must never be imported at the top-level. Use `await import()` inside the relevant execution block to keep the initial bundle small.
- **🛡️ Resource Shielding**: When rendering async-dependent UI elements (like Canvas charts), always use safety guards like `Chart.getChart(canvas)` to prevent instance collision and memory leaks.

## 📂 Core File Map

| Path | Purpose |
| :--- | :--- |
| `src/main.ts` | The Orchestrator. Bootstraps all modules and event listeners. |
| `src/state/app-state.ts` | The Single Source of Truth. Global reactive state object. |
| `src/components/ui-registry.ts` | The UI Hub. Handles all dynamic HTML injection. |
| `src/services/data-bridge.ts` | The Gatekeeper. Manages local persistence and sync orchestration. |
| `src/services/supabase.service.ts` | The Cloud Uplink. Direct interface with Supabase Granular Vaults. |
| `src/services/auth.service.ts` | The Identity Gate. Manages MFA patterns and session keys. |

## 🚀 Building & Releasing

- Always run `npm run build` to verify tree-shaking and asset minification.
- Ensure `package.json` versioning is updated before a repository push.
