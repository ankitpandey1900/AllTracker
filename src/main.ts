/**
 * ALL TRACKER — Main Entry Point
 * 
 * This is the orchestration layer. It ignites the application 
 * and connects the core systems.
 */

// 1. Critical Style Assets
import "./styles/main.css";
import "./styles/components/leaderboard.css";
import "./styles/components/intelligence.css";
import "./styles/components/manual.css";
import "./styles/components/canvas.css";
import "./styles/components/feed.css";
import "./styles/features/maamu.css";
import "./styles/themes/obsidian-glass.css";
import "./styles/themes/tactical-navy.css";
import "./styles/themes/solar-gold.css";
import "./styles/themes/pristine-white.css";
import "./styles/themes/stealth-midnight.css";
import "./styles/themes/quantum-purple.css";

// 2. High-Level Orchestration
import { igniteApp } from "./core/app-ignition";
import { refreshApplicationUI } from "./core/mission-pulse";

// 3. System Ignition
document.addEventListener("DOMContentLoaded", () => {
  void igniteApp();
});

// 4. Export for global bridge access (Sync)
export { refreshApplicationUI };
