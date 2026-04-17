/**
 * The User Manual / Documentation reader modal.
 * Version 3.0.0: The Better Auth & Vercel Backend Edition.
 */
export const manualModal = `
  <div class="modal" id="userManualModal">
    <div class="modal-content docs-modal">
      <div class="docs-header">
        <div class="docs-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c87ff" stroke-width="2.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>MISSION DOSSIER <span class="docs-version">v3.0.0</span></span>
        </div>
        
        <div class="docs-search-shell">
          <span class="docs-search-icon">⌕</span>
          <input type="text" id="docsSearchInput" class="docs-search-input" placeholder="Search mission protocols, features, or shortcuts..." autocomplete="off">
        </div>

        <button id="closeUserManualModal" class="docs-close" title="Terminate Briefing">&times;</button>
      </div>

      <div class="docs-layout">
        <!-- Sidebar TOC -->
        <nav class="docs-sidebar" id="docsSidebar">
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Onboarding</div>
            <a class="docs-nav-link active" onclick="docScrollTo('doc-intro')">
              <span class="nav-icon">🛰️</span> Introduction
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-quickstart')">
              <span class="nav-icon">⚡</span> Hot Start
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-auth')">
              <span class="nav-icon">👤</span> Authentication
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Core Systems</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-dashboard')">
              <span class="nav-icon">📊</span> Dashboard
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-tracker')">
              <span class="nav-icon">📋</span> Study Log
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-timer')">
              <span class="nav-icon">⏱️</span> Focus Timer
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-routines')">
              <span class="nav-icon">🔄</span> Routines
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-sustainability')">
              <span class="nav-icon">🧘</span> Sustainability
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-tasks')">
              <span class="nav-icon">🎯</span> Mission Control
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Intelligence</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-analytics')">
              <span class="nav-icon">📈</span> Analytics
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-leaderboard')">
              <span class="nav-icon">🏆</span> World Stage
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-maamu')">
              <span class="nav-icon">🤖</span> Maamu AI
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Advanced</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-sync')">
              <span class="nav-icon">☁️</span> Cloud Sync
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-integrity')">
              <span class="nav-icon">🛡️</span> Integrity Engine
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-shortcuts')">
              <span class="nav-icon)⌨️</span> Hotkeys
            </a>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="docs-content" id="docsContent">
          
          <div id="docsSearchResults" style="display: none;">
             <h2 class="docs-h2">Search Results</h2>
             <div id="docsResultsList" class="docs-steps"></div>
             <div class="docs-divider"></div>
          </div>

          <div id="docsMainView">
            <!-- INTRODUCTION -->
            <section class="docs-section" id="doc-intro">
              <div class="docs-breadcrumb">Onboarding › Introduction</div>
              <h2 class="docs-h1">All Tracker</h2>
              <div class="docs-lead">An elite study command center designed for precision focus. Execute missions, visualize tactical growth, and compete globally on the World Stage.</div>
              
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🚀</div>
                  <div class="feature-card-title">Clinical Tracking</div>
                  <div class="feature-card-desc">Track every study hour with millisecond precision using the Focus Timer.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🌎</div>
                  <div class="feature-card-title">World Stage</div>
                  <div class="feature-card-desc">Sync your progress and climb the global ranks against thousands of pilots.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🤖</div>
                  <div class="feature-card-title">AI Coaching</div>
                  <div class="feature-card-desc">Maamu AI analyzes your study data and gives you brutal, honest feedback.</div>
                </div>
              </div>
            </section>

            <!-- QUICK START -->
            <section class="docs-section" id="doc-quickstart">
              <div class="docs-breadcrumb">Onboarding › Hot Start</div>
              <h2 class="docs-h2">The First 5 Minutes</h2>
              <p>Deploy your study environment following these critical steps.</p>

              <div class="docs-steps">
                <div class="docs-step">
                  <div class="docs-step-num">01</div>
                  <div class="docs-step-body">
                    <h4>OAuth Identification</h4>
                    <p>Click <strong>LOGIN</strong> and enter the Arena using your <strong>Google</strong> or <strong>GitHub</strong> account. This anchors your mission data to your professional identity.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">02</div>
                  <div class="docs-step-body">
                    <h4>Identity Lockdown</h4>
                    <p>Register your unique <strong>Pilot Handle</strong>. Choose carefully—once set, your Handle, Name, and Nation are permanently locked for leaderboard integrity.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">03</div>
                  <div class="docs-step-body">
                    <h4>Launch Mission</h4>
                    <p>Hit <strong>Start Timer</strong> on the dashboard. Select your focus category and enter the study zone.</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- AUTHENTICATION -->
            <section class="docs-section" id="doc-auth">
              <div class="docs-breadcrumb">Onboarding › Authentication</div>
              <h2 class="docs-h2">Authentication Protocols</h2>
              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-title">🛰️ Modern Identity Architecture</div>
                <p>All Tracker has transitioned to a secure, password-less OAuth system. Your data is protected by the **Better Auth** framework.</p>
              </div>

              <h3 class="docs-h3">Secure Session Flow</h3>
              <p>Your session is managed via high-security encrypted tokens. Access is granted exclusively through verified OAuth providers:</p>
              <ul class="docs-ul">
                <li><strong>Google Auth:</strong> Instant mission entry via your main workspace.</li>
                <li><strong>GitHub Integration:</strong> Link your study progress to your developer profile.</li>
              </ul>

              <h3 class="docs-h3">Integrity Enforcement</h3>
              <p>To prevent rank manipulation on the World Stage, the following fields are <strong>PERMANENTLY LOCKED</strong> after your first profile setup:</p>
              <ul class="docs-ul">
                <li>User Handle & Real Name</li>
                <li>Nationality & Primary Email</li>
              </ul>
              <p>Your **Avatar** remains tactical and can be updated at any time from the Profile Passport.</p>
            </section>

            <!-- FOCUS TIMER -->
            <section class="docs-section" id="doc-timer">
              <div class="docs-breadcrumb">Core Systems › Focus Timer</div>
              <h2 class="docs-h2">Focus Timer Engine</h2>
              <p>The timer is the heart of the system. It uses a high-frequency polling engine to track your study sessions.</p>
              
              <div class="docs-feature-grid">
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🎯</div>
                  <div class="feature-card-title">Live ETA</div>
                  <div class="feature-card-desc">Automatically predicts the wall-clock time you will complete your goal.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🛰️</div>
                  <div class="feature-card-title">Vercel Backend Sync</div>
                  <div class="feature-card-desc">Syncs your live state to the secure backend every 30s for cross-device telemetry.</div>
                </div>
              </div>
            </section>

            <!-- SUSTAINABILITY -->
            <section class="docs-section" id="doc-sustainability">
              <div class="docs-breadcrumb">Core Systems › Sustainability Engine</div>
              <h2 class="docs-h2">Sustainability Engine (SEP Protocol)</h2>
              <p>The <strong>Strategic Equilibrium Protocol (SEP)</strong> is an advanced burnout prevention system that analyzes study consistency (Heartbeat), momentum decays, and recovery debt.</p>
              
              <div class="docs-callout docs-callout-info" style="margin-top: 20px;">
                <div class="docs-callout-title">🧠 Equilibrium Analysis</div>
                <p>The engine monitors the standard deviation of your output. Elite pilots prioritize high consistency over volatile spikes.</p>
              </div>

              <h3 class="docs-h3">Tactical Statuses</h3>
              <ul class="docs-ul">
                <li><strong>EQUILIBRIUM:</strong> Elite strategic balance. High volume with perfect consistency.</li>
                <li><strong>OPTIMAL:</strong> Healthy, sustainable pace maintained with adequate rest.</li>
                <li><strong>VOLATILE:</strong> Pattern unstable. High risk of crash due to erratic study timing.</li>
                <li><strong>DEBTED:</strong> "Recovery Debt" detected. You had a spike without a follow-up deload.</li>
                <li><strong>DECAYING:</strong> Momentum loss. Your 3-day velocity is dropping vs your 14-day average.</li>
                <li><strong>CRITICAL:</strong> High burnout risk. Solidarity engine recommends an immediate 24h rest.</li>
                <li><strong>COASTING:</strong> Safe from burnout, but output is below tactical focus targets.</li>
              </ul>

              <h3 class="docs-h3">Trend Indicators</h3>
              <p>The dashboard KPIs feature dynamic arrows (↑ / ↓) showing your 7-day velocity:</p>
              <ul class="docs-ul">
                <li><span style="color:#22c55e;">Green ↑</span>: Your pace is increasing or wellness is improving.</li>
                <li><span style="color:#ef4444;">Red ↓</span>: Your study output is slowing or your burnout risk is rising.</li>
              </ul>
            </section>

            <!-- WORLD STAGE -->
            <section class="docs-section" id="doc-leaderboard">
              <div class="docs-breadcrumb">Intelligence › World Stage</div>
              <h2 class="docs-h2">The World Stage</h2>
              <p>Compete with active researchers globally. Your rank is determined by your total authenticated study hours.</p>
              
              <h3 class="docs-h3">Rank Progression</h3>
              <div class="docs-table-wrap">
                <table class="docs-table">
                  <thead><tr><th>Tactical Rank</th><th>Hours Threshold</th></tr></thead>
                  <tbody>
                    <tr><td>🛡️ RECRUIT</td><td>0 – 10h</td></tr>
                    <tr><td>🛸 PILOT</td><td>30 – 150h</td></tr>
                    <tr><td>🎖️ COMMANDER</td><td>150 – 600h</td></tr>
                    <tr><td>💎 ELITE</td><td>1200 – 5000h</td></tr>
                    <tr><td>🌌 SINGULARITY</td><td>20000h+</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- SHORTCUTS -->
            <section class="docs-section" id="doc-shortcuts">
              <div class="docs-breadcrumb">Advanced › Mission Hotkeys</div>
              <h2 class="docs-h2">Tactical Hotkeys</h2>
              <div class="docs-shortcuts-grid">
                <div class="docs-shortcut"><span>Go to Today</span> <kbd>Ctrl + T</kbd></div>
                <div class="docs-shortcut"><span>Open Heatmap</span> <kbd>Ctrl + H</kbd></div>
                <div class="docs-shortcut"><span>Mission Settings</span> <kbd>Ctrl + ,</kbd></div>
                <div class="docs-shortcut"><span>Weekly Summary</span> <kbd>Ctrl + W</kbd></div>
                <div class="docs-shortcut"><span>Global Search</span> <kbd>Ctrl + F</kbd></div>
                <div class="docs-shortcut"><span>Terminate Modal</span> <kbd>Escape</kbd></div>
              </div>
            </section>

            <!-- MAAMU AI -->
            <section class="docs-section" id="doc-maamu">
               <div class="docs-breadcrumb">Intelligence › Maamu AI</div>
               <h2 class="docs-h2">Maamu AI Mentor</h2>
               <div class="docs-callout docs-callout-warning">
                 <div class="docs-callout-title">⚠️ No Sugarcoating</div>
                 <p>Maamu is a high-fidelity AI coach. He analyzes your real study data and gives honest (often harsh) feedback about your consistency and output.</p>
               </div>
               <p>To initialize Maamu, obtain an API key from <strong>console.groq.com</strong> and paste it into the Intelligence configuration.</p>
               <ul class="docs-ul">
                 <li><strong>Token Saver Mode:</strong> Basic greetings are handled locally without API calls.</li>
                 <li><strong>Smart Context Routing:</strong> Maamu only sends tracker context for data-related prompts.</li>
                 <li><strong>Conversation Control:</strong> Export as Markdown or clear sessions instantly to manage your cache.</li>
               </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  </div>
`;
