import { 
  getTacticalBriefing, 
  getTacticalBriefingString, 
  getChatSessions, 
  getActiveSession, 
  createNewSession, 
  deleteSession, 
  switchSession, 
  migrateLegacyHistory 
} from './intelligence.service';
import { getMaamuResponse } from '@/services/groq.service';
import { appState } from '@/state/app-state';
import { saveSettingsToStorage } from '@/services/data-bridge';

export const intelligenceView = `
  <div class="maamu-gpt-container">
    <!-- Sidebar for Mission History -->
    <aside class="maamu-sidebar" id="maamuSidebar">
      <div class="sidebar-header">
        <button id="newMissionBtn" class="btn btn-pill-outline btn-full">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><path d="M12 5v14M5 12h14"/></svg>
          New Mission
        </button>
      </div>
      <div class="mission-list" id="missionList">
        <!-- Sessions injected here -->
      </div>
      <div class="sidebar-footer">
        <div class="mini-metrics-panel" id="miniMetricsPanel">
          <!-- Quick metrics summary -->
        </div>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="maamu-chat-main">
      <header class="chat-header">
        <div class="header-left">
          <button id="toggleMaamuSidebar" class="btn-icon show-mobile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div class="mentor-status">
            <div class="status-pulse optimal"></div>
            <h2 id="activeMissionTitle">MISSION STRATEGY</h2>
          </div>
        </div>
        <div class="header-right">
          <div class="beast-mode-control">
            <span class="beast-label">BEAST MODE</span>
            <label class="tactical-switch">
              <input type="checkbox" id="beastModeToggle" ${appState.settings.beastMode ? 'checked' : ''}>
              <span class="tactical-slider"></span>
            </label>
          </div>
        </div>
      </header>

      <div id="maamuChatOutput" class="chat-scroll-area">
        <!-- Messages injected here -->
      </div>

      <footer class="chat-input-container">
        <div class="chat-input-wrapper">
          <textarea id="maamuQueryInput" placeholder="Enter tactical inquiry (Hinglish supported)..." rows="1" spellcheck="false"></textarea>
          <button id="sendMaamuQuery" class="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <p class="input-hint">Maamu can provide code, roadmaps, and analytics. Shift + Enter for newline.</p>
      </footer>
    </main>
  </div>
`;

/** Micro-markdown parser for chat rendering */
function formatMaamuText(text: string): string {
  if (!text) return '';

  // 1. Fenced Code Blocks (```lang\n code \n```)
  const codeBlocks: string[] = [];
  let html = text.replace(/```(?:[\w\+]+)?\n?([\s\S]*?)\n?```/g, (_match, code) => {
    const id = `__CB_${codeBlocks.length}__`;
    codeBlocks.push(`
      <div class="code-block-wrapper">
        <div class="code-header">
          <span>CODE BLOCK</span>
          <button class="copy-code-btn" onclick="navigator.clipboard.writeText(\`${code.replace(/`/g, '\\`').trim()}\`)">Copy</button>
        </div>
        <pre><code>${escapeHtml(code.trim())}</code></pre>
      </div>
    `);
    return id;
  });

  // 2. Inline Code (`code`)
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const id = `__IC_${inlineCodes.length}__`;
    inlineCodes.push(`<code class="inline-code">${escapeHtml(code)}</code>`);
    return id;
  });

  // 3. Basic formatting on the remaining text
  html = escapeHtml(html)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^(\s*)[*-]\s+(.*)$/gm, '<li style="margin-left: 1.5rem; list-style-type: disc;">$2</li>');

  // Newlines to BR (but not inside our markers)
  html = html.replace(/\n/g, '<br/>');

  // 4. Restore Code
  codeBlocks.forEach((block, i) => { html = html.replace(`__CB_${i}__`, block); });
  inlineCodes.forEach((ic, i) => { html = html.replace(`__IC_${i}__`, ic); });

  return html;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderIntelligenceBriefing(): void {
  const container = document.getElementById('intelligenceFullBody');
  if (!container) return;

  // Initialize
  migrateLegacyHistory();
  const session = getActiveSession();

  container.innerHTML = intelligenceView;
  
  // Set active title
  const titleEl = document.getElementById('activeMissionTitle');
  if (titleEl && session) titleEl.textContent = session.title.toUpperCase();

  renderSessionsList();
  renderActiveChat();
  renderMiniMetrics();
  setupListeners();
}

function renderSessionsList(): void {
  const list = document.getElementById('missionList');
  if (!list) return;

  const sessions = getChatSessions();
  const activeId = getActiveSession()?.id;

  list.innerHTML = sessions.map(sess => `
    <div class="mission-item ${sess.id === activeId ? 'active' : ''}" data-id="${sess.id}">
      <div class="mission-info">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>${sess.title}</span>
      </div>
      <button class="delete-mission-btn" data-id="${sess.id}">×</button>
    </div>
  `).join('');

  // Bind Switch
  list.querySelectorAll('.mission-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('delete-mission-btn')) {
        deleteSession(target.getAttribute('data-id') || '');
        renderIntelligenceBriefing();
        return;
      }
      switchSession(el.getAttribute('data-id') || '');
      renderIntelligenceBriefing();
    });
  });
}

function renderActiveChat(): void {
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!chatOutput) return;

  const session = getActiveSession();
  if (!session) return;

  if (session.messages.length === 0) {
    chatOutput.innerHTML = `
      <div class="chat-placeholder">
        <div class="maamu-avatar-large">M</div>
        <h3>INITIALIZING TACTICAL CORE</h3>
        <p>Welcome to Mission Strategy. I am THE MAAMU. Your 30-day analytics are synchronized. Ask your inquiry below.</p>
      </div>
    `;
    return;
  }

  chatOutput.innerHTML = session.messages.map(msg => `
    <div class="chat-bubble-row ${msg.role}">
      <div class="chat-bubble">
        <div class="bubble-sender">${msg.role === 'user' ? 'YOU' : 'MAAMU'}</div>
        <div class="bubble-content">${formatMaamuText(msg.content)}</div>
      </div>
    </div>
  `).join('');

  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function renderMiniMetrics(): void {
  const panel = document.getElementById('miniMetricsPanel');
  if (!panel) return;

  const briefing = getTacticalBriefing();
  panel.innerHTML = `
    <div class="mini-stat">
      <label>SUSTAINABILITY</label>
      <div class="bar"><div class="fill" style="width:${briefing.sustainabilityScore}%"></div></div>
    </div>
    <div class="mini-stat">
      <label>DISCIPLINE</label>
      <div class="bar"><div class="fill" style="width:${briefing.disciplineTrend}%"></div></div>
    </div>
  `;
}

function setupListeners(): void {
  const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('sendMaamuQuery');
  const chatOutput = document.getElementById('maamuChatOutput');
  const newMissionBtn = document.getElementById('newMissionBtn');

  if (!input || !sendBtn || !chatOutput) return;

  // New Mission
  newMissionBtn?.addEventListener('click', () => {
    const title = prompt("Enter Mission Title (e.g. Phase 2 Prep):") || "New Mission Strategy";
    createNewSession(title);
    renderIntelligenceBriefing();
  });

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
  });

  const handleSend = async () => {
    const query = input.value.trim();
    if (!query) return;

    // Add user msg locally
    const session = getActiveSession();
    if (!session) return;

    // UI Feedback
    const userRow = document.createElement('div');
    userRow.className = 'chat-bubble-row user';
    userRow.innerHTML = `
      <div class="chat-bubble">
        <div class="bubble-sender">YOU</div>
        <div class="bubble-content">${formatMaamuText(query)}</div>
      </div>
    `;
    chatOutput.appendChild(userRow);
    input.value = '';
    input.style.height = 'auto';
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // Thinking
    const thinkingRow = document.createElement('div');
    thinkingRow.className = 'chat-bubble-row assistant thinking';
    thinkingRow.innerHTML = `<div class="chat-bubble"><div class="bubble-content">Analyzing neural trails...</div></div>`;
    chatOutput.appendChild(thinkingRow);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    try {
      const tacticalBrief = getTacticalBriefingString();
      const response = await getMaamuResponse(query, tacticalBrief);

      thinkingRow.remove();
      const assistantRow = document.createElement('div');
      assistantRow.className = 'chat-bubble-row assistant';
      assistantRow.innerHTML = `
        <div class="chat-bubble">
          <div class="bubble-sender">MAAMU</div>
          <div class="bubble-content">${formatMaamuText(response)}</div>
        </div>
      `;
      chatOutput.appendChild(assistantRow);
      chatOutput.scrollTop = chatOutput.scrollHeight;
    } catch (err) {
      thinkingRow.innerHTML = `<div class="chat-bubble error">Error connecting to core.</div>`;
    }
  };

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Beast Mode
  const beastToggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  beastToggle?.addEventListener('change', () => {
    appState.settings.beastMode = beastToggle.checked;
    saveSettingsToStorage(appState.settings);
    alert(beastToggle.checked ? "BEAST MODE: ELITE INTENSITY ENGAGED." : "BEAST MODE: BACK TO STABLE BASELINE.");
  });

  // Sidebar Toggle (Mobile)
  const sidebarToggle = document.getElementById('toggleMaamuSidebar');
  const sidebar = document.getElementById('maamuSidebar');
  sidebarToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('active');
  });
}
