export const manualModal = `
  <div class="modal" id="userManualModal">
    <div class="modal-content docs-modal">
      <div class="docs-header">

        <div class="docs-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--docs-accent)" stroke-width="3">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span class="docs-version">v4.0.0</span>
        </div>

        <!-- Live Telemetry Bar -->
        <div class="docs-telemetry-bar">
          <div class="tel-item"><span class="tel-label">SYSTEM:</span> <span class="tel-value">ON-LINE</span></div>
          <div class="tel-item"><span class="tel-label">SESSION:</span> <span id="tel-session-time" class="tel-value">00:00:00</span></div>
          <div class="tel-item"><span class="tel-label">SYNC:</span> <span class="tel-value pulse">SECURE</span></div>
        </div>

        <div class="docs-search-shell">

          <input type="text" id="docsSearchInput" class="docs-search-input" placeholder="Initiate protocol lookup..." autocomplete="off">
          <span class="docs-search-icon">⎙</span>
        </div>

        <button id="closeUserManualModal" class="docs-close" title="Terminate Briefing">&times;</button>
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
              <span class="nav-icon">🛡️</span> Security & Login
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
            <a class="docs-nav-link" onclick="docScrollTo('doc-routines')">
              <span class="nav-icon">🔄</span> Routines
            </a>
          </div>
          <div class="docs-sidebar-section">
            <div class="docs-sidebar-label">Community & AI</div>
            <a class="docs-nav-link" onclick="docScrollTo('doc-analytics')">
              <span class="nav-icon">📈</span> Growth Insights
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-leaderboard')">
              <span class="nav-icon">🏆</span> Leaderboard
            </a>
            <a class="docs-nav-link" onclick="docScrollTo('doc-maamu')">
              <span class="nav-icon">🤖</span> AI Mentor
            </a>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="docs-content" id="docsContent">
          
          <div id="docsSearchResults" style="display: none;">
             <div class="docs-breadcrumb">Search <b>›</b> Protocol Lookup</div>
             <h2 class="docs-h2">Search Results</h2>
             <div id="docsResultsList" class="docs-steps"></div>
             <div class="docs-divider"></div>
          </div>

          <div id="docsMainView">
            <!-- INTRODUCTION -->
            <section class="docs-section" id="doc-intro">
              <div class="docs-breadcrumb">Welcome <b>›</b> Start Here</div>
              <h1 class="docs-h1" style="font-size: 3.5rem;">Welcome to AllTracker</h1>
              
              <div class="docs-hero-img-wrap">
                <img src="/C:/Users/ankit/.gemini/antigravity/brain/f6b9b2cd-1c3f-4b52-9264-c13a0e42b08a/world_stage_concept_1776520593221.png" class="docs-hero-img" alt="World Stage Concept">
              </div>

              <div class="docs-lead">Your ultimate companion for elite study mastery. We help you stay disciplined, track your progress with absolute precision, and compete on the Global World Stage.</div>
              
              <div class="docs-feature-grid">

                <div class="docs-feature-card">
                  <div class="feature-card-icon">🚀</div>
                  <div class="feature-card-title">Stay Disciplined</div>
                  <div class="feature-card-desc">Our high-precision focus timer ensures you stay on track and build long-term study habits.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🌍</div>
                  <div class="feature-card-title">Compete Globally</div>
                  <div class="feature-card-desc">Compare your progress with students worldwide and climb the ranks of dedicated pilots.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">🤖</div>
                  <div class="feature-card-title">Personal AI Coach</div>
                  <div class="feature-card-desc">Get personalized advice from Maamu, your AI mentor who analyzes your study patterns.</div>
                </div>
              </div>
            </section>

            <!-- QUICK START -->
            <section class="docs-section" id="doc-quickstart">
              <div class="docs-breadcrumb">Onboarding <b>›</b> Step-by-Step</div>
              <h2 class="docs-h2">Quick Start Guide</h2>
              <p>Follow these 3 simple steps to get your first study session running.</p>

              <div class="docs-steps">
                <div class="docs-step">
                  <div class="docs-step-num">1</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Secure Login</div>
                    <p>Click the <strong>Login</strong> button and use your <strong>Google</strong> or <strong>GitHub</strong> account. This keeps your data safe and synced across all your devices.</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">2</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Choose your Pilot Handle</div>
                    <p>Pick a unique name for yourself. This will be your identity on the <strong>Leaderboard</strong>. Choose wisely, as this is your permanent callsign!</p>
                  </div>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">3</div>
                  <div class="docs-step-body">
                    <div class="docs-callout-title">Start your first Session</div>
                    <p>Go to your dashboard, click **"Start Session"** on the Focus Timer, and begin your study journey. Your progress will be tracked automatically.</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- AUTHENTICATION -->
            <section class="docs-section" id="doc-auth">
              <div class="docs-breadcrumb">Security <b>›</b> Your Privacy</div>
              <h2 class="docs-h2">Login & Privacy</h2>
              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-title">🛡️ Your Data is Secure</div>
                <p>We use industry-standard encryption. Your passwords are never stored on our servers; we only use secure login providers like Google and GitHub.</p>
              </div>

              <h3 class="docs-h3">Why sign in?</h3>
              <p>Signing in allows you to save your progress, compete on the leaderboard, and access your study history from any device.</p>
              
              <ul class="docs-ul" style="padding-left: 20px;">
                <li><strong>Cloud Sync:</strong> Your data is saved automatically.</li>
                <li><strong>Privacy:</strong> We never share your personal information.</li>
              </ul>
            </section>

            <!-- FOCUS TIMER -->
            <section class="docs-section" id="doc-timer">
              <div class="docs-breadcrumb">Features <b>›</b> Focus Timer</div>
              <h2 class="docs-h2">The Focus Timer</h2>

              <div class="docs-content-img-wrap">
                <img src="/C:/Users/ankit/.gemini/antigravity/brain/f6b9b2cd-1c3f-4b52-9264-c13a0e42b08a/focus_timer_concept_1776520444925.png" class="docs-content-img" alt="Focus Timer Concept">
              </div>

              <p>Our intelligent timer helps you maintain deep work sessions without the need for manual record-keeping.</p>
              
              <div class="docs-feature-grid">

                <div class="docs-feature-card">
                  <div class="feature-card-icon">⏱️</div>
                  <div class="feature-card-title">Auto-Sync</div>
                  <div class="feature-card-desc">Your study progress is saved to the cloud every minute, so you never lose a single second of work.</div>
                </div>
                <div class="docs-feature-card">
                  <div class="feature-card-icon">⚡</div>
                  <div class="feature-card-title">Speed Insights</div>
                  <div class="feature-card-desc">See how your current session contributes to your weekly goals in real-time.</div>
                </div>
              </div>
            </section>

            <!-- WORLD STAGE -->
            <section class="docs-section" id="doc-leaderboard">
              <div class="docs-breadcrumb">Community <b>›</b> Global Rankings</div>
              <h2 class="docs-h2">The Global Leaderboard</h2>
              <p>Compare your total study hours with other dedicated students around the world. Level up your rank as you put in the work.</p>
              
              <div class="docs-table-wrap">
                <table class="docs-table">
                  <thead>
                    <tr>
                      <th>RANK TITLE</th>
                      <th>HOURS NEEDED</th>
                      <th>BADGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Recruit</td>
                      <td>0 – 10 Hours</td>
                      <td>🛡️</td>
                    </tr>
                    <tr>
                      <td>Active Pilot</td>
                      <td>30 – 150 Hours</td>
                      <td>🛸</td>
                    </tr>
                    <tr>
                      <td>Commander</td>
                      <td>150 – 600 Hours</td>
                      <td>🎖️</td>
                    </tr>
                    <tr>
                      <td>Elite Student</td>
                      <td>1200+ Hours</td>
                      <td>💎</td>
                    </tr>
                    <tr>
                      <td>Singularity</td>
                      <td>20,000+ Hours</td>
                      <td>🌌</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- SHORTCUTS -->
            <section class="docs-section" id="doc-shortcuts">
              <div class="docs-breadcrumb">Advanced <b>›</b> Transmission Keys</div>
              <h2 class="docs-h2">Hotkeys & Macros</h2>
              <div class="docs-shortcuts-grid">
                <div class="docs-shortcut"><span>Go to Today</span> <kbd>Ctrl + T</kbd></div>
                <div class="docs-shortcut"><span>Open Heatmap</span> <kbd>Ctrl + H</kbd></div>
                <div class="docs-shortcut"><span>Mission Settings</span> <kbd>Ctrl + ,</kbd></div>
                <div class="docs-shortcut"><span>Weekly Summary</span> <kbd>Ctrl + W</kbd></div>
                <div class="docs-shortcut"><span>Global Search</span> <kbd>Ctrl + F</kbd></div>
                <div class="docs-shortcut"><span>Abort Modal</span> <kbd>ESC</kbd></div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  </div>
`;
