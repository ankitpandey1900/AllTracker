/**
 * The User Manual / Documentation reader modal.
 */
export const manualModal = `
  <div class="modal" id="userManualModal">
    <div class="modal-content docs-modal">
      <div class="docs-header">
        <div class="docs-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6a86ff" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>All Tracker <span class="docs-version">v2.0 Docs</span></span>
        </div>
        <button id="closeUserManualModal" class="docs-close">&times;</button>
      </div>

      <div class="docs-layout">
        <!-- Sidebar TOC -->
        <nav class="docs-sidebar">
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Getting Started</div>
            <a class="docs-nav-link active" onclick="docScrollTo('doc-intro')">Introduction</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-quickstart')">Quick Start</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-auth')">Authentication</a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Core Features</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-dashboard')">Dashboard</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-tracker')">Study Log Table</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-timer')">Focus Timer</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-routines')">Daily Routines</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-tasks')">Mission Control</a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Analytics</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-analytics')">Performance Charts</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-heatmap')">Activity Heatmap</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-leaderboard')">World Stage</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-badges')">Badges &amp; Ranks</a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Advanced</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-settings')">Settings</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-shortcuts')">Keyboard Shortcuts</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-sync')">Cloud Sync</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-integrity')">Integrity Engine</a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-maamu')">Maamu AI Mentor</a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Visuals</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-horizon')">Environment Protocols</a>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="docs-content">

          <!-- INTRODUCTION -->
          <section class="docs-section" id="doc-intro">
            <div class="docs-breadcrumb">Getting Started › Introduction</div>
            <h1 class="docs-h1">All Tracker</h1>
            <div class="docs-lead">An elite, clinical study command center built for high-stakes focus. Track every hour, visualize your growth, compete globally on the World Stage, and secure your legacy in the All Tracker Vault.</div>
            <div class="docs-callout docs-callout-info">
              <div class="docs-callout-title">🛰️ What is All Tracker?</div>
              <p>All Tracker is a premium productivity platform designed to track deep-focus study hours across a defined mission range. It features a tactical Focus Timer, Pilot Identity system, Global World Stage, and a secure cloud-first sync system.</p>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- QUICK START -->
          <section class="docs-section" id="doc-quickstart">
            <div class="docs-breadcrumb">Getting Started › Quick Start</div>
            <h2 class="docs-h2">Quick Start</h2>
            <p>Follow these steps to get up and running in under 5 minutes.</p>

            <div class="docs-steps">
              <div class="docs-step">
                <div class="docs-step-num">1</div>
                <div class="docs-step-body">
                  <h4>Configure Your Date Range</h4>
                  <p>Open <kbd>Settings</kbd> (click the Settings button or press <code>Ctrl + ,</code>). Set your <strong>Start Date</strong> and <strong>End Date</strong>. This defines the total number of days in your tracker.</p>
                </div>
              </div>
              <div class="docs-step">
                <div class="docs-step-num">2</div>
                <div class="docs-step-body">
                  <h4>Define Study Categories (Custom Ranges)</h4>
                  <p>In Settings, add a <strong>Custom Range</strong> with your study categories (e.g., <code>DSA</code>, <code>System Design</code>, <code>Projects</code>). Each category has a name and a target hour count.</p>
                </div>
              </div>
              <div class="docs-step">
                <div class="docs-step-num">3</div>
                <div class="docs-step-body">
                  <h4>Create Your Account</h4>
                  <p>Click <strong>LOGIN</strong> in the top-right header. Register with a unique <strong>User ID</strong> (your public handle) and a <strong>Vault Key</strong> (your private password). Your data syncs to the cloud securely.</p>
                </div>
              </div>
              <div class="docs-step">
                <div class="docs-step-num">4</div>
                <div class="docs-step-body">
                  <h4>Start Tracking</h4>
                  <p>Click <strong>Start Timer</strong> on the dashboard, select a category, and begin your study session. When done, stop the timer, add a session note, and your hours are auto-saved.</p>
                </div>
              </div>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- AUTHENTICATION -->
          <section class="docs-section" id="doc-auth">
            <div class="docs-breadcrumb">Getting Started › Authentication</div>
            <h2 class="docs-h2">Authentication</h2>
            <p>All Tracker uses a two-layer identity system: a public <strong>User ID</strong> (your display name on the World Stage) and a private <strong>Vault Key</strong> (your password).</p>

            <h3 class="docs-h3">Secure Your Identity</h3>
            <ol class="docs-ol">
              <li>Click <strong>LOGIN</strong> → Switch to the <strong>Register</strong> tab.</li>
              <li>Claim a unique <strong>Pilot Handle</strong> — this becomes your permanent identity on the World Stage.</li>
              <li>Create a <strong>Vault Key</strong> (Private Password) and select your <strong>Nation</strong>.</li>
              <li>Choose your <strong>Pilot Archetype</strong> (Oni, Astronaut, UFO, etc.) from the Hangar.</li>
              <li>Click <strong>INITIALIZE IDENTITY</strong>. A unique <strong>Secret Key</strong> (Identity Key) is generated. <em>Save it somewhere safe for cross-device sync.</em></li>
            </ol>

            <div class="docs-callout docs-callout-warning">
              <div class="docs-callout-title">⚠️ Recovery Key</div>
              <p>Your Recovery Key is a one-time generated 12-character code. If you forget your Vault Key, you can use this key to verify your identity and reset access. <strong>Do not lose it.</strong></p>
            </div>

            <h3 class="docs-h3">Login</h3>
            <ol class="docs-ol">
              <li>Click <strong>LOGIN</strong> in the header.</li>
              <li>Enter your <strong>User ID</strong> and <strong>Vault Key</strong>.</li>
              <li>Click <strong>ENTER VAULT</strong>. All your cloud data syncs automatically.</li>
            </ol>

            <h3 class="docs-h3">Legacy Migration</h3>
            <p>If you used the old Sync ID system, you can migrate:</p>
            <ol class="docs-ol">
              <li>In the Login modal, click <strong>Legacy Login (Old Sync ID)</strong>.</li>
              <li>Enter your old Sync ID.</li>
              <li>You'll then be prompted to create a new User ID and Vault Key.</li>
              <li>Your data is preserved and linked to the new credentials.</li>
            </ol>
          </section>

          <div class="docs-divider"></div>

          <!-- DASHBOARD -->
          <section class="docs-section" id="doc-dashboard">
            <div class="docs-breadcrumb">Core Features › Dashboard</div>
            <h2 class="docs-h2">Dashboard</h2>
            <p>The Dashboard is your command center — it surfaces all critical statistics computed from your tracker data in real time.</p>

            <h3 class="docs-h3">Metrics Displayed</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Metric</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>Current Day</code></td><td>Day number in your study plan (e.g., Day 47 of 365)</td></tr>
                  <tr><td><code>Total Hours</code></td><td>Sum of all study hours logged across all categories</td></tr>
                  <tr><td><code>Current Streak</code></td><td>Consecutive completed days. Rest Days freeze without breaking it.</td></tr>
                  <tr><td><code>Completion %</code></td><td>Completed days / total days elapsed × 100</td></tr>
                  <tr><td><code>World Rank</code></td><td>Estimated global rank based on total hours studied vs the general population.</td></tr>
                  <tr><td><code>XP / Level</code></td><td><strong>10 Hours = 1 Level</strong>. Leveling starts at LVL 1. Each study session fills your tactical progress bar.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 class="docs-h3">Category Progress Cards</h3>
            <p>Each study category shows its total hours, target hours, fill percentage, and estimated finish date based on your current logging pace.</p>

            <h3 class="docs-h3">Dynamic Status Message</h3>
            <p>The status message under your name updates based on your pace vs expected completion. If you're behind, it motivates. If you're ahead, it celebrates.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- TRACKER TABLE -->
          <section class="docs-section" id="doc-tracker">
            <div class="docs-breadcrumb">Core Features › Study Log Table</div>
            <h2 class="docs-h2">Study Log Table</h2>
            <p>The Study Log Table is the core data entry interface. Every row represents one day in your study plan.</p>

            <h3 class="docs-h3">Editing Cells</h3>
            <p>Click any cell directly to edit it. Changes are auto-saved on blur. No save button needed.</p>

            <h3 class="docs-h3">Row States</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>State</th><th>Visual</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td>Today</td><td>Highlighted border</td><td>The current calendar day</td></tr>
                  <tr><td>Completed</td><td>Green checkmark</td><td>Day marked as done</td></tr>
                  <tr><td>Rest Day ❄️</td><td>Blue snowflake</td><td>Streak frozen, not counted as miss</td></tr>
                  <tr><td>Locked 🔒</td><td>Grayed out</td><td>Past rows locked by Iron-Gate Engine</td></tr>
                </tbody>
              </table>
            </div>

            <h3 class="docs-h3">Quick Entry <code>Ctrl+K</code></h3>
            <p>Opens a floating entry panel. Select a day number, fill in hours per category, topics, problems solved, and completion status. Saves and jumps to that row instantly.</p>

            <h3 class="docs-h3">Bulk Entry</h3>
            <p>Enter a start day, end day, and daily hours to fill a range of days at once. Useful for catching up on missed entries.</p>

            <div class="docs-callout docs-callout-tip">
              <div class="docs-callout-title">💡 Tip</div>
              <p>Use <code>Ctrl+T</code> to jump directly to today's entry form pre-filled with your current data.</p>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- FOCUS TIMER -->
          <section class="docs-section" id="doc-timer">
            <div class="docs-breadcrumb">Core Features › Focus Timer</div>
            <h2 class="docs-h2">Focus Timer</h2>
            <p>The Focus Timer tracks real-time study sessions and automatically saves hours to the correct day and category when stopped.</p>

            <h3 class="docs-h3">Starting a Session</h3>
            <ol class="docs-ol">
              <li>Click <strong>Start Timer</strong> on the dashboard.</li>
              <li>Select a <strong>Study Category</strong> from the dropdown.</li>
              <li>Click <strong>Start Timer</strong>. The HUD overlay appears.</li>
            </ol>

            <h3 class="docs-h3">Session Controls</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Action</th><th>Result</th></tr></thead>
                <tbody>
                  <tr><td>Pause</td><td>Freezes the timer. Hours accumulated are not lost.</td></tr>
                  <tr><td>Resume</td><td>Continues from where you paused.</td></tr>
                  <tr><td>Stop</td><td>Opens the Session Note modal, then saves hours to today's row.</td></tr>
                  <tr><td>Minimize HUD</td><td>Shrinks the HUD to a draggable mini-player. Page scrolling is restored.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 class="docs-h3">Session Note</h3>
            <p>On stopping, a prompt asks for an optional session note. Notes are saved to both the <strong>Session History</strong> and auto-filled into the matching Topics or Project column of the Study Log.</p>

            <h3 class="docs-h3">Session Goal Ring & ETA</h3>
            <p>Set a session goal (in minutes) in the header. The progress ring fills as you study, turning gold at 80% and green at 100%.</p>
            <div class="docs-callout docs-callout-info">
              <div class="docs-callout-title">🎯 Goal ETA Prediction</div>
              <p>The HUD now features a predictive <strong>Goal ETA</strong> engine. It calculates the exact wall-clock time (e.g., 10:45 PM) you will reach your study goal based on your current elapsed time. If you update your goal minutes mid-session, the ETA recalibrates instantly.</p>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- ROUTINES -->
          <section class="docs-section" id="doc-routines">
            <div class="docs-breadcrumb">Core Features › Daily Routines</div>
            <h2 class="docs-h2">Daily Routines</h2>
            <p>Routines are repeating daily habits tracked separately from study hours. Each routine item has a title, time, and optional note.</p>

            <h3 class="docs-h3">Managing Routines</h3>
            <ul class="docs-ul">
              <li>Click <strong>+ Add Routine</strong> to create a new item with a scheduled time.</li>
              <li>Check the checkbox to mark a routine as complete for the day.</li>
              <li>Routines auto-reset every midnight.</li>
              <li>The <strong>Performance Chart</strong> below the checklist shows your 21-day routine completion trend.</li>
            </ul>

            <div class="docs-callout docs-callout-info">
              <div class="docs-callout-title">📌 Daily Reset</div>
              <p>The app checks for routine resets at startup. If the stored date differs from today, all routines are cleared for a fresh daily start.</p>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- MISSION CONTROL -->
          <section class="docs-section" id="doc-tasks">
            <div class="docs-breadcrumb">Core Features › Mission Control</div>
            <h2 class="docs-h2">Mission Control (Tasks)</h2>
            <p>Mission Control is a focused to-do list for non-recurring tasks — specific topics to cover, videos to watch, or assignments to complete.</p>

            <h3 class="docs-h3">Task Properties</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Property</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Title</td><td>Name of the task</td></tr>
                  <tr><td>Priority</td><td><code>High 🔴</code>, <code>Med 🟡</code>, or <code>Low 🟢</code></td></tr>
                  <tr><td>Due Day</td><td>Day number by which it should be completed</td></tr>
                  <tr><td>Status</td><td>Active, Overdue (shown in Backlog), or Completed</td></tr>
                </tbody>
              </table>
            </div>

            <h3 class="docs-h3">Backlog</h3>
            <p>Tasks past their due day automatically move to the <strong>Backlog</strong> section. Completed tasks are auto-deleted after 3 days to keep the list clean.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- ANALYTICS -->
          <section class="docs-section" id="doc-analytics">
            <div class="docs-breadcrumb">Analytics › Performance Charts</div>
            <h2 class="docs-h2">Performance Charts</h2>

            <h3 class="docs-h3">Study Output Trend (Line Chart)</h3>
            <p>Plots your daily study hours over the last 21 days. Filters available: <code>All</code>, <code>7D</code>, <code>14D</code>, <code>21D</code>.</p>

            <h3 class="docs-h3">Category Radar (Radar Chart)</h3>
            <p>Visualizes your time distribution across all categories on a radial axis. Helps identify neglected areas.</p>

            <h3 class="docs-h3">Allocation Bar</h3>
            <p>Shows the percentage split of all-time hours across each category as a colored progress bar with legend.</p>

            <h3 class="docs-h3">Session History</h3>
            <p>Every session logged by the timer appears here with date, time range, category, duration, and your note. Filterable by date.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- HEATMAP -->
          <section class="docs-section" id="doc-heatmap">
            <div class="docs-breadcrumb">Analytics › Activity Heatmap</div>
            <h2 class="docs-h2">Activity Heatmap</h2>
            <p>Opens via <code>Ctrl+H</code> or the Heatmap button. Displays a GitHub-style contribution grid where each cell represents a day.</p>
            <ul class="docs-ul">
              <li><strong>Dark cells</strong> = no hours logged</li>
              <li><strong>Green intensity</strong> = hours logged that day (darker = more hours)</li>
              <li><strong>Gold cells</strong> = completed days</li>
            </ul>
            <p>Use the year selector to view past years' activity.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- LEADERBOARD -->
          <section class="docs-section" id="doc-leaderboard">
            <div class="docs-breadcrumb">Analytics › World Stage</div>
            <h2 class="docs-h2">World Stage (Leaderboard)</h2>
            <p>The World Stage is a live global leaderboard showing the top 10 users by total study hours. Your row is highlighted.</p>
            <ul class="docs-ul">
              <li>Identity syncs on every timer stop, session entry, or change to your Pilot Passport.</li>
              <li>A <strong>green pulse dot</strong> next to a user's name means they are currently in a Live Focus session.</li>
              <li>Each entry shows: Nation flag, Archetype, Display Handle, Level, Tactical Title, and Total Hours.</li>
            </ul>

            <h3 class="docs-h3">Dynamic Title Engine</h3>
            <p>Your title on the World Stage reflects your clinical expertise:</p>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Hours</th><th>All Tracker Title</th></tr></thead>
                <tbody>
                  <tr><td>0 – 10h</td><td>🛡️ RECRUIT</td></tr>
                  <tr><td>10 – 30h</td><td>🚀 CADET</td></tr>
                  <tr><td>30 – 70h</td><td>🛸 PILOT</td></tr>
                  <tr><td>70 – 150h</td><td>🛰️ OFFICER</td></tr>
                  <tr><td>150 – 300h</td><td>🎖️ COMMANDER</td></tr>
                  <tr><td>300 – 600h</td><td>👨‍✈️ CAPTAIN</td></tr>
                  <tr><td>600 – 1200h</td><td>🥇 VETERAN</td></tr>
                  <tr><td>1200 – 2500h</td><td>💠 ELITE</td></tr>
                  <tr><td>2500 – 5000h</td><td>👑 LEGEND</td></tr>
                  |> 5000h</td><td>✨ ETERNAL / DEITY / SINGULARITY</td></tr>
                </tbody>
              </table>
            </div>

            <h3 class="docs-h3">Pilot Passport</h3>
            <p>Click your Archetype in the header to open the Pilot Passport. You can view your mission stats (Total Hours, Today's Hours), change your Archetype, and update your Identity metadata. Your Handle and ID remain permanently anchored once secured.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- BADGES -->
          <section class="docs-section" id="doc-badges">
            <div class="docs-breadcrumb">Analytics › Badges &amp; Ranks</div>
            <h2 class="docs-h2">Badges &amp; Rank System</h2>

            <h3 class="docs-h3">Rank Tiers</h3>
            <div class="docs-table-wrap">
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Rank</th><th>Mission Hours</th></tr></thead>
                <tbody>
                  <tr><td>🩶 Iron</td><td>0 – 50h</td></tr>
                  <tr><td>🟤 Bronze</td><td>50 – 200h</td></tr>
                  <tr><td>⚪ Silver</td><td>200 – 500h</td></tr>
                  <tr><td>🟡 Gold</td><td>500 – 1000h</td></tr>
                  <tr><td>💠 Platinum/Diamond</td><td>1000 – 3000h</td></tr>
                  <tr><td>🔮 Master</td><td>3000 – 5000h</td></tr>
                  <tr><td>✨ Eternal</td><td>5000 – 9000h</td></tr>
                  <tr><td>🔥 Ascended</td><td>9000 – 14000h</td></tr>
                  <tr><td>🌌 Deity</td><td>14000 – 20000h</td></tr>
                  <tr><td>🕳️ SINGULARITY</td><td>20000h+</td></tr>
                </tbody>
              </table>
            </div>
            </div>
            <p>Each rank has 5 divisions (I–V) and a unique title. Your rank is displayed on the dashboard and broadcast to the leaderboard.</p>

            <h3 class="docs-h3">Achievement Badges</h3>
            <p>Badges are unlocked by hitting specific milestones (streaks, total hours, problem counts). View your badge collection from the Badges button on the dashboard.</p>

            <h3 class="docs-h3">All Tracker Share Card 🚀</h3>
            <p>Flex your progress with the <strong>All Tracker Share Card</strong>. Click the "Share Stats" button in the dashboard hero to generate a high-fidelity PNG of your current Level, Rank, total hours, and streak. Perfect for sharing your growth with others.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- MAAMU AI MENTOR -->
          <section class="docs-section" id="doc-maamu">
            <div class="docs-breadcrumb">Advanced › Maamu AI Mentor</div>
            <h2 class="docs-h2">The Maamu AI Mentor</h2>
            <p class="docs-lead">A high-fidelity, Generative AI coach that sees your real tracking data and provides brutally honest feedback.</p>
            
            <div class="docs-callout docs-callout-info">
              <div class="docs-callout-title">🤖 Meet Maamu</div>
              <p>Maamu is inspired by the ruthless efficiency of Elon Musk and the sass of Grok. He understands English, Hindi, and Hinglish. He sees your last 7 days of performance, sleep sustainability, and task health.</p>
            </div>

            <h3 class="docs-h3">Setup: Getting Your API Key</h3>
            <p>Maamu is powered by Groq’s Llama-3 neural core. You need your own free API key to enable him.</p>
            <div class="docs-steps">
              <div class="docs-step">
                <div class="docs-step-num">1</div>
                <div class="docs-step-body">
                  <h4>Visit Groq Cloud</h4>
                  <p>Go to <a href="https://console.groq.com" target="_blank" style="color: var(--accent-blue);">console.groq.com</a> and sign in.</p>
                </div>
              </div>
              <div class="docs-step">
                <div class="docs-step-num">2</div>
                <div class="docs-step-body">
                  <h4>Generate key</h4>
                  <p>Navigate to <strong>API Keys</strong> and click <strong>Create API Key</strong>. Name it "All Tracker".</p>
                </div>
              </div>
              <div class="docs-step">
                <div class="docs-step-num">3</div>
                <div class="docs-step-body">
                  <h4>Initialize Maamu</h4>
                  <p>In All Tracker, go to the <strong>Maamu</strong> tab. Paste your key into the <strong>MAAMU CONFIGURATION</strong> sidebar and click <strong>Save Key</strong>.</p>
                </div>
              </div>
            </div>

            <h3 class="docs-h3">Elite Prompting Guide</h3>
            <p>Maamu works best when you ask for specific reality checks or strategies. Since he already sees your data, you don't need to explain your stats.</p>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Prompt Type</th><th>Example</th></tr></thead>
                <tbody>
                  <tr><td>Contextual Trash Talk</td><td>"Ajj bohot alas aa raha hai, reality check de."</td></tr>
                  <tr><td>Strategy Query</td><td>"Based on my task debt, what should I prioritize tonight?"</td></tr>
                  <tr><td>Health Check</td><td>"My sustainability is low. Analyze my sleep vs output."</td></tr>
                  <tr><td>Hinglish Guidance</td><td>"Mera current momentum kaisa hai? Honest feedback chahiye."</td></tr>
                </tbody>
              </table>
            </div>
            
            <div class="docs-callout docs-callout-warning">
              <div class="docs-callout-title">⚠️ Brutal Honesty</div>
              <p>Maamu is programmed to speak the truth. If your consistency is dropping, he will be harsh. This is designed for your growth, not for sugarcoating.</p>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- SETTINGS -->
          <section class="docs-section" id="doc-settings">
            <div class="docs-breadcrumb">Advanced › Settings</div>
            <h2 class="docs-h2">Settings</h2>

            <h3 class="docs-h3">Date Range</h3>
            <p>Defines the start and end of your study plan. All tracker days are computed from this range. Changing dates re-maps your existing data (data is preserved where date ranges overlap).</p>

            <h3 class="docs-h3">Custom Ranges (Study Phases)</h3>
            <p>Define variable study phases with their own categories. For example:</p>
            <div class="docs-code-block">
              <pre>Phase 1 → Days 1–100:   DSA (200h), Python (100h)
Phase 2 → Days 101–200: System Design (150h), Projects (100h)</pre>
            </div>
            <p>On a given day, the app applies the matching phase's categories automatically.</p>

            <h3 class="docs-h3">Import / Export</h3>
            <ul class="docs-ul">
              <li><strong>Export All Data (JSON)</strong> — Full backup of all tracker data, settings, and routines.</li>
              <li><strong>Export CSV</strong> — Study log as a spreadsheet-compatible file.</li>
              <li><strong>Import JSON / CSV</strong> — Restore from a previous backup.</li>
            </ul>
          </section>

          <div class="docs-divider"></div>

          <!-- SHORTCUTS -->
          <section class="docs-section" id="doc-shortcuts">
            <div class="docs-breadcrumb">Advanced › Keyboard Shortcuts</div>
            <h2 class="docs-h2">Keyboard Shortcuts</h2>
            <div class="docs-shortcuts-grid">
              <div class="docs-shortcut"><kbd>Ctrl + K</kbd><span>Open Quick Entry</span></div>
              <div class="docs-shortcut"><kbd>Ctrl + T</kbd><span>Today's Entry</span></div>
              <div class="docs-shortcut"><kbd>Ctrl + H</kbd><span>Open Heatmap</span></div>
              <div class="docs-shortcut"><kbd>Ctrl + W</kbd><span>Weekly Summary</span></div>
              <div class="docs-shortcut"><kbd>Ctrl + ,</kbd><span>Open Settings</span></div>
              <div class="docs-shortcut"><kbd>Ctrl + F</kbd><span>Focus Search Bar</span></div>
              <div class="docs-shortcut"><kbd>Escape</kbd><span>Close any open modal</span></div>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- CLOUD SYNC -->
          <section class="docs-section" id="doc-sync">
            <div class="docs-breadcrumb">Advanced › Cloud Sync</div>
            <h2 class="docs-h2">Cloud Sync</h2>
            <p>All data is synced to <strong>Supabase</strong> when you are authenticated. On every save operation, data is written to both <code>localStorage</code> (for offline access) and the cloud.</p>

            <h3 class="docs-h3">Sync Behavior</h3>
            <ul class="docs-ul">
              <li><strong>On Login</strong> — Cloud data overrides local data (cloud is source of truth).</li>
              <li><strong>On Save</strong> — All writes go to both local and cloud simultaneously.</li>
              <li><strong>Offline</strong> — App works fully offline using localStorage. Sync resumes when authenticated again.</li>
            </ul>

            <div class="docs-callout docs-callout-warning">
              <div class="docs-callout-title">⚠️ Important</div>
              <p>If you use the app on a new device without logging in first, your local data will be replaced by cloud data upon login. Always sync before switching devices.</p>
            </div>

            <h3 class="docs-h3">Perfect Sync (Cross-Device Heartbeat)</h3>
            <p>The Focus Timer now uses a <strong>Live Heartbeat</strong> protocol. While a timer is running, it pushes its exact state to the cloud every 60 seconds. This allows you to start a session on one device and see the live, synchronized countdown on any other device instantly.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- INTEGRITY ENGINE -->
          <section class="docs-section" id="doc-integrity">
            <div class="docs-breadcrumb">Advanced › Integrity Engine</div>
            <h2 class="docs-h2">Iron-Gate Integrity Engine</h2>
            <p>The Integrity Engine enforces rules to prevent data manipulation and maintain the authenticity of your study record.</p>

            <h3 class="docs-h3">Rules</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Rule</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Today Lock</td><td>Only today's row (and yesterday's before 4:00 AM) is editable.</td></tr>
                  <tr><td>Future Lock</td><td>Future rows are always read-only.</td></tr>
                  <tr><td>Past Lock</td><td>Rows older than yesterday (after 4 AM) are permanently locked.</td></tr>
                  <tr><td>Midnight Auto-Seal</td><td>At 11:58 PM, any day with hours logged is auto-marked as ✅ Complete.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 class="docs-h3">Rest Day (Streak Freeze) ❄️</h3>
            <p>Click the snowflake icon on any today/yesterday row to mark it as a Rest Day. The streak counter pauses instead of breaking. Rest days do not count toward completion rate.</p>

            <div class="docs-callout docs-callout-tip">
              <div class="docs-callout-title">💡 Pro Tip</div>
              <p>Use Rest Days sparingly. They are designed for genuine emergencies, not habitual skipping. The leaderboard tracks your actual completed days regardless.</p>
            </div>
          </section>

          <div class="docs-divider"></div>

          <!-- ENVIRONMENT PROTOCOLS (HORIZON CHASSIS) -->
          <section class="docs-section" id="doc-horizon">
            <div class="docs-breadcrumb">Visuals › Environment Protocols</div>
            <h2 class="docs-h2">Visual Environment Protocols (The Horizon Chassis)</h2>
            <p class="docs-lead">The <strong>Mythic Horizon Engine</strong> implements high-fidelity atmospheric protocols to lock your focus into mission-critical deep work. Optimized for low-latency GPU output.</p>

            <h3 class="docs-h3">🏔️ Operational Environment: Himavat (The Frozen Summit)</h3>
            <p>A sub-zero high-altitude mission chassis designed for maximum atmospheric clarity and "Clear-Sky" transparency.</p>
            <ul class="docs-ul">
              <li><strong>Sub-Zero Transparency</strong>: Implements a 5% transparency index across all HUD components, exposing the dual-parallax Himalayan range behind the primary mission-glass.</li>
              <li><strong>Summit-Drift Protocol</strong>: A triple-depth cascade featuring low-velocity particles and foreground Bokeh diffraction to simulate high-altitude immersion.</li>
              <li><strong>Arctic Pulse</strong>: A slow-pulsing background aurora synced to your mission momentum to provide subtle visual feedback during extended sorties.</li>
            </ul>

            <h3 class="docs-h3">⚡ Operational Environment: Vajra Shakti (The Power Arena)</h3>
            <p>A localized combat arena tuned for rapid information retrieval and maximum scoreboard performance.</p>
            <ul class="docs-ul">
              <li><strong>Arena Drift</strong>: A high-readability version of the Atmos-Drift protocol optimized for the athletic scoresheet aesthetic.</li>
              <li><strong>Power-Atmosphere</strong>: Features interaction-based environment glows and sharp-edged scoreboard indicators for instantaneous status updates.</li>
              <li><strong>Direct HUD Architecture</strong>: Replaces traditional card styling with clinical, sharp-cornered HUDs to reduce eye-strain during intense grinds.</li>
            </ul>

            <h3 class="docs-h3">Environmental Scaling & Performance</h3>
            <p>All atmospheric effects use <code>will-change</code> transform isolation. This allows the system to maintain a locked **60FPS** even during active blizzards, ensuring your input latency remains at clinical levels on both desktop and mobile hardware.</p>
          </section>

        </main>
      </div>
    </div>
  </div>
`;
