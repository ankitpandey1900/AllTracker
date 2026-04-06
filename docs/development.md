# All Tracker: Development Blueprints

Welcome to the engineering hub of **All Tracker**. This document outlines our core design patterns, security protocols, and data integrity standards.

## 🏛️ Module SOP (Standard Operating Procedure)

Every feature in the `src/features/` directory must follow the **Logic + UI** separation:

1.  **`featureName.ts`**: The "Brain." Contains business logic, state management, and side-effect initializers.
2.  **`featureName.ui.ts`**: The "Skin." Contains only the static HTML `view` strings and simple template helpers.
3.  **Refusal of Mixed Files**: Never put substantial DOM manipulation logic directly inside a `.ui.ts` file.

## 🏺 Zenith Vault (Security Protocol)

To ensure privacy and professional-grade security, all sensitive keys (Groq API, Sync ID) are **never** stored in plain text.

- **Masking**: Use `v1_esc_` prefixed masking before saving to `localStorage`.
- **Bridge**: Always pipe persistence through `src/services/data-bridge.ts`.
- **Logic**: Use `src/utils/security.ts` for the Base64 hydration/dehydration routines.

## 🌓 Midnight Crossover Logic (SOP)

All Tracker uses the **"Absolute Accuracy" (Midnight Split)** approach for sessions that cross calendar days.

- **The Split**: If a session starts at 11:30 PM and ends at 12:30 AM, the system mathematically splits the 60 minutes: 30m are logged to Day 1, and 30m are logged to Day 2.
- **Note Sync**: The session note (message) is duplicated to both days so your project context remains intact across the date boundary.
- **Why?**: This ensures that your "Daily Hours" bars and "Heatmap" remain biologically accurate.

## 📂 Core File Map

| Path | Purpose |
| :--- | :--- |
| `src/main.ts` | The Orchestrator. Bootstraps all modules and event listeners. |
| `src/state/app-state.ts` | The Single Source of Truth. Global reactive state object. |
| `src/components/ui-registry.ts` | The UI Hub. Handles all dynamic HTML injection. |
| `src/services/data-bridge.ts` | The Gatekeeper. Manages persistence and security masking. |

## 🚀 Building & Releasing

- Always run `npm run build` to verify tree-shaking and asset minification.
- Ensure `package.json` versioning is updated before a repository push.
