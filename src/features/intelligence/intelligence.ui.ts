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
import { STORAGE_KEYS } from '@/config/constants';

// ─── Helpers ────────────────────────────────────────────────────

/** Get user's avatar emoji from local profile storage */
function getUserAvatar(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      const profile = JSON.parse(raw);
      return profile.avatar || '👤';
    }
  } catch { /* noop */ }
  return '👤';
}

/** Get user's display name from local profile storage */
function getUserDisplayName(): string {
  return localStorage.getItem('tracker_username') || 'You';
}

/** Micro-markdown parser for chat rendering */
function formatMaamuText(text: string): string {
  if (!text) return '';

  const codeBlocks: string[] = [];
  let html = text.replace(/```(?:[\w\+]+)?\n?([\s\S]*?)\n?```/g, (_match, code) => {
    const id = `__CB_${codeBlocks.length}__`;
    const escaped = escapeHtml(code.trim());
    codeBlocks.push(`
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span>CODE</span>
          <button class="copy-code-btn" onclick="(function(b){navigator.clipboard.writeText(b.closest('.code-block-wrapper').querySelector('code').textContent)})(this)">📋 Copy</button>
        </div>
        <pre><code>${escaped}</code></pre>
      </div>
    `);
    return id;
  });

  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const id = `__IC_${inlineCodes.length}__`;
    inlineCodes.push(`<code class="inline-code">${escapeHtml(code)}</code>`);
    return id;
  });

  html = escapeHtml(html)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^(\s*)[*-]\s+(.*)$/gm, '<li>$2</li>');

  html = html.replace(/\n/g, '<br/>');

  codeBlocks.forEach((block, i) => { html = html.replace(`__CB_${i}__`, block); });
  inlineCodes.forEach((ic, i) => { html = html.replace(`__IC_${i}__`, ic); });

  return html;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Static Shell ────────────────────────────────────────────────

export const intelligenceView = `
  <div class="maamu-gpt-container" id="maamuGptContainer">
    <!-- Sidebar -->
    <aside class="maamu-sidebar" id="maamuSidebar">
      <div class="maamu-sidebar-top">
        <div class="maamu-brand">
          <div class="maamu-logo">M</div>
          <span>MAAMU AI</span>
        </div>
        <button id="newMissionBtn" class="new-chat-btn" title="New Mission">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Mission
        </button>
      </div>
      <div class="session-list-label">MISSION LOGS</div>
      <div class="maamu-session-list" id="maamuSessionList">
        <!-- sessions injected here -->
      </div>
      <div class="maamu-sidebar-footer" id="maamuSidebarFooter">
        <!-- metrics injected here -->
      </div>
    </aside>

    <!-- Main Chat -->
    <div class="maamu-chat-area">
      <div class="maamu-chat-header">
        <div class="chat-header-left">
          <button class="sidebar-toggle-btn" id="toggleMaamuSidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
          <div class="active-session-info">
            <div class="session-dot"></div>
            <span id="activeMissionTitle">MISSION STRATEGY</span>
          </div>
        </div>
        <div class="chat-header-right">
          <span class="beast-label">BEAST MODE</span>
          <label class="tactical-switch" title="Toggle Beast Mode">
            <input type="checkbox" id="beastModeToggle">
            <span class="tactical-slider"></span>
          </label>
        </div>
      </div>

      <div class="maamu-messages" id="maamuChatOutput">
        <!-- messages injected here -->
      </div>

      <div class="maamu-input-zone">
        <div class="maamu-input-box">
          <div class="user-avatar-chip" id="maamuUserAvatarChip">👤</div>
          <textarea 
            id="maamuQueryInput" 
            class="maamu-textarea"
            placeholder="Ask Maamu anything — Hinglish, code, strategy..." 
            rows="1"
            spellcheck="false"
          ></textarea>
          <button id="sendMaamuQuery" class="maamu-send-btn" title="Send (Enter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <p class="maamu-input-hint">Press Enter to send · Shift+Enter for new line · Maamu knows your 30-day data</p>
      </div>
    </div>
  </div>
`;

// ─── Render Functions ─────────────────────────────────────────────

export function renderIntelligenceBriefing(): void {
  // The pane is injected at startup via ui-registry. We only need to refresh the dynamic content.
  const container = document.getElementById('intelligencePane');
  if (!container) return;

  migrateLegacyHistory();
  
  // Only inject static shell once; avoid re-mounting UI on every tab switch
  if (!document.getElementById('maamuGptContainer')) {
    container.innerHTML = intelligenceView;
  }

  // Sync beast mode toggle state
  const toggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  if (toggle) toggle.checked = !!appState.settings.beastMode;

  // Sync user avatar in input box
  const avatarChip = document.getElementById('maamuUserAvatarChip');
  if (avatarChip) avatarChip.textContent = getUserAvatar();

  // Update session title
  const session = getActiveSession();
  const titleEl = document.getElementById('activeMissionTitle');
  if (titleEl && session) titleEl.textContent = session.title.toUpperCase();

  renderSessionsList();
  renderActiveChat();
  renderSidebarMetrics();
  setupListeners();
}

function renderSessionsList(): void {
  const list = document.getElementById('maamuSessionList');
  if (!list) return;

  const sessions = getChatSessions();
  const activeId = getActiveSession()?.id;

  if (sessions.length === 0) {
    list.innerHTML = `<div class="no-sessions">No missions yet. Start one!</div>`;
    return;
  }

  list.innerHTML = sessions.map(sess => {
    const isActive = sess.id === activeId;
    const preview = sess.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || 'No messages yet';
    const previewShort = preview.length > 32 ? preview.slice(0, 32) + '…' : preview;
    const date = new Date(sess.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `
      <div class="maamu-session-item ${isActive ? 'active' : ''}" data-id="${sess.id}">
        <div class="session-item-content">
          <div class="session-item-title">${sess.title}</div>
          <div class="session-item-meta">
            <span class="session-preview">${previewShort}</span>
            <span class="session-date">${date}</span>
          </div>
        </div>
        <button class="session-delete-btn" data-id="${sess.id}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.maamu-session-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const delBtn = target.closest('.session-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        if (confirm('Delete this mission?')) {
          deleteSession(delBtn.getAttribute('data-id') || '');
          saveSettingsToStorage(appState.settings);
          renderSessionsList();
          renderActiveChat();
          const titleEl = document.getElementById('activeMissionTitle');
          const s = getActiveSession();
          if (titleEl && s) titleEl.textContent = s.title.toUpperCase();
        }
        return;
      }
      const id = el.getAttribute('data-id') || '';
      switchSession(id);
      saveSettingsToStorage(appState.settings);
      renderSessionsList();
      renderActiveChat();
      const titleEl = document.getElementById('activeMissionTitle');
      const s = getActiveSession();
      if (titleEl && s) titleEl.textContent = s.title.toUpperCase();
      // Close sidebar on mobile
      if (window.innerWidth <= 1024) {
        document.getElementById('maamuSidebar')?.classList.remove('active');
      }
    });
  });
}

function buildMessageRow(role: string, content: string): string {
  const isUser = role === 'user';
  const avatar = isUser ? getUserAvatar() : '🧠';
  const name = isUser ? getUserDisplayName() : 'Maamu';
  return `
    <div class="msg-row ${role}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-body">
        <div class="msg-sender">${name}</div>
        <div class="msg-content">${formatMaamuText(content)}</div>
      </div>
    </div>
  `;
}

function renderActiveChat(): void {
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!chatOutput) return;

  const session = getActiveSession();
  if (!session) return;

  if (session.messages.length === 0) {
    chatOutput.innerHTML = `
      <div class="maamu-welcome">
        <div class="maamu-welcome-avatar">🧠</div>
        <h3 class="maamu-welcome-title">THE MAAMU</h3>
        <p class="maamu-welcome-sub">Elite AI mentor. Connected to your 30-day analytics.<br/>Ask anything — strategy, code, career, or reality checks.</p>
        <div class="maamu-quick-prompts" id="maamuQuickPrompts">
          <button class="quick-prompt">Analyze my weaknesses this week</button>
          <button class="quick-prompt">Give me a reality check hindi mein</button>
          <button class="quick-prompt">Build me a study plan for today</button>
          <button class="quick-prompt">What should I focus on right now?</button>
        </div>
      </div>
    `;
    // Bind quick prompts
    chatOutput.querySelectorAll('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
        if (input) {
          input.value = (btn as HTMLElement).textContent || '';
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
    });
    return;
  }

  const userMessages = session.messages.filter(m => m.role !== 'system');
  chatOutput.innerHTML = userMessages.map(msg => buildMessageRow(msg.role, msg.content)).join('');
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function renderSidebarMetrics(): void {
  const footer = document.getElementById('maamuSidebarFooter');
  if (!footer) return;

  const briefing = getTacticalBriefing();
  const getColor = (v: number) => v > 75 ? '#10b981' : v > 45 ? '#f59e0b' : '#ef4444';
  
  footer.innerHTML = `
    <div class="sidebar-metrics">
      <div class="sm-label">ARENA STATS</div>
      <div class="sm-row">
        <span>Sustainability</span>
        <div class="sm-bar"><div class="sm-fill" style="width:${briefing.sustainabilityScore}%;background:${getColor(briefing.sustainabilityScore)}"></div></div>
        <span class="sm-val">${briefing.sustainabilityScore}%</span>
      </div>
      <div class="sm-row">
        <span>Discipline</span>
        <div class="sm-bar"><div class="sm-fill" style="width:${briefing.disciplineTrend}%;background:${getColor(briefing.disciplineTrend)}"></div></div>
        <span class="sm-val">${briefing.disciplineTrend}%</span>
      </div>
      <div class="sm-row">
        <span>Momentum</span>
        <div class="sm-bar"><div class="sm-fill" style="width:${Math.max(0, Math.min(100, briefing.momentum + 50))}%;background:${getColor(briefing.momentum + 50)}"></div></div>
        <span class="sm-val">${briefing.momentum > 0 ? '+' : ''}${briefing.momentum}%</span>
      </div>
    </div>

    <div class="sidebar-api-section">
      <div class="sm-label">GROQ API KEY</div>
      <input type="password" id="maamuApiKeyInput" class="api-key-input" 
        value="${appState.settings.groqApiKey || ''}" 
        placeholder="gsk_...">
      <button id="saveMaamuApiKey" class="save-api-btn">Save Key</button>
      <a href="https://console.groq.com" target="_blank" class="api-link">Get free key →</a>
    </div>
  `;

  // Bind API key save
  document.getElementById('saveMaamuApiKey')?.addEventListener('click', () => {
    const val = (document.getElementById('maamuApiKeyInput') as HTMLInputElement)?.value.trim();
    appState.settings.groqApiKey = val;
    saveSettingsToStorage(appState.settings);
    const btn = document.getElementById('saveMaamuApiKey');
    if (btn) { btn.textContent = '✓ Saved!'; setTimeout(() => { btn.textContent = 'Save Key'; }, 2000); }
  });
}

// ─── Listeners ────────────────────────────────────────────────────

let listenersAttached = false;

function setupListeners(): void {
  if (listenersAttached) return;
  listenersAttached = false; // Always re-attach on render

  const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('sendMaamuQuery');
  const chatOutput = document.getElementById('maamuChatOutput');

  if (!input || !sendBtn || !chatOutput) return;

  // New Mission Button
  document.getElementById('newMissionBtn')?.addEventListener('click', () => {
    const title = prompt('Mission title (e.g., "Phase 2 Prep"):') || 'New Mission Strategy';
    createNewSession(title);
    saveSettingsToStorage(appState.settings);
    renderSessionsList();
    renderActiveChat();
    const titleEl = document.getElementById('activeMissionTitle');
    const s = getActiveSession();
    if (titleEl && s) titleEl.textContent = s.title.toUpperCase();
  });

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  const handleSend = async () => {
    const query = input.value.trim();
    if (!query) return;
    const session = getActiveSession();
    if (!session) return;

    // Show user message immediately
    const userRow = document.createElement('div');
    userRow.innerHTML = buildMessageRow('user', query);
    chatOutput.appendChild(userRow.firstElementChild!);
    input.value = '';
    input.style.height = 'auto';
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // Remove welcome screen if visible
    const welcome = chatOutput.querySelector('.maamu-welcome');
    if (welcome) welcome.remove();

    // Thinking indicator
    const thinkRow = document.createElement('div');
    thinkRow.className = 'msg-row assistant thinking-row';
    thinkRow.innerHTML = `
      <div class="msg-avatar">🧠</div>
      <div class="msg-body">
        <div class="msg-content thinking-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatOutput.appendChild(thinkRow);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    try {
      const tacticalBrief = getTacticalBriefingString();
      const response = await getMaamuResponse(query, tacticalBrief);
      thinkRow.remove();

      const assistantEl = document.createElement('div');
      assistantEl.innerHTML = buildMessageRow('assistant', response);
      chatOutput.appendChild(assistantEl.firstElementChild!);
      chatOutput.scrollTop = chatOutput.scrollHeight;
    } catch {
      thinkRow.innerHTML = `<div class="msg-row assistant"><div class="msg-avatar">⚡</div><div class="msg-body"><div class="msg-content error-msg">Connection to AI core failed. Check your API key.</div></div></div>`;
    }
  };

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  // Beast Mode
  const beastToggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  beastToggle?.addEventListener('change', () => {
    appState.settings.beastMode = beastToggle.checked;
    saveSettingsToStorage(appState.settings);
    const msg = beastToggle.checked 
      ? '🔥 BEAST MODE: ELITE INTENSITY ENGAGED. NO MERCY.' 
      : '✅ BEAST MODE: Deactivated. Standard mode restored.';
    // Inject system message into chat  
    const banner = document.createElement('div');
    banner.className = 'system-msg';
    banner.textContent = msg;
    chatOutput.appendChild(banner);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  });

  // Sidebar Toggle (mobile)
  document.getElementById('toggleMaamuSidebar')?.addEventListener('click', () => {
    document.getElementById('maamuSidebar')?.classList.toggle('active');
  });

  // Click outside to close sidebar on mobile
  document.addEventListener('click', (e: MouseEvent) => {
    if (window.innerWidth <= 1024) {
      const sidebar = document.getElementById('maamuSidebar');
      const toggle = document.getElementById('toggleMaamuSidebar');
      if (sidebar?.classList.contains('active') 
          && !sidebar.contains(e.target as Node)
          && !toggle?.contains(e.target as Node)) {
        sidebar.classList.remove('active');
      }
    }
  });
}
