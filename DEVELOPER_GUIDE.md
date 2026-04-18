# All Tracker: The Titan Engineering Encyclopedia

This is the **exhaustive**, 600+ line technical manual for All Tracker. it documents every major function, logic gate, mathematical algorithm, and design system token within the platform. this is the "Black Box" guide for the "In the Veins" developer.

---

## 🏛️ System Design Blueprint

```mermaid
graph TD
    subgraph "The Frontend (Vite + TS)"
        UI[Shell UI & Custom Feature Panes]
        Proxy[appState Proxy Reactive Engine]
        EventEmitter[Event Bus / Path Subscribers]
        Bridge[Data Bridge Persistence Layer]
        Storage[(Browser LocalStorage Cache)]
        Worker[PWA Service Worker]
        Transitions[GPU Compositor / View Transitions]
    end

    subgraph "Logic & Security"
        Integrity[Iron-Gate Integrity Service]
        Algebra[Calculation Engine / Streaks]
        Security[XOR Identity Vault (V3)]
        Auth[Better Auth Identity Client]
        Maamu[AI Strategist Logic]
    end

    subgraph "Infrastructure Layer"
        Vercel[Vercel Serverless Gateway]
        Node[Node.js Runtime / Edge Functions]
        SQL[(Supabase PostgreSQL)]
        PWA[Google Workbox / Caching]
    end

    %% Wiring: UI to State
    UI -- "1. Interaction" --> Proxy
    Proxy -- "2. Notify" --> EventEmitter
    EventEmitter -- "3. Differential Render" --> UI
    
    %% Wiring: State to Bridge
    Proxy -- "4. Save Broadcast" --> Bridge
    Bridge -- "5. Decoupled Persistence" --> Storage
    Bridge -- "6. V3 Security Masking" --> Security
    Bridge -- "7. API Uplink (3x Retry)" --> Vercel
    
    %% Wiring: Cloud Persistence
    Vercel -- "8. Identity Validation" --> Auth
    Vercel -- "9. Vault Mapping" --> Node
    Node -- "10. Atomic SQL" --> SQL

    %% PWA
    PWA -- "SW Refresh" --> Worker
    Transitions -- "Hardware Acceleration" --> UI
```

---

## 📂 The Complete Repository Map

### `/src` - The Frontend Engine
| Directory | Responsibility |
| :--- | :--- |
| `/components` | **UI Atoms**. Templates for Modals, the HUD, Mobile Nav, and the UI Registry. |
| `/config` | **Global Constants**. Storage keys, Badge definitions, and Default Column maps. |
| `/features` | **Vertical Slices**. Self-contained business units (Tracker, Timer, Tasks, etc.). |
| `/lib` | **Vendors**. Local instantiations of Better Auth and external API clients. |
| `/services` | **Intermediaries**. Logic gates for Sync, Auth, Integrity, and the Cloud Vault. |
| `/state` | **State management**. Home of the `appState` Proxy and the Subscription Engine. |
| `/styles` | **Design System**. Semantic CSS tokens, dynamic themes, and hardware-accelerated animations. |
| `/utils` | **Stateless Helpers**. High-performance math, date formatting, and DOM utilities. |
| `main.ts` | **The Orchestrator**. The single entry point that manages the 8-phase hydration boot. |

---

## 🧬 Data Contracts (The Interface Bible)

To ensure state consistency, all features must adhere to these strictly typed contracts found in `src/types/`.

### 1. Tracker Data Structure (`tracker.types.ts`)
```typescript
export interface TrackerDay {
  day: number;           // The session day number (1-indexed)
  date: string;          // ISO Date string (YYYY-MM-DD)
  studyHours: number[];  // Array of hours per subject category
  topics: string;        // Log of topics covered
  problemsSolved: number;// Metric count for competitive ranking
  project: string;       // Name of the active project
  completed: boolean;    // Whether the daily goal was met
  restDay?: boolean;     // If true, streak is frozen but not broken
}
```

### 2. Application Settings (`tracker.types.ts`)
```typescript
export interface Settings {
  startDate: string;     // Mission start date
  endDate: string;       // Mission target end date
  columns: { name: string; target: number }[]; // Subject categories
  beastMode: boolean;    // AI mentor intensity toggle
  unlockedBadges: string[]; // List of earned achievement IDs
  theme: string;         // Active UI aesthetic
  sessionGoal: string;   // Target hours pulse goal
}
```

### 3. Identity Profile (`profile.types.ts`)
```typescript
export interface UserProfile {
  username: string;
  fullName: string;
  avatar: string;
  nation: string;
  metadata: {
    phoneNumber?: string;
    dob?: string;
    isPublic: boolean;
  }
}
```

---

## 🚀 The High-Fidelity Boot Sequence (`main.ts`)

When a user launches All Tracker, they undergo an 8-stage "System Warm-up" to ensure 0ms perceived lag:

1.  **Phase 1: Shell Mount**: The UI Registry injects the HTML frame into `#app-root`.
2.  **Phase 2: Theme Injection**: Before JS starts, CSS variables are applied to prevent a "flash" of white.
3.  **Phase 3: Parallel Hydration**: Settings, TrackerData, and Tasks are pulled from `localStorage` in a single `Promise.all` block.
4.  **Phase 4: Immediate Calc**: The app runs `calculateDates()` so the dashboard isn't empty on first render.
5.  **Phase 5: First Paint**: `generateTable()` and `updateDashboard()` fire immediately.
6.  **Phase 6: Deferred Logic (300ms)**: Heavy modules like AI, Charts, and the Integrity Service load after the first paint.
7.  **Phase 7: Real-Time Boot**: The `startLiveSync()` bridge establishes a connection to the Supabase Vault.
8.  **Phase 8: Reveal**: The `#app-bootstrap-loader` class is removed, gracefully fading into the dashboard.

---

## 🧠 The State Proxy Engine (`src/state/app-state.ts`)

The app uses a **V4 Reactive Proxy Engine** instead of a framework like React or Vue. 

### Implementation Logic:
```typescript
export const appState = new Proxy(rawState, {
  set(target, prop, value) {
    if (deepEqual(target[prop], value)) return true; // Performance optimization
    target[prop] = value;
    notifySubscribers(prop, value); // Pings all UI listeners
    return true;
  }
});
```

### Why Proxy?
1.  **Zero Overhead**: No virtual DOM, no diffing algorithms, just native JS speeds.
2.  **Granular Notifications**: Features only re-render when the *specific* property they care about changes.
3.  **Automatic Persistence**: Every change to `appState` is automatically mirrored to `localStorage` via the Persistence Bridge.

---

## 🧬 Algorithm Deep-Dives (`src/utils/calc.utils.ts`)

### 1. The Streak Records Engine
The app scans **backwards** from the current date to determine the active streak.
- **Rule 1**: If the day is `completed`, streak increments.
- **Rule 2**: If the day is a `restDay`, the loop **continues** but doesn't increment the number. This is a "Freeze" state.
- **Rule 3**: If it's a normal day and empty, the streak breaks.

### 2. The Strategic Equilibrium Protocol (SEP)
Calculated via the **Coefficient of Variation (CV)**:
- `sepValue = (stdDev / mean) * 100`.
- High variation in study patterns reduces the score. Stability increases it.
- **Volatile Status**: Triggered when the CV exceeds 0.8, signaling an unsustainable "Cram-and-Crash" pattern.

### 3. XP & Ranking Logic
- **XP Calculation**: `totalHours * 100`. 
- **Rank Thresholds**: 鐵 -> 銅 -> 銀 -> 金 -> 鑽石 -> 大師 -> 宗師 -> 永遠.
- **World Positioning**: Estimated via a competitive curve matching the user's total hours against the global pool average.

---

## ⏳ The Midnight Split Logic (`src/features/timer/timer.ts`)

Ensures 100% accurate reporting for late-night study sessions. 

### The Algorithm:
1.  **Date Check**: Does `sessionStart` match `sessionEnd` on the calendar?
2.  **Crossover Detected**: If different, a **Split Point** is created at `00:00:00`.
3.  **Calculation**:
    - `Yesterday_Minutes = Midnight - StartTime`.
    - `Today_Minutes = EndTime - Midnight`.
4.  **Atomic Save**: The system executes two distinct writes to the study vault.
5.  **Context Preservation**: Any user note added to the session is cloned to both days.

---

## 🔐 Security: V3 Identity Vault (`src/utils/security.ts`)

We protect Personally Identifiable Information (PII) like Phone Numbers & Emails in the local browser.

### The XOR Obfuscation Pipeline:
- **Masking**: Every character is bit-shifted against a composite key (AppKey + Salt).
- **Enveloping**: Compressed and reverse-hexed before being stored as Base64.
- **De-scrambling**: Reverses the pipeline only when the UI explicitly requests a field for a "Profile Mode" view.
- **Intent**: Human-unreadable in the browser console, protecting against "Data Scrapers" or rogue extensions.

---

## 📡 Synchronization: The Data Bridge (`src/services/data-bridge.ts`)

The bridge connects the Browser to the Cloud Vault.

### Resiliency Engine (`api.service.ts`):
Every cloud request follows a **3x Exponential Backoff** flow:
- **Try 1**: Instant.
- **Try 2**: 1000ms delay.
- **Try 3**: 2000ms delay.
- **Try 4**: 4000ms delay.
- **Failure**: Sync status switches to "Offline" and falls back to Local-First mode.

### Conflict Resolution Strategy:
- **Last-Write-Wins**: We trust UTC timestamps. If a cloud record is newer than the local cache, the local cache is updated silently.
- **Deep Compare**: The bridge performs a `JSON.stringify` comparison before pushing to save bandwidth on large tracker objects.

---

## 🦾 Feature Deep-Dive: Vertical Slices

### 📈 The Tracker (`src/features/tracker/tracker.ts`)
Generates an "Infinite Scrollable" table. It uses a **Virtual Grid** approach where it calculates the state of every day on the fly based on the phase dates.

### ⚔️ System Missions (Tasks) (`src/features/tasks/tasks.ts`)
Utilizes an **Atomic Immutable Pattern**. If you complete a task, the code doesn't edit the object; it replaces the entire array with a new one. This triggers the Proxy Reactivity Engine without side effects.

### 🧠 Maamu AI (`src/features/intelligence/intelligence.ts`)
The AI logic uses **Dynamic Prompt Engineering**:
1.  **State Gathering**: Pulls the last 7 days of performance metrics.
2.  **Personality Injection**: Adjusts tone based on the `Beast Mode` toggle.
3.  **Context Loading**: Injects active tasks and current XP levels into the system instructions.

---

## 🎨 Design System & CSS Tokens

Everything is controlled via CSS Variables for instant performance:

| Variable | Description |
| :--- | :--- |
| `--bg-main` | The dark, glassmorphic backdrop. |
| `--accent-gold` | Secondary color for elite rankings. |
| `--accent-purple` | The "focus mode" glow color. |

### Architectural Aesthetic Principles:
- **Glassmorphism**: High blur (16-20px) with low opacity (0.1-0.2) backgrounds.
- **Shimmer Effects**: GPU-bound keyframe animations for loading states.
- **Holographic Borders**: Subtle 1px borders with localized gradients.

---

## 🛡️ Advanced Case Studies (Error Handling)

### 1. The "Resurrection Bug"
**Symptom**: Deleted tasks reappearing after refresh.
**Titan Solution**: Implemented **Awaiting Persistence**. UI confirmation now waits for the `DB ACK` signal before resolving the "Delete" action locally.

### 2. The "Clock Drift" Issue
**Symptom**: Timer showing negative numbers after device sleep.
**Titan Solution**: Changed from `setInterval` ticks to `Temporal Comparisons`. The UI calculates `Now - StartTimestamp`, making it immune to JS thread suspensions.

---

## 🌐 PWA Service Worker Strategy (`public/sw.js`)

Our service worker uses a **Stale-While-Revalidate** strategy for industrial-grade offline resilience.

### Caching Tiers:
- **Tier 1 (Internal Assets)**: JS, CSS, and SVG files are cached immediately on install.
- **Tier 2 (External Dependencies)**: Google Fonts and Flag icons are cached upon first request.
- **Tier 3 (The App Shell)**: `index.html` is cached using a network-first strategy to ensure users always receive the latest bootloader when online.

---

## 🛠️ Backend Technical Reference

### PostgreSQL Tables (Supabase)
- **`user_trackers`**: Data vault for study logs (JSONB).
- **`user_settings`**: Global config and badge state (JSONB).
- **`tasks`**: Relational table for individual mission records.
- **`profiles`**: High-performance World Stage records for the World Stage.
- **`leaderboards`**: Aggregate cache for competitive rankings.

### Serverless APIs (Vercel)
- **`/api/app/vault`**: Universal CRUD pipeline for study data.
- **`/api/app/bootstrap`**: Initial session and identity fetch.
- **`/api/app/maamu`**: Edge-proxied interface for AI mentor interactions.
- **`/api/app/telemetry`**: Global usage monitoring and active pilot counting.

---

## 🥋 The "Titan" Engineering Standard (SOP)

Every contribution must adhere to the **Modular Feature Principle**.

### 1. Vertical Isolation
Each folder in `/features` must be independent. They communicate ONLY through the `app-state` Proxy and the `events` system.

### 2. Functional Purity
Whenever possible, utilities in `/utils` must be pure functions. They take data, return data, and never touch the DOM.

### 3. Hardware-Accelerated UI
All animations must use the `transform` and `opacity` properties to ensure they run on the GPU compositor thread, maintaining 60 FPS even during heavy state syncs.

---

## 📘 Detailed Environment Variable Encyclopedia

Stored in `.env` (Server) and inferred from `constants.ts` (Client).

| Key | Scope | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Server | Direct connection string for Supabase PostgreSQL. |
| `BETTER_AUTH_SECRET` | Server | Cryptographic key used for signing session cookies. |
| `GROQ_API_KEY` | Server | Priority key for AI Strategist (Maamu) generation. |
| `VITE_SUPABASE_URL` | Client | Endpoint for real-time telemetry and database queries. |
| `VITE_SUPABASE_KEY` | Client | Anonymous public key for scoped client interactions. |

---

## 📓 Internal Glossary of Terms

- **Iron-Gate**: The system that blocks historical data editing before the 4:00 AM reset.
- **Phase Split**: The algorithmic process of dividing a midnight-crossing session.
- **Holo-Sync**: The visual sparkle confirmation when Cloud and Local data are identical.
- **Beast Mode**: A state where the AI Mentor uses high-intensity coaching templates.
- **Silent Overrun**: A safety mechanism that auto-seals sessions exceeding 5.0 hours.
- **World Stage**: The competitive leaderboard where all pilots broadcast their progress.

---

## 🛠️ Component Registry Walkthrough (`src/components/ui-registry.ts`)

The UI Registry is the "Template Engine" of All Tracker. It ensures all UI fragments are loaded efficiently and handled with consistent lifecycle hooks.

### Core Fragments:
- **`app-shell`**: The master container including header and navigation.
- **`hud-metrics`**: The real-time performance display in the dashboard.
- **`table-view`**: The study ledger grid.
- **`prompt-center`**: The AI interaction interface.
- **`modal-overlay`**: The unified handler for all system dialogs.

### Hydration Lifecycle:
1. **Fetch**: Loads HTML fragments from the `/src/components/templates/` directory.
2. **Inject**: Mounts the fragment into the designated DOM mount point.
3. **Bind**: Wires up event listeners and state subscribers.
4. **Prerender**: Executes initial calculations (e.g., date generation) before revealing.

---

## 🤖 Maamu AI: Prompt Engineering & Logic

Maamu isn't just a chatbot; it's a context-aware strategist.

### The Context Assembly Pipeline:
When a user requests a briefing, the `intelligence.service.ts` identifies and gathers:
- **Mission History**: The last 14 days of study data.
- **Active Backlog**: Current pending tasks and their priorities.
- **Identity Context**: The user's rank, XP, and current streak.
- **Tone Override**: Injects "Aggressive" or "Supportive" traits based on the `Beast Mode` setting.

### The System Prompt (Logic):
The AI is instructed to be a "No-Nonsense Tactical Commander." It is forbidden from using generic motivational quotes and must refer to specific study metrics (e.g., "Your stability dropped by 12% yesterday. Rectify it.")

---

## 🔄 Cloud Sync Protocols (Vault-by-Vault)

How data is handled as it moves between the browser and Supabase.

| Vault | Strategy | Conflict Handling |
| :--- | :--- | :--- |
| **Tracker** | Full Mirror | Last-Write-Wins (UTC) |
| **Settings** | Property Merge | Granular key-level overrides |
| **Tasks** | Relational Sync | ID-based reconciliation |
| **Routines** | Reset-First | Daily state purging on boot |
| **Profile** | Broadcast-Only | Instant leaderboard push |

---

## 🛸 Holographic Design Philosophy

The All Tracker aesthetic is defined by "The Interface of the Future." 

### 1. High-Fidelity Glass (Glassmorphism)
We use `backdrop-filter: blur(20px)` combined with multiple linear gradients to simulate depth. Every pane should feel like a piece of physical glass floating in space.

### 2. Shimmer & Glow (Visual Feedback)
Loading states are never static. We use CSS `background-size: 200%` and keyframe `background-position` to create subtle shifting light rays.

### 3. Tactile Feedback
Navigating between panes uses the **View Transition API**. This creates a sliding motion that mirrors physical hardware interaction, ensuring the user feels the "weight" of the data they are manipulating.

---

## ⚖️ Internal Ethics & Data Philosophy

All Tracker is built on a "Privacy First, Competitive Second" philosophy.

1. **Local-First Precedence**: Even if the cloud goes dark, the user's data remains 100% functional in their browser.
2. **Obfuscation Standard**: Sensitive user fields are scrambled with XOR/Base64 to prevent "Drive-by Data Scraping."
3. **Transparent Sync**: The user is always notified of their sync status via the "Live Ready" HUD indicator.

---

## 🚀 Future Roadmap & Scaling

The architecture is designed to scale to thousands of daily active pilots.

### 1. Real-time Telemetry
Expansion of the `src/features/telemetry` module to provide global hour-count live counters.

### 2. Modular AI Expansion
The current Groq-based logic is designed to be swappable with OpenAI or local-run LLMs via the `intelligence.service` interface.

### 3. Collaborative Modules
The relational task structure allows for future "Team Missions" and shared study goals with minimal refractive changes.

---

## 📐 The "Vertical Slice" Pattern (Developer SOP)

Every new feature must be self-contained in its own directory within `src/features/`.

### Directory Structure:
```text
my-feature/
├── my-feature.ts        # Business Logic & Algorithms
├── my-feature.ui.ts     # DOM Rendering & Event Handling
├── my-feature.types.ts  # Interface Definitions
└── my-feature.css       # Feature-specific Styling
```

### Integration Workflow:
1.  **State Registration**: Add the feature's state key to `app-state.ts`.
2.  **Service Hook**: Map the feature to the `DataBridge` if it requires cloud persistence.
3.  **UI Mount**: Initialize the feature's UI listeners in the `initApp()` sequence in `main.ts`.

---

## 📡 The Logging Standard (`src/utils/logger.utils.ts`)

We do NOT use direct `console.log`. We use the **Tactical Logger**:

- **log.trace**: Silent, used for boot sequence monitoring.
- **log.debug**: Development-only logic checks.
- **log.info**: Global events (e.g., "Vault Synced").
- **log.error**: Critical failures (e.g., "Auth Pipeline Broken").

---

## 🛡️ The "Iron-Gate" Integrity Protocol (Deep Dive)

The **Iron-Gate** is the core guard against data manipulation. It enforces a "Reality Lockdown" for historical data.

### 1. The 4:00 AM Rule
Data isn't locked at Midnight. Instead, we use a **4-hour grace window**. This accounts for late-night study sessions where the user might still be documenting their work. 

### 2. Implementation Logic
```typescript
function isRowEditable(dayDate: Date): boolean {
    const now = new Date();
    const cutoff = new Date(dayDate);
    cutoff.setHours(28, 0, 0, 0); // 4 AM the next morning (24 + 4)
    return now.getTime() < cutoff.getTime();
}
```

---

## 🤖 Maamu AI: Personality Matrix

Our AI Strategist operates under three distinct "Cognitive Profiles" based on application state.

### 1. The Commander (Beast Mode: ON)
- **Voice**: Aggressive, metric-focused, minimal empathy.
- **Prompt Trigger**: `settings.beastMode === true`.
- **Logic**: Injects `const COMMANDER_PROMPT = "Your failures are documented. Every skipped hour is a loss of ground. Correct your trajectory immediately."`.

### 2. The Strategist (Beast Mode: OFF)
- **Voice**: Clinical, analytical, solution-oriented.
- **Prompt Trigger**: Normal state.
- **Logic**: Focuses on data trends and efficiency tips (e.g., "Pomodoro adjustment recommended for Topic A").

### 3. The Diagnostic (System Failure)
- **Voice**: Technical, concise, recovery-focused.
- **Prompt Trigger**: Detects sync conflicts or data corruption.
- **Logic**: Guides the user through the "Tactical Recovery" sequence to prevent data loss.

---

> [!CAUTION]
> **State Integrity**: Never modify `appState` properties directly from external DOM scripts. Always use the exported feature methods to ensure the Proxy triggers correctly and the "Iron Gate" integrity rules are checked.
