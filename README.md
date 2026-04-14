<div align="center">
  <img src="./public/logo.png" width="100" height="100" alt="All Tracker Logo">
  <h1> All Tracker</h1>
  <p><strong>The High-Performance Mission Control for Focused Development & Study.</strong></p>

  <p>
    <a href="https://alltracker.online"><strong>Live Tracker</strong></a> |
    <a href="https://github.com/ankitpandey1900/Tracker/issues">Report Issue</a> |
    <a href="https://github.com/ankitpandey1900/Tracker/pulls">Contribute</a>
  </p>
</div>

---

## 🚀 The Vision
All Tracker is a revolutionary, gamified productivity command center. Designed for those who "grind" in silent hours, it transforms boring habit tracking into a high-stakes **World Stage**. With a "Neon Space" aesthetic and deep-focus analytics, it’s built to keep you obsessed with your own progress.

---

## 🔥 Core Features

### 🪪 Social Identity Profile (v3)
A professional, social-media-style identity card that prioritizes personal branding and study credibility. Features a luminous **Activity Beacon** (Status Dot), career stats row, and a streamlined personal identity dossier.

### 🤖 Maamu AI Strategist
Your personal AI mentor who analyzes your study data and provides mission briefings. Features a **Beast Mode** toggle for those who need a "No Mercy" coaching style.

### 🛡️ Privacy-First Architecture
- **Identity Lock & Vault Key**: A secure registration flow (Real Name, Email, Phone) anchors your identity. A private **Vault Key** (password) and **Recovery Key** manage access.
- **Granular Cloud Vaults**: Feature-specific data is stored in dedicated Supabase tables (`vault_tracker`, `vault_tasks`, etc.) for maximum isolation and reliability.
- **Zero-Knowledge Sync**: Sensitive credentials are never exposed in browser logs or network payloads, masked behind XOR + Base64 security layers.

### ⚡ Performance Architecture
- **Real-time World Stage**: Rankings update live via WebSockets (Supabase Broadcast) with industrial-grade 1.2s debouncing to prevent UI stutter during heavy global activity.
- **Local-First Speed**: The UI renders instantly from `localStorage` while a background **Differential Sync** silently updates cloud data without blocking the user.
- **Concurrent Hydration**: Granular service modules (Settings, Tracker, Routines) load in parallel using `Promise.all` for a faster "Time to Interactive".
- **GPU-Isolated Atmos**: High-fidelity environments maintain a locked 60FPS using `will-change` transform isolation and layer-exclusive compositing.

### 🌌 Atmospheric Command Protocols (Horizon Engine)
- **Cinematic Depth**: Themes like **Himavat** now feature dual-parallax terrain silhouettes and Arctic Aurora pulses for mission-critical focus immersion.
- **Clear-Sky Geometry**: Implementation of sub-zero transparency indices (down to 5%), maintained via high-fidelity `backdrop-filter` blurs for maximum data legibility.
- **Atmos-Drift engine**: A multi-layered, GPU-isolated snowfall protocol (including foreground Bokeh diffraction) that maintains a locked 60FPS on all mission hardware.

---

## 🛠️ Technical Stack
Built with a "First Principles" approach to performance and design:
- **Engine**: [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) (Monolithic Vanilla TS for zero-overhead)
- **Database/Backend**: [Supabase](https://supabase.com/) (Real-time broadcasting & persistent storage)
- **Styling**: Vanilla CSS (High-fidelity Glassmorphism & Semantic Variable System)
- **Deployment**: Vercel Edge Network

---

## ✈️ Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase Project (for cloud sync)

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/ankitpandey1900/AllTracker.git
   cd ALLTracker
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Open .env and add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

3. **Install & Launch**
   ```bash
   npm install
   npm run dev
   ```

---

## 📜 Repository Guidelines

### Architecture
Detailed documentation of the system internals can be found in the [**/docs**](./docs) folder:
- **[A Beginner's Guide](./docs/guide.md)**: Setup and core concepts.
- **[Development Deep Dive](./docs/development.md)**: Logic and engine architecture.
- **[System Structure](./docs/structure.md)**: Folder hierarchy and data flow.

### Contributing
We welcome architects! Open an issue first to discuss major changes, then submit a PR following the existing functional programming patterns.

---

## 🏆 Hall of Fame

The platform is built by elite pilots who contribute their skills to push the mission forward. Each pilot has a detailed record of their contributions and social dispatch logs.

- **[Lead Architect: Ankit Pandey](./arena-pilots/ankit-pandey.md)**
- **[Full Stack Developer: Saumya Jha](./arena-pilots/saumya-jha.md)**
- **[Contribution Template](./arena-pilots/TEMPLATE.md)**: Add your record to the Arena.

---

## 👤 Author
**Ankit Pandey**
- GitHub: [@ankitpandey1900](https://github.com/ankitpandey1900)
- Linkedln: [linkedin.com/ankitpandey1900](https://www.linkedin.com/in/ankitpandey1900)

---

## ⚖️ License
Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center"><strong>Let's win.</strong> 🛸🔥</p>
