import '@/styles/main.css';
import '@/styles/components/manual-page.css';

const root = document.getElementById('manual-root');

if (root) {
  root.innerHTML = `
    <div class="manual-shell">
      <header class="manual-topbar">
        <a class="manual-brand" href="/" aria-label="Return to All Tracker dashboard"><img src="/icon-512.png" alt="All Tracker" /></a>
        <div class="manual-topbar-actions">
          <label class="manual-search" for="manualSearch">
            <span class="manual-search-label">Search</span>
            <input id="manualSearch" type="search" placeholder="Search documentation" autocomplete="off" />
          </label>
          <a class="manual-back" href="/">Open app</a>
        </div>
      </header>

      <div class="manual-layout">
        <aside class="manual-sidebar" aria-label="Manual navigation">
          <div class="manual-sidebar-title">User Manual</div>
          <nav>
            <a href="#getting-started">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Getting Started
            </a>
            <a href="#dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>
              Dashboard Overview
            </a>
            <a href="#settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Settings & Target
            </a>
            <a href="#categories">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"></path><path d="m6 16 6-12 6 12"></path><path d="M8 12h8"></path></svg>
              Setup Categories
            </a>
            <a href="#timer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Focus Timer
            </a>
            <a href="#tasks">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
              Tasks & Bookmarks
            </a>
            <a href="#maamu">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Maamu (AI)
            </a>
            <a href="#faq">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              FAQ
            </a>
          </nav>
        </aside>

        <main class="manual-content" id="manualContent">
          <article class="manual-article">
          <section class="manual-intro searchable" id="getting-started">
            <p class="manual-eyebrow">ALL TRACKER · USER MANUAL</p>
            <h1>Keep your study work in one place.</h1>
            <p class="manual-lead">Welcome to All Tracker. This guide will walk you through everything you need to know to master your daily workflow.</p>
            
            <div class="manual-cards">
              <a href="#timer" class="manual-card">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <h3>Focus Timer</h3>
                <p>Learn how to track deep work sessions.</p>
              </a>
              <a href="#tasks" class="manual-card">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                <h3>Tasks</h3>
                <p>Manage priorities and daily to-dos.</p>
              </a>
              <a href="#maamu" class="manual-card">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <h3>Maamu AI</h3>
                <p>Talk to your personalized study coach.</p>
              </a>
              <a href="#categories" class="manual-card">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"></path><path d="m6 16 6-12 6 12"></path><path d="M8 12h8"></path></svg>
                <h3>Categories</h3>
                <p>Organize phases and subjects.</p>
              </a>
            </div>

            <h2>1. Getting Started</h2>
            <h3>Creating an Account</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">Go to the main page and click <kbd>Create Account</kbd>.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Enter your email address and a secure password.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Once registered, you will be redirected to the dashboard. Your data will now securely sync across all your devices.</div>
              </div>
            </div>
            
            <h3>Logging In</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">If you already have an account, enter your credentials and click <kbd>Sign In</kbd>.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Wait a few seconds for your cloud data (phases, timer state, bookmarks) to sync to your current device.</div>
              </div>
            </div>
            <div class="manual-note warning"><strong>Warning:</strong> Do not use browser storage or Settings to migrate data. Logging in automatically syncs your data.</div>
          </section>

          <section class="manual-section searchable" id="dashboard">
            <h2>2. Dashboard Overview</h2>
            <p>The Dashboard is your command center. From here, you can see your daily progress, active tasks, and recent study sessions.</p>
            <ul>
              <li><strong>Study Log:</strong> A visual timeline of your study history. Every row is one calendar day showing subject hours, topics, and completion state.</li>
              <li><strong>Focus Timer Button:</strong> Located in the top right, use this to quickly launch the timer overlay and begin a session.</li>
              <li><strong>World Stage:</strong> View the leaderboard to compare your verified work against others.</li>
            </ul>
          </section>

          <section class="manual-section searchable" id="settings">
            <h2>3. Settings & Target Setup</h2>
            <p>Before you start tracking, you need to configure your daily goals and preferences.</p>
            <h3>How to set your Daily Target</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">Click your <strong>Username</strong> or Profile Icon in the top left corner to open the Settings modal.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Under the <strong>General</strong> tab, find the "Session Goal" or "Daily Target" field.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Enter the number of hours you want to study each day (e.g., 6 hours).</div>
              </div>
              <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">This target will be used by the dashboard and Maamu to measure your daily completion percentage.</div>
              </div>
            </div>
            
            <h3>Customizing Appearance</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">In Settings, navigate to the <strong>Appearance</strong> section.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Choose a Theme (e.g., Tactical Navy, Obsidian Glass) and your preferred Accent Color.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Your theme updates instantly. Click <kbd>Save & Sync</kbd> to push this to your other devices.</div>
              </div>
            </div>
          </section>

          <section class="manual-section searchable" id="categories">
            <h2>4. Setup Categories & Phases</h2>
            <p>Categories (or Subjects) define what you are actually studying. They are grouped into "Phases" (date ranges).</p>
            <h3>How to create a Phase & Categories</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">Open <strong>Settings</strong> and go to the <strong>Study Phases</strong> tab.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Click <kbd>Add Phase</kbd>.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Give it a name (e.g., "Semester 1", "DSA Prep").</div>
              </div>
              <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">Select the <strong>Start Date</strong> and <strong>End Date</strong> for this phase.</div>
              </div>
              <div class="step">
                <div class="step-num">5</div>
                <div class="step-content">Under "Columns/Subjects", type the name of a category (e.g., "Mathematics", "Coding") and add it.</div>
              </div>
              <div class="step">
                <div class="step-num">6</div>
                <div class="step-content">Save the phase. These specific subjects will now appear on the dashboard <em>only</em> for the dates within this phase.</div>
              </div>
            </div>
            <div class="manual-note info"><strong>Why dates matter:</strong> Phases allow you to switch your subjects when a new semester starts without deleting your old study history!</div>
          </section>

          <section class="manual-section searchable" id="timer">
            <h2>5. Focus Timer Workflow</h2>
            <p>The Focus Timer is the core of All Tracker. It records exactly how much time you spend on each category.</p>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">Click the green <kbd>Start Timer</kbd> button on the dashboard.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Select the <strong>Category</strong> you are about to study from the dropdown.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Click <kbd>Start Focus</kbd>. The timer will begin running in the background.</div>
              </div>
              <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">When you finish your session, open the timer again and click <kbd>Stop & Save</kbd>.</div>
              </div>
              <div class="step">
                <div class="step-num">5</div>
                <div class="step-content">Add a short note about what you accomplished (e.g., "Finished Chapter 4"). This note is added to your daily log.</div>
              </div>
            </div>
          </section>

          <section class="manual-section searchable" id="tasks">
            <h2>6. Tasks & Bookmarks</h2>
            <h3>Managing Tasks</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">Click the <strong>Tasks</strong> tab on the top navigation bar.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Type a new task and press <kbd>Enter</kbd>. You can assign it a priority (High, Medium, Low).</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Tasks sync instantly. When you complete a task, check the box and it moves to the completed list.</div>
              </div>
            </div>
            
            <h3>Using the Bookmarks Vault</h3>
            <div class="manual-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">Click your profile menu and select <strong>Bookmarks Vault</strong>.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">Click <kbd>Add Bookmark</kbd>.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">Enter the URL of a YouTube video, PDF, or website, give it a title, and assign it to a category (Learning, Development, etc.).</div>
              </div>
              <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">Your bookmarks are now securely saved and accessible from any device.</div>
              </div>
            </div>
          </section>

          <section class="manual-section searchable" id="maamu">
            <h2>7. Maamu (AI Coach)</h2>
            <p>Maamu is your personal AI study coach built into the app.</p>
            <ul>
              <li><strong>How to access:</strong> Click the Maamu icon (usually in the bottom right or via the dashboard).</li>
              <li><strong>What it does:</strong> Maamu can analyze your study log, check if you are meeting your Daily Targets, and provide personalized study plans.</li>
              <li><strong>Limits:</strong> To prevent abuse, Maamu usage is limited to 3 prompts per 24-hour period. Make your questions count!</li>
            </ul>
          </section>

          <section class="manual-section searchable" id="faq">
            <h2>8. Frequently Asked Questions (FAQ)</h2>
            
            <h3>Why is my data missing after a refresh?</h3>
            <p>First, confirm that you are signed in to the correct account. Refresh the page once and wait a few seconds for the cloud sync to complete. Do not repeatedly save blank settings, as this might overwrite your actual data.</p>
            
            <h3>Why can't I see my subjects/categories?</h3>
            <p>Check your <strong>Study Phases</strong> in Settings. The Study Log only shows columns for dates that fall <em>inside</em> the active phase. If today's date is not inside any phase, no subjects will appear.</p>
            
            <h3>Can I run the timer on multiple devices?</h3>
            <p>You can <em>manage</em> the timer from multiple devices, but you should not run two different timers at the same time. The server will sync the active timer state to your other devices automatically.</p>
            
            <h3>Why am I getting a "Maamu Limit Reached" error?</h3>
            <p>Maamu allows up to 3 AI interactions per day to manage server costs. Your limit will reset automatically at midnight.</p>

            <h3>How do I increase my Leaderboard Rank?</h3>
            <p>The leaderboard rewards verified study sessions. Ensure you use the built-in Focus Timer to track your work, as timer-verified hours award more points than manually typed-in hours.</p>
            <div class="manual-note tip"><strong>Pro-Tip:</strong> Consistent daily check-ins give you a multiplier bonus to your Leaderboard points!</div>
          </section>
          </article>
          
          <aside class="manual-toc" aria-label="On this page">
            <p>On this page</p>
            <a href="#getting-started">1. Getting Started</a>
            <a href="#dashboard">2. Dashboard</a>
            <a href="#settings">3. Settings & Target</a>
            <a href="#categories">4. Setup Categories</a>
            <a href="#timer">5. Focus Timer</a>
            <a href="#tasks">6. Tasks & Vault</a>
            <a href="#maamu">7. Maamu (AI)</a>
            <a href="#faq">8. FAQ</a>
          </aside>
        </main>
      </div>
    </div>
  `;

  const search = document.getElementById('manualSearch') as HTMLInputElement | null;
  const sections = [...document.querySelectorAll<HTMLElement>('.searchable')];
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.manual-sidebar a')];

  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    sections.forEach((section) => {
      section.hidden = query.length > 0 && !section.textContent?.toLowerCase().includes(query);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach((section) => observer.observe(section));
}
