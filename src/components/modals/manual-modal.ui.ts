export const manualModal = `
  <div class="modal" id="userManualModal">
    <div class="modal-content docs-modal">
      <div class="docs-header">

        <div class="docs-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--docs-accent)" stroke-width="3">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span class="docs-version">v4.2.0</span>
        </div>

        <div class="docs-search-shell">
          <input type="text" id="docsSearchInput" class="docs-search-input" placeholder="Search documentation..." autocomplete="off">
          <span class="docs-search-icon">⎙</span>
        </div>

        <button id="closeUserManualModal" class="docs-close" title="Close">&times;</button>
      </div>

      <div class="docs-layout">
        <!-- Sidebar TOC -->
        <nav class="docs-sidebar" id="docsSidebar">
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Getting Started</div>
            <a class="docs-nav-link active" onclick="docScrollTo('doc-intro')">
              <span class="nav-icon">👋</span> Welcome
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-quickstart')">
              <span class="nav-icon">⚡</span> Quick Start
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-auth')">
              <span class="nav-icon">🛡️</span> Security &amp; Login
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Main Features</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-dashboard')">
              <span class="nav-icon">📊</span> Command Center
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-tracker')">
              <span class="nav-icon">📝</span> Study Log
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-timer')">
              <span class="nav-icon">⏱️</span> Focus Timer
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-missions')">
              <span class="nav-icon">🎯</span> Mission Control
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-routines')">
              <span class="nav-icon">🔄</span> Routines
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-bookmarks')">
              <span class="nav-icon">🔖</span> Bookmarks
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Community &amp; AI</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-analytics')">
              <span class="nav-icon">📈</span> Growth Insights
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-leaderboard')">
              <span class="nav-icon">🏆</span> Leaderboard
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-integrity')">
              <span class="nav-icon">🛡️</span> Trust Score
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-maamu')">
              <span class="nav-icon">🤖</span> AI Mentor
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Advanced</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-heatmap')">
              <span class="nav-icon">🗺️</span> Heatmap
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-settings')">
              <span class="nav-icon">⚙️</span> Settings
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-shortcuts')">
              <span class="nav-icon">⌨️</span> Hotkeys
            </a>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="docs-content" id="docsContent">
          
          <div id="docsSearchResults" style="display: none;">
             <div class="docs-breadcrumb">Search <b>›</b> Results</div>
             <h2 class="docs-h2">Search Results</h2>
             <div id="docsResultsList" class="docs-steps"></div>
             <div class="docs-divider"></div>
          </div>

          <div id="docsMainView">

            <!-- INTRODUCTION -->
            <section class="docs-section" id="doc-intro">
              <div class="docs-breadcrumb">Welcome <b>›</b> Start Here</div>
              <h1 class="docs-h1" style="font-size: 3.5rem;">Welcome to AllTracker</h1>
              <div class="docs-lead">Your ultimate companion for elite study mastery. Stay disciplined, track your progress with absolute precision, and compete on the Global World Stage.</div>
              
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🚀</div>
                  <div class="feature-card-title">Stay Disciplined</div>
                  <div class="feature-card-desc">A high-precision focus timer ensures you build long-term study habits without manual record-keeping.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🌍</div>
                  <div class="feature-card-title">Compete Globally</div>
                  <div class="feature-card-desc">Compare your progress with students worldwide and climb the ranks of the World Stage leaderboard.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🤖</div>
                  <div class="feature-card-title">Personal AI Coach</div>
                  <div class="feature-card-desc">Get personalized advice from Maamu, your AI mentor who analyzes your study patterns.</div>
                </div>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- QUICK START -->
            <section class="docs-section" id="doc-quickstart">
              <div class="docs-breadcrumb">Onboarding <b>›</b> Step-by-Step</div>
              <h2 class="docs-h2">Quick Start Guide</h2>
              <p>Get your first study session running in 3 steps.</p>

              <div class="docs-steps">
                <div class="docs-step">
                  <div class="docs-step-num">1</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Secure Login</div>
                    <p>Click <strong>Login</strong> and sign in with your <strong>Google</strong> or <strong>GitHub</strong> account. Your data will be synced across all your devices automatically.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">2</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Choose your Pilot Handle</div>
                    <p>Pick a unique callsign. This is your permanent identity on the <strong>Global Leaderboard</strong>. Choose wisely.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">3</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Start your first Session</div>
                    <p>Go to the <strong>Command Center</strong> dashboard, select your subject on the Focus Timer, and hit <strong>Start</strong>. Your hours are logged automatically.</p>
                  </div>
                </div>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- AUTHENTICATION -->
            <section class="docs-section" id="doc-auth">
              <div class="docs-breadcrumb">Security <b>›</b> Your Privacy</div>
              <h2 class="docs-h2">Login &amp; Privacy</h2>
              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-title">🛡️ Your Data is Secure</div>
                <p>We use industry-standard encryption. Your passwords are never stored on our servers — OAuth 2.0 providers (Google, GitHub) handle all authentication.</p>
              </div>
              <h3 class="docs-h3">Why sign in?</h3>
              <ul class="docs-ul" style="padding-left: 20px;">
                <li><strong>Cloud Sync:</strong> Your study data is backed up and available from any device.</li>
                <li><strong>Leaderboard Access:</strong> Your hours count toward the Global World Stage rankings.</li>
                <li><strong>Privacy:</strong> Your personal information is never shared or sold.</li>
              </ul>
            </section>

            <div class="docs-divider"></div>

            <!-- COMMAND CENTER / DASHBOARD -->
            <section class="docs-section" id="doc-dashboard">
              <div class="docs-breadcrumb">Main Features <b>›</b> Command Center</div>
              <h2 class="docs-h2">Command Center</h2>
              <p>The Command Center is your mission HQ — a live dashboard showing your key performance indicators at a glance.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">📅</div>
                  <div class="feature-card-title">Deadline Countdown</div>
                  <div class="feature-card-desc">A live timer counting down to your exam or target date, creating urgency and focus.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🔥</div>
                  <div class="feature-card-title">Active Streak</div>
                  <div class="feature-card-desc">Your current daily study streak. Mark a rest day to freeze it without breaking it.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">⭐</div>
                  <div class="feature-card-title">XP &amp; Rank</div>
                  <div class="feature-card-desc">Every study hour earns you XP. Watch your rank climb from Iron to Singularity.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">📊</div>
                  <div class="feature-card-title">Weekly Progress</div>
                  <div class="feature-card-desc">A bar chart showing your study hours for each day of the current week.</div>
                </div>
              </div>
              <div class="docs-callout docs-callout-info" style="margin-top: 16px;">
                <div class="docs-callout-title">💡 Tip: Beast Mode</div>
                <p>Enable <strong>Beast Mode</strong> in Settings to switch your AI Mentor to high-intensity coaching — no excuses, only data.</p>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- STUDY LOG / TRACKER -->
            <section class="docs-section" id="doc-tracker">
              <div class="docs-breadcrumb">Main Features <b>›</b> Study Log</div>
              <h2 class="docs-h2">Study Log</h2>
              <p>The Study Log is your permanent record — a scrollable table of every day in your mission timeline. Each row represents one day.</p>
              <h3 class="docs-h3">How to log a day</h3>
              <div class="docs-steps">
                <div class="docs-step">
                  <div class="docs-step-num">1</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Find today's row</div>
                    <p>Use <kbd>Ctrl + T</kbd> to instantly jump to today's entry in the table.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">2</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Enter your hours</div>
                    <p>Click any cell in your subject columns and type the number of hours you studied for that subject.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">3</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Mark as Complete</div>
                    <p>Check the <strong>✓</strong> checkbox at the end of the row to mark the day as a successful study day and build your streak.</p>
                  </div>
                </div>
              </div>
              <div class="docs-callout docs-callout-info" style="margin-top: 16px;">
                <div class="docs-callout-title">🔒 Iron-Gate Protection</div>
                <p>Historical data is locked for editing after <strong>4:00 AM</strong> the following morning to ensure data integrity. You cannot alter yesterday's record after this window closes.</p>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- FOCUS TIMER -->
            <section class="docs-section" id="doc-timer">
              <div class="docs-breadcrumb">Main Features <b>›</b> Focus Timer</div>
              <h2 class="docs-h2">The Focus Timer</h2>
              <p>The Focus Timer automatically logs your study hours as you work — no manual entry required. Simply start it when you begin and stop it when you finish.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">⏱️</div>
                  <div class="feature-card-title">Auto-Logging</div>
                  <div class="feature-card-desc">Hours are calculated and written directly into today's Study Log when you stop the timer.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">⚡</div>
                  <div class="feature-card-title">Grind Guard</div>
                  <div class="feature-card-desc">Sessions are capped at 3 hours to prevent "zombie logs." Approaching the limit? Click the golden EXTEND button on the HUD to grant yourself another hour.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🛡️</div>
                  <div class="feature-card-title">Insomniac Mode</div>
                  <div class="feature-card-desc">The app aggressively prevents your laptop from sleeping while the timer is active—even during breaks—so you never lose sight of your mission.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">📡</div>
                  <div class="feature-card-title">Cross-Device Sync</div>
                  <div class="feature-card-desc">Start on mobile, follow on desktop. Your session status, subject, and elapsed time sync across all active devices in real-time.</div>
                </div>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- MISSION CONTROL (TASKS) -->
            <section class="docs-section" id="doc-missions">
              <div class="docs-breadcrumb">Main Features <b>›</b> Mission Control</div>
              <h2 class="docs-h2">Mission Control</h2>
              <p>Mission Control is your daily task manager. Add objectives for the day, prioritize them, and track your clearance rate in real-time.</p>

              <h3 class="docs-h3">Daily Clearance Bar</h3>
              <p>The progress bar at the top of Mission Control shows your <strong>Daily Clearance %</strong> — the percentage of today's tasks you have completed. It turns <span style="color:#10b981;font-weight:700;">green</span> when you hit 100%.</p>

              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-title">📌 Note on Future Tasks</div>
                <p>If you have no tasks for today, the nearest upcoming task is shown as a preview. However, it does <strong>not</strong> count toward your Daily Clearance — only tasks scheduled for today affect the bar.</p>
              </div>

              <h3 class="docs-h3">Priority Levels</h3>
              <div class="docs-table-wrap">
                <table class="docs-table">
                  <thead>
                    <tr><th>BADGE</th><th>LEVEL</th><th>USE WHEN</th></tr>
                  </thead>
                  <tbody>
                    <tr><td style="color:#34d399;font-weight:700;">L</td><td>Low</td><td>Nice-to-do, no deadline pressure.</td></tr>
                    <tr><td style="color:#fbbf24;font-weight:700;">M</td><td>Medium</td><td>Standard tasks with moderate importance.</td></tr>
                    <tr><td style="color:#f87171;font-weight:700;">H</td><td>High</td><td>Critical objectives — shown first in your queue.</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 class="docs-h3">The Backlog</h3>
              <p>Any task that remains incomplete past its assigned date is automatically moved to <strong>The Backlog</strong>. A badge in the header shows you how many unresolved tasks are waiting. Clear your backlog regularly to stay on track.</p>

              <h3 class="docs-h3">History</h3>
              <p>Completed tasks are stored in the <strong>History</strong> section for up to <strong>3 days</strong>, then automatically cleaned up to keep your log lean.</p>
            </section>

            <div class="docs-divider"></div>

            <!-- ROUTINES -->
            <section class="docs-section" id="doc-routines">
              <div class="docs-breadcrumb">Main Features <b>›</b> Routines</div>
              <h2 class="docs-h2">Routines</h2>
              <p>Routines are your recurring daily habits — things you want to do every single day, separate from your one-off study tasks.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">✅</div>
                  <div class="feature-card-title">Daily Check-ins</div>
                  <div class="feature-card-desc">Mark each routine item as done daily. Your completion rate is tracked in the Growth Insights panel.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🔁</div>
                  <div class="feature-card-title">Automatic Reset</div>
                  <div class="feature-card-desc">Routines reset every day at midnight so you always start fresh with a clean checklist.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">➕</div>
                  <div class="feature-card-title">Custom Items</div>
                  <div class="feature-card-desc">Add, edit, or remove any routine item. Build the exact daily ritual that works for you.</div>
                </div>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- BOOKMARKS -->
            <section class="docs-section" id="doc-bookmarks">
              <div class="docs-breadcrumb">Main Features <b>›</b> Bookmarks</div>
              <h2 class="docs-h2">Bookmarks</h2>
              <p>Save, organize, and instantly access all your important study links in one place — no more digging through browser tabs.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🗂️</div>
                  <div class="feature-card-title">Folders</div>
                  <div class="feature-card-desc">Organize bookmarks into categories like Development, Learning, Work, and more.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🔍</div>
                  <div class="feature-card-title">Quick Find</div>
                  <div class="feature-card-desc">Filter your bookmarks by name or URL instantly to find exactly what you need.</div>
                </div>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- GROWTH INSIGHTS / ANALYTICS -->
            <section class="docs-section" id="doc-analytics">
              <div class="docs-breadcrumb">Community &amp; AI <b>›</b> Growth Insights</div>
              <h2 class="docs-h2">Growth Insights</h2>
              <p>Growth Insights gives you a data-driven view of your study habits — not just totals, but patterns, stability, and trends over time.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">📉</div>
                  <div class="feature-card-title">SEP Score</div>
                  <div class="feature-card-desc">The Strategic Equilibrium Protocol measures consistency. High variation in your study days reduces this score. A stable routine maximizes it.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">📊</div>
                  <div class="feature-card-title">Weekly Charts</div>
                  <div class="feature-card-desc">Visualize your study hours split by subject category across the last 7 days.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🏅</div>
                  <div class="feature-card-title">Badges</div>
                  <div class="feature-card-desc">Earn achievements for streaks, total hours, and weekend study sessions. Badges are displayed on your leaderboard profile.</div>
                </div>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- LEADERBOARD -->
            <section class="docs-section" id="doc-leaderboard">
              <div class="docs-breadcrumb">Community &amp; AI <b>›</b> Global Rankings</div>
              <h2 class="docs-h2">The Global Leaderboard</h2>
              <p>Compete with dedicated students worldwide. Your position is decided by your <strong>Rank Score</strong>, a multi-factor score that rewards consistency and integrity.</p>
              
              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-title">⚔️ Rank Score Formula</div>
                <p><strong>Rank Score</strong> = (Hours &times; 100) + (Current Streak &times; 50) + (Trust Score &times; 2)</p>
              </div>

              <h3 class="docs-h3">Rank Tiers</h3>
              <div class="docs-table-wrap">
                <table class="docs-table">
                  <thead>
                    <tr><th>RANK</th><th>HOURS NEEDED</th><th>BADGE</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Recruit</td><td>0 – 10 hrs</td><td>⚙️</td></tr>
                    <tr><td>Cadet</td><td>10 – 30 hrs</td><td>🎖️</td></tr>
                    <tr><td>Pilot</td><td>30 – 70 hrs</td><td>🚀</td></tr>
                    <tr><td>Officer</td><td>70 – 150 hrs</td><td>🛡️</td></tr>
                    <tr><td>Commander</td><td>150 – 300 hrs</td><td>🛸</td></tr>
                    <tr><td>Captain</td><td>300 – 600 hrs</td><td>⚔️</td></tr>
                    <tr><td>Veteran</td><td>600 – 1,200 hrs</td><td>🏅</td></tr>
                    <tr><td>Elite</td><td>1,200 – 2,500 hrs</td><td>🔥</td></tr>
                    <tr><td>Legend</td><td>2,500 – 5,000 hrs</td><td>✨</td></tr>
                    <tr><td>Eternal</td><td>5,000 – 10,000 hrs</td><td>🌟</td></tr>
                    <tr><td>Deity</td><td>10,000 – 20,000 hrs</td><td>🌌</td></tr>
                    <tr><td>Singularity</td><td>20,000+ hrs</td><td>⚛️</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- INTEGRITY & TRUST -->
            <section class="docs-section" id="doc-integrity">
              <div class="docs-breadcrumb">Community &amp; AI <b>›</b> Mission Integrity</div>
              <h2 class="docs-h2">Trust Score &amp; Verification</h2>
              <p>The World Stage is built on fairness. The Integrity Engine verifies your study habits to ensure a level playing field.</p>
              
              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-title">🔘 The Blue Tick (Verified Operative)</div>
                <p>Cross the <strong>75% Trust Threshold</strong> to earn the elite Blue Tick next to your name. This proves your hours are backed by real Live Timer logs.</p>
              </div>

              <h3 class="docs-h3">How it's calculated</h3>
              <p>Your Trust Score is the ratio of <strong>Verified Timer Hours</strong> to <strong>Total Table Hours</strong>. If you enter 10 hours manually but only use the timer for 1 hour, your score drops. Use the Focus Timer for all your grinds to maintain a high-integrity profile.</p>

              <h3 class="docs-h3">Broadcast Guard</h3>
              <p>The system uses a <strong>Hybrid Sync</strong> protocol. If you study offline or on a slow connection, the app remembers your session logs locally and only broadcasts your score once it is perfectly verified with the cloud.</p>
            </section>

            <div class="docs-divider"></div>

            <!-- AI MENTOR (MAAMU) -->
            <section class="docs-section" id="doc-maamu">
              <div class="docs-breadcrumb">Community &amp; AI <b>›</b> AI Mentor</div>
              <h2 class="docs-h2">Maamu — AI Mentor</h2>
              <p>Maamu is your personal AI strategist. It analyzes your study data and delivers context-aware coaching, not generic motivational quotes.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🧠</div>
                  <div class="feature-card-title">Context-Aware</div>
                  <div class="feature-card-desc">Maamu reads your last 14 days of sessions, your active backlog, rank, and streak before responding.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">⚔️</div>
                  <div class="feature-card-title">Beast Mode</div>
                  <div class="feature-card-desc">Enable Beast Mode for aggressive, metric-focused tactical feedback. Disable for a calm, analytical coaching style.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🔑</div>
                  <div class="feature-card-title">Bring Your Own Key</div>
                  <div class="feature-card-desc">Add your own Groq API key in Settings to use Maamu without limits.</div>
                </div>
              </div>
              <div class="docs-callout docs-callout-info" style="margin-top: 16px;">
                <div class="docs-callout-title">💡 How to get a Groq API key</div>
                <p>Visit <strong>console.groq.com</strong>, create a free account, and generate an API key. Paste it into <strong>Settings → AI Mentor → API Key</strong>.</p>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- HEATMAP -->
            <section class="docs-section" id="doc-heatmap">
              <div class="docs-breadcrumb">Advanced <b>›</b> Heatmap</div>
              <h2 class="docs-h2">Activity Heatmap</h2>
              <p>The Heatmap gives you a GitHub-style calendar view of your entire study history. Each cell represents one day — the brighter the cell, the more hours you studied.</p>
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🗓️</div>
                  <div class="feature-card-title">Full History View</div>
                  <div class="feature-card-desc">See your entire mission timeline from start to your target exam date in one compact grid.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🎨</div>
                  <div class="feature-card-title">Color Intensity</div>
                  <div class="feature-card-desc">Cells scale from dim (light study) to bright (heavy study) so you can spot gaps and strong weeks instantly.</div>
                </div>
              </div>
              <p>Open the Heatmap anytime with <kbd>Ctrl + H</kbd>.</p>
            </section>

            <div class="docs-divider"></div>

            <!-- SETTINGS -->
            <section class="docs-section" id="doc-settings">
              <div class="docs-breadcrumb">Advanced <b>›</b> Settings</div>
              <h2 class="docs-h2">Settings</h2>
              <p>Customize AllTracker to match your mission parameters exactly.</p>
              <div class="docs-table-wrap">
                <table class="docs-table">
                  <thead>
                    <tr><th>SETTING</th><th>WHAT IT DOES</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Mission Dates</strong></td><td>Set your study start date and target exam/goal date. This drives the deadline countdown and streak calendar.</td></tr>
                    <tr><td><strong>Subject Columns</strong></td><td>Define your study subjects (e.g., DSA, Python, Projects) and set target hours for each.</td></tr>
                    <tr><td><strong>Theme</strong></td><td>Switch between visual themes: Default, Kaala (dark), and others.</td></tr>
                    <tr><td><strong>Timer Style</strong></td><td>Choose between Ring (circular) or Block (digital) timer display.</td></tr>
                    <tr><td><strong>Beast Mode</strong></td><td>Toggles Maamu AI between aggressive coaching and analytical strategy mode.</td></tr>
                    <tr><td><strong>AI API Key</strong></td><td>Add your personal Groq API key for unlimited AI Mentor access.</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- SHORTCUTS -->
            <section class="docs-section" id="doc-shortcuts">
              <div class="docs-breadcrumb">Advanced <b>›</b> Hotkeys</div>
              <h2 class="docs-h2">Hotkeys &amp; Macros</h2>
              <div class="docs-shortcuts-grid">
                <div class="docs-shortcut"><span>Go to Today</span> <kbd>Ctrl + T</kbd></div>
                <div class="docs-shortcut"><span>Open Heatmap</span> <kbd>Ctrl + H</kbd></div>
                <div class="docs-shortcut"><span>Mission Settings</span> <kbd>Ctrl + ,</kbd></div>
                <div class="docs-shortcut"><span>Weekly Summary</span> <kbd>Ctrl + W</kbd></div>
                <div class="docs-shortcut"><span>Global Search</span> <kbd>Ctrl + F</kbd></div>
                <div class="docs-shortcut"><span>Close Modal</span> <kbd>ESC</kbd></div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  </div>
`;
