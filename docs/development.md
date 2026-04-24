# HACKER'S GUIDE: THE ENGINEERING OF ALLTRACKER 🛠️

Welcome to the internal blueprints. I built AllTracker with a very specific set of rules to keep it fast, secure, and easy to scale. If you're contributing, here’s how I think about the code.

---

## 🏛️ HOW TO BUILD A FEATURE (LOGIC + UI)

Every feature in the `src/features/` folder is split into two parts. Don't mix them.

1.  **`featureName.ts` (The Brain)**: This is where the logic lives. State updates, API calls, and calculations go here.
2.  **`featureName.ui.ts` (The Skin)**: This is just for HTML strings and simple template helpers. Keep it static.
3.  **The Rule**: Don't put heavy DOM logic in the `.ui.ts` file. It makes debugging a nightmare.

## 🏺 THE DATA FLOW (LOCAL-FIRST)

I wanted the app to feel instant. That’s why we use the **Local-First Sync Protocol.**

- **Save Fast**: When a user saves something, it hits `localStorage` immediately.
- **Sync in the Background**: The `data-bridge.ts` then handles the cloud sync asynchronously.
- **The Backend**: We use Vercel Serverless functions for the API. No direct database calls from the frontend—it’s more secure that way.

## ⚡ STATE MANAGEMENT (NO FRAMEWORKS)

I skipped React/Vue because I wanted zero bloat. I built a simple **Proxy-based state engine** instead.

- **Subscriptions**: If a component needs to update when data changes, use `subscribeToState`.
- **Immutability**: When you update an array (like tasks), don't just push to it. Re-assign the whole array (e.g., `appState.tasks = [...appState.tasks, newTask]`). This triggers the Proxy and keeps the UI in sync.

## 🛡️ RESILIENCY (WHEN THE NET IS DOWN)

I built the `api.service.ts` to be tough. 
- **Retries**: If a cloud request fails, it automatically retries with an exponential backoff.
- **Offline Mode**: If the user is offline, the app keeps working on local data. Sync will pick up whenever they're back online.

## 🏗️ THE DATA AUTHORITY (RECONCILIATION)

To keep the global rankings accurate, I use a three-way check:
1.  **The Cloud**: The `study_sessions` table is the ultimate truth.
2.  **The Leaderboard**: The `profiles` table stores the total hours for fast ranking. I re-aggregate this on the backend whenever a session changes to prevent "stat-drift."
3.  **The HUD**: The local state patches itself based on session changes so the user sees their XP increase instantly.

## 📂 WHERE IS EVERYTHING?

| Path | Purpose |
| :--- | :--- |
| `src/main.ts` | The Orchestrator. The first file that runs. |
| `src/state/app-state.ts` | The single source of truth for the app. |
| `src/services/data-bridge.ts` | The Gatekeeper for all saving/loading. |
| `src/services/api.service.ts` | The secure fetch wrapper. |

---

## 🚀 PUSHING CODE

- Always run `npm run build` before you push. It catches errors and minifies the code.
- Make sure your `.env` is set up with valid credentials.

**Keep it fast. Keep it clean.** 🚀
