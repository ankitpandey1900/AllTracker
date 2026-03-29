<div align="center">
  <h1>🌌 All Tracker — Eternity Edition</h1>
  <p><strong>The ultimate, data-driven command center for mastering development, routines, and deep focus.</strong></p>
</div>

---

## 🎯 Overview

**All Tracker (Eternity Edition)** is a premium, highly-modular web application engineered to transform your programming and learning journey into a quantifiable, immersive experience. Configured for a **354-day focus sprint** (January 13, 2026 – December 31, 2026), it merges habit tracking, advanced data visualization, deep-work timers, and cloud synchronization into a single, cohesive dashboard featuring a "Neon Space" glassmorphic aesthetic.

---

## 🚀 Core Features

### 1. 📊 The Pinnacle Dashboard & Study Log
- **Bento-Grid Command Center:** A meticulously centered, sleek dashboard tracking your real-time total hours, completion percentage, active streaks, and Study Heatmap.
- **Dynamic Rank & World Standing:** Automatically calculates your XP (100 XP/hr) and assigns you 10 dynamic Tiers. It also projects your **Absolute World Ranking** (from #40,000,000 down to #1) to visualize your global climb.
- **Intelligent Feedback Loop:** Displays live, dynamic messages that taunt you if you are falling behind your pacing schedule or praise your discipline when you pull ahead.
- **Interactive Daily Tracker:** A massive, searchable main table to log daily hours across customizable columns (e.g., Python, DSA, Project), Topics, and Problems Solved.

### 2. 🦾 Mission Control (Daily Tasks)
- **Granular Milestone Tracking:** Manage specific daily study objectives (e.g., "Complete React Hooks Lec") that sit outside your recurring routines.
- **24-Hour Backlog System:** Incomplete tasks are automatically shifted into a dedicated **Backlog** after 24 hours, ensuring no objective is ever forgotten.
- **Auto-Cleanup Engine:** To keep your dashboard high-performance, completed tasks in the history are automatically purged after 3 days.

### 3. 🧠 Dual-Metric Analytics Engine
- **Study Output Trends:** Interactive Line Charts plotting your Study Hours against Problems Solved over a 21-day moving window.
- **Arena Skill Radar:** Multi-dimensional Radar Charts mapping out your Focus, Discipline, Output, Endurance, and Subject Versatility.
- *Analytics are integrated into both the Dashboard and the Routine check-in panes, utilizing Chart.js.*

### 3. 🎯 Deep Focus HUD & Timer
- **Immersion Mode:** A distraction-free modal timer with session logging, automated break calculations, and dynamic background animations to keep you locked in.
- **Session History:** Automatically logs your completed focus sessions (Date, Category, Duration) directly to the Cloud/Local Storage.

### 4. 📝 Routine Command Center
- **Premium Checklist:** A sleek daily habit tracker featuring native glassmorphic checkboxes, hover-reveal actions, and real-time completion tracking (dimming text & strike-throughs).
- **Daily Performance Chart:** Visualizes your consistency against your target output for immediate accountability.

### 5. 📚 Integrated Bookmark Vault
- **Actionable Repository:** Save your essential learning links, organized by technical category tags (e.g., Frontend, Backend, Tooling, Docs).
- **Category Filtering:** Quickly isolate and retrieve relevant resources using the new interactive Category Filter Pills.

### 6. ☁️ Architecture & Data Synchronization
- **Zero-Latency State:** Utilizes a custom global `appState` pattern with zero framework overhead.
- **Hybrid Storage:** Combines millisecond-fast browser `localStorage` with bulletproof cloud synchronization via **Supabase**.
- **Data Portability:** Full support for bulk Data Import/Export using both structured JSON and CSV formats.

---

## 📂 Project Architecture & File Structure

The project was completely re-architected from a massive monolithic `script.js` into a highly maintainable, component-driven **TypeScript** structure securely orchestrated via **Vite**.

```text
📦 all-tracker
 ┣ 📂 public/              # Static assets and icons
 ┣ 📂 src/                 # Application Source Code
 ┃ ┣ 📂 config/            # Constants, Configs, Rank Definitions, Targets
 ┃ ┣ 📂 features/          # Modularized Component Logic
 ┃ ┃ ┣ 📂 bookmarks/       # Bookmark Vault (Filtering & Rendering)
 ┃ ┃ ┣ 📂 dashboard/       # Main Dashboard UI, Rank/XP calculation, and Study Analytics
 ┃ ┃ ┣ 📂 deadline/        # Countdown timer logic
 ┃ ┃ ┣ 📂 export/          # JSON and CSV export serializers
 ┃ ┃ ┣ 📂 heatmap/         # GitHub-style activity contribution graphs
 ┃ ┃ ┣ 📂 import/          # File parsing and data restoration logic
 ┃ ┃ ┣ 📂 routines/        # Routine checklist UI + Radar/Performance Chart Engines
 ┃ ┃ ┣ 📂 settings/        # App Configuration, Cloud Keys, Custom Column mapping
 ┃ ┃ ┣ 📂 shortcuts/       # Global Keyboard Interceptors + Quick Entry Modal
 ┃ ┃ ┣ 📂 tasks/           # Mission Control (Daily tasks & Backlog logic)
 ┃ ┃ ┣ 📂 timer/           # Focus HUD logic, setInterval engines, session tracking
 ┃ ┃ ┗ 📂 tracker/         # Core 354-day Table generation & Search engines
 ┃ ┣ 📂 services/          # External APIs & Storage
 ┃ ┃ ┣ 📜 auth.service.ts  # Sync ID handling & initialization
 ┃ ┃ ┣ 📜 data-bridge.ts   # Local Storage interceptors & serializers
 ┃ ┃ ┗ 📜 supabase.service.ts # Cloud synchronization logic
 ┃ ┣ 📂 state/             # Global Application Memory
 ┃ ┃ ┗ 📜 app-state.ts     # The central Source of Truth (AppState interface)
 ┃ ┣ 📂 styles/            # CSS Architecture
 ┃ ┃ ┣ 📂 components/      # Specific layout files (dashboard.css, base.css, etc.)
 ┃ ┃ ┗ 📜 main.css         # CSS Entry point importing all modules
 ┃ ┣ 📂 types/             # TypeScript Type Definitions (.d.ts)
 ┃ ┣ 📂 utils/             # Helper Functions
 ┃ ┃ ┣ 📜 date.utils.ts    # Date math & formatting
 ┃ ┃ ┗ 📜 dom.utils.ts     # DOM manipulation & Toast notification helpers
 ┃ ┣ 📜 main.ts            # Application Entry Point & Bootstrapper
 ┃ ┗ 📜 vite-env.d.ts      # Vite type declarations
 ┣ 📜 index.html           # Main markup structure (Single Page Application)
 ┣ 📜 package.json         # Build scripts & dependencies (Vite, TypeScript, Chart.js)
 ┣ 📜 tsconfig.json        # TypeScript compiler configuration
 ┗ 📜 README.md            # This documentation file
```

---

## 🎨 UI/UX & Aesthetics

- **Eternity Arena Theme:** A meticulously curated deep "neon space" aesthetic heavily reliant on `#0a0f1e` backgrounds intersected with `#6c87ff` (Blue) and `#25bd84` (Green) neon assertions.
- **Glassmorphism:** Generous use of translucent, backdrop-blurred cards combined with sub-pixel white borders `rgba(255, 255, 255, 0.05)` to establish depth and hierarchy.
- **Precision Typography:**
  - **Headers & Technical Data:** [Tektur](https://fonts.google.com/specimen/Tektur) for an aggressive, futuristic edge.
  - **Grids & Paragraphs:** [Outfit](https://fonts.google.com/specimen/Outfit) for unparalleled readability during long study sessions.

---

## ⚙️ Tech Stack & Setup

**Core Dependencies:**
- Vanilla HTML5 + CSS3 (No bulky UI components—100% bespoke CSS design system).
- TypeScript for type safety and intelligence.
- [Vite](https://vitejs.dev/) for instantaneous HMR and optimized building.
- [Chart.js](https://www.chartjs.org/) for data visualization.
- [Supabase](https://supabase.com/) for PostgreSQL backend and edge-function syncing.

### Local Development Setup
1. **Clone & Install:**
   ```bash
   git clone https://github.com/ankitpandey1900/Tracker.git
   cd all-tracker
   npm install
   ```
2. **Setup Cloud Credentials (Optional but Recommended):**
   - Create a `.env` file in the root based on `.env.example`.
   - Add your Supabase `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Launch the Engine:**
   ```bash
   npm run dev
   ```
   The commanding dash will be available at `http://localhost:5173`.
4. **Compile to Production:**
   ```bash
   npm run build
   ```

---

*“To achieve the impossible, you must measure the unseen.”* — Welcome to the Eternity Edition.
