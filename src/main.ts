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
import "./styles/themes/default.css";
import "./styles/themes/chanakya-strategy.css";
import "./styles/themes/ayodhya.css";
import "./styles/themes/kamala-grace.css";
import "./styles/themes/kaala.css";

// 2. High-Level Orchestration
import { igniteApp } from "./core/app-ignition";
import { refreshApplicationUI } from "./core/mission-pulse";

// 3. System Ignition
document.addEventListener("DOMContentLoaded", () => {
  void igniteApp();
});

// 4. Export for global bridge access (Sync)
export { refreshApplicationUI };
