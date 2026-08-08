import '@/styles/main.css';
import '@/styles/components/manual-page.css';

const root = document.getElementById('manual-root');

if (root) {
  root.innerHTML = `
    <div class="manual-shell">
      <header class="manual-topbar">
        <a class="manual-brand" href="/" aria-label="Return to All Tracker dashboard"><span class="manual-mark">A</span> ALL TRACKER</a>
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
            <a href="#start">Getting started</a>
            <a href="#daily-workflow">Daily workflow</a>
            <a href="#study-log">Study log and phases</a>
            <a href="#focus-timer">Focus timer</a>
            <a href="#tasks">Tasks</a>
            <a href="#sync">Sync and multiple devices</a>
            <a href="#leaderboard">Leaderboard</a>
            <a href="#notifications">Notifications</a>
            <a href="#maamu">Maamu</a>
            <a href="#troubleshooting">Troubleshooting</a>
          </nav>
        </aside>

        <main class="manual-content" id="manualContent">
          <article class="manual-article">
          <section class="manual-intro searchable" id="start">
            <p class="manual-eyebrow">ALL TRACKER · USER MANUAL</p>
            <h1>Keep your study work in one place.</h1>
            <p class="manual-lead">All Tracker records study time, daily work, tasks and focus sessions. Sign in to keep the same data on your phone, laptop and any other browser.</p>
            <div class="manual-note"><strong>Important:</strong> your data is linked to your account after you sign in. Do not use browser storage or Settings as a way to move data between devices.</div>
          </section>

          <section class="manual-section searchable" id="daily-workflow">
            <h2>Daily workflow</h2>
            <ol>
              <li>Open the dashboard and decide what you will study.</li>
              <li>Start the Focus Timer for the subject you are working on.</li>
              <li>Add a short topic note or project update when you finish.</li>
              <li>Check Tasks for the next item, then review your daily total.</li>
            </ol>
            <p>The timer is the best source of truth for study time. Manual table entries are useful for correcting a missed session, but timer sessions give more reliable history.</p>
          </section>

          <section class="manual-section searchable" id="study-log">
            <h2>Study log and phases</h2>
            <p>The Study Log is the timeline table. Every row is one calendar day. It contains your subject hours, problems solved, topics, project work and completion state.</p>
            <h3>Set up phases</h3>
            <ol>
              <li>Open <strong>Settings</strong> and create a phase with a name, start date, end date and subjects.</li>
              <li>Save the phase. Its columns are shown only for the dates inside that phase.</li>
              <li>Create another phase when your plan changes. Earlier phase data stays attached to its original dates.</li>
            </ol>
            <div class="manual-note"><strong>Why columns change:</strong> columns follow the phase for that date. This lets you move from, for example, DSA preparation to a semester plan without losing the old layout.</div>
          </section>

          <section class="manual-section searchable" id="focus-timer">
            <h2>Focus timer</h2>
            <p>Select a subject, start the timer, and stop it when you are done. The elapsed time is saved as a session and added to the matching day in the Study Log.</p>
            <ul>
              <li>You can stop or manage an active timer from another signed-in device.</li>
              <li>Do not run the same study session on two devices at once.</li>
              <li>If the browser closes, opening All Tracker again restores a running timer from its saved state.</li>
            </ul>
          </section>

          <section class="manual-section searchable" id="tasks">
            <h2>Tasks</h2>
            <p>Tasks are stored in your account and sync between devices. Choose a daily or weekly task, set its priority, and mark it complete when it is genuinely done.</p>
            <p>Tasks are independent from study-log rows. A task may be about an assignment, revision target, project deliverable or anything else you need to finish.</p>
          </section>

          <section class="manual-section searchable" id="sync">
            <h2>Sync and multiple devices</h2>
            <p>After signing in, your account is the primary copy of your data. The browser keeps a local cache so the app can still load quickly and recover from temporary network problems.</p>
            <ul>
              <li>Use the same account on every device.</li>
              <li>Wait a moment after a change before closing the browser, especially on a weak connection.</li>
              <li>If a screen looks stale, refresh it. Do not recreate phases or tasks just to force a sync.</li>
              <li>For a timer conflict, the server state is used so another device can stop the active session.</li>
            </ul>
          </section>

          <section class="manual-section searchable" id="leaderboard">
            <h2>Leaderboard</h2>
            <p>The leaderboard ranks recent verified work. Rank score is intentionally harder to earn than raw study hours: one study hour gives 2.5 base points, with small bonuses for consistency and timer verification.</p>
            <p>Today and weekly study time are shown separately from score. A person can have zero hours today while still having points from earlier verified work in the active ranking period.</p>
          </section>

          <section class="manual-section searchable" id="notifications">
            <h2>Notifications</h2>
            <p>Enable notifications in the app, then allow them in your browser. On supported installed PWAs, reminders can appear even when the All Tracker window is closed.</p>
            <p>Notification delivery still depends on browser permission, device power settings and an active internet connection.</p>
          </section>

          <section class="manual-section searchable" id="maamu">
            <h2>Maamu</h2>
            <p>Maamu uses your study history, tasks, timer sessions and current goals to give more relevant guidance. It is a study coach, not a replacement for your own judgment.</p>
            <p>Keep your phase, tasks and timer categories accurate if you want useful advice. Bad inputs produce bad recommendations.</p>
          </section>

          <section class="manual-section searchable" id="troubleshooting">
            <h2>Troubleshooting</h2>
            <h3>My data is missing after refresh</h3>
            <p>First confirm that you are signed in to the correct account. Refresh once, allow a few seconds for sync, and avoid saving blank Settings over your existing plan.</p>
            <h3>A phase is not visible</h3>
            <p>Check the phase start and end dates. The Study Log only shows phase columns on dates covered by that phase.</p>
            <h3>Notifications do not arrive</h3>
            <p>Check browser notification permission and make sure the installed app or browser is allowed to run notifications in your operating system settings.</p>
          </section>
          </article>
          <aside class="manual-toc" aria-label="On this page">
            <p>On this page</p>
            <a href="#start">Overview</a>
            <a href="#daily-workflow">Daily workflow</a>
            <a href="#study-log">Study log and phases</a>
            <a href="#focus-timer">Focus timer</a>
            <a href="#sync">Sync</a>
            <a href="#troubleshooting">Troubleshooting</a>
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
