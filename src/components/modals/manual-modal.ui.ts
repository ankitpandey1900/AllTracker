export const manualModal = `
  <div class="modal" id="userManualModal">
    <div class="modal-content docs-modal">
      <div class="docs-header">
        <div class="docs-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6a86ff" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>ALL Tracker <span class="docs-version">v2.0 Docs</span></span>
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
        </nav>

        <!-- Main Content -->
        <main class="docs-content">

          <!-- INTRODUCTION -->
          <section class="docs-section" id="doc-intro">
            <div class="docs-breadcrumb">Getting Started › Introduction</div>
            <h1 class="docs-h1">ALL Tracker</h1>
            <p class="docs-lead">A professional, self-hosted study command center built for serious learners. Track every hour, visualize your growth, compete globally, and protect your data with secure cloud sync.</p>
            <div class="docs-callout docs-callout-info">
              <div class="docs-callout-title">📌 What is ALL Tracker?</div>
              <p>ALL Tracker is a full-featured productivity application designed to track multi-category study hours over a defined date range. It includes a real-time Focus Timer, Routine Checklist, Analytics Engine, Global Leaderboard, and a secure cloud sync system backed by Supabase.</p>
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
            <p>ALL Tracker uses a two-layer identity system: a public <strong>User ID</strong> (your display name in the Arena) and a private <strong>Vault Key</strong> (your password).</p>

            <h3 class="docs-h3">Register</h3>
            <ol class="docs-ol">
              <li>Click <strong>LOGIN</strong> → Switch to the <strong>Register</strong> tab.</li>
              <li>Enter a unique <strong>User ID</strong> — this becomes your permanent public handle. Choose carefully; it cannot be changed.</li>
              <li>Enter a <strong>Vault Key</strong> (minimum 6 characters). This is your private password.</li>
              <li>Fill in your <strong>Age</strong> and <strong>Nation</strong> for the leaderboard.</li>
              <li>Click <strong>INITIALIZE IDENTITY</strong>. A <strong>12-character Recovery Key</strong> is generated and shown. <em>Save it somewhere safe.</em></li>
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
                  <tr><td><code>World Rank</code></td><td>Estimated global rank based on total hours (simulated vs 40M students)</td></tr>
                  <tr><td><code>XP / Level</code></td><td>1 hour = 100 XP. 1000 XP = 1 Level. Progress bar fills with each session.</td></tr>
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

            <h3 class="docs-h3">Session Goal Ring</h3>
            <p>Set a session goal (in minutes) in the header. The progress ring fills as you study, turning gold at 80% and green at 100%.</p>
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
              <li>Data syncs on every timer stop, session entry, or page load.</li>
              <li>A <strong>green pulse dot</strong> next to a user's name means they are currently in a focus session.</li>
              <li>Each entry shows: Nation flag, display name, rank, age, today's hours, and total hours.</li>
            </ul>

            <h3 class="docs-h3">Your Identity Profile</h3>
            <p>Click your name pill in the header to open the Identity Profile modal. You can view your passport stats (total hours, today's hours) and update your age/nation. Your User ID is permanently locked after registration.</p>
          </section>

          <div class="docs-divider"></div>

          <!-- BADGES -->
          <section class="docs-section" id="doc-badges">
            <div class="docs-breadcrumb">Analytics › Badges &amp; Ranks</div>
            <h2 class="docs-h2">Badges &amp; Rank System</h2>

            <h3 class="docs-h3">Rank Tiers</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead><tr><th>Rank</th><th>Hours Required</th></tr></thead>
                <tbody>
                  <tr><td>🩶 Iron</td><td>0 – 50h</td></tr>
                  <tr><td>🟤 Bronze</td><td>50 – 150h</td></tr>
                  <tr><td>⚪ Silver</td><td>150 – 350h</td></tr>
                  <tr><td>🟡 Gold</td><td>350 – 700h</td></tr>
                  <tr><td>💠 Diamond</td><td>700 – 1200h</td></tr>
                  <tr><td>🔮 Eternal</td><td>1200h+</td></tr>
                </tbody>
              </table>
            </div>
            <p>Each rank has 5 divisions (I–V) and a unique title. Your rank is displayed on the dashboard and broadcast to the leaderboard.</p>

            <h3 class="docs-h3">Achievement Badges</h3>
            <p>Badges are unlocked by hitting specific milestones (streaks, total hours, problem counts). View your badge collection from the Badges button on the dashboard.</p>

            <h3 class="docs-h3">Arena Share Card 🚀</h3>
            <p>Flex your progress with the <strong>Arena Share Card</strong>. Click the "Share Stats" button in the dashboard hero to generate a high-fidelity PNG of your current Level, Rank, total hours, and streak. Perfect for sharing your growth in the Arena with others.</p>
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

        </main>
      </div>
    </div>
  </div>
`;
