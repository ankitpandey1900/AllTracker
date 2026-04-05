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
import { getMaamuResponseStream, generateSessionTitle } from '@/services/groq.service';
import { appState } from '@/state/app-state';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { STORAGE_KEYS } from '@/config/constants';

// ─── Profile Helpers ──────────────────────────────────────────────

function getUserAvatar(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) return JSON.parse(raw).avatar || '👤';
  } catch { /* noop */ }
  return '👤';
}

function getUserDisplayName(): string {
  return localStorage.getItem('tracker_username') || 'You';
}

// ─── Markdown Parser ──────────────────────────────────────────────

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
          <button class="copy-code-btn" onclick="(function(b){const code=b.closest('.code-block-wrapper').querySelector('code').textContent;navigator.clipboard.writeText(code);b.textContent='✓ Copied!';setTimeout(()=>b.textContent='📋 Copy',1500)})(this)">📋 Copy</button>
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
      <div class="maamu-session-list" id="maamuSessionList"></div>
      <div class="maamu-sidebar-footer" id="maamuSidebarFooter"></div>
    </aside>

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
          <span class="beast-label">BEAST</span>
          <label class="tactical-switch" title="Toggle Beast Mode">
            <input type="checkbox" id="beastModeToggle">
            <span class="tactical-slider"></span>
          </label>
        </div>
      </div>

      <div class="maamu-messages" id="maamuChatOutput"></div>

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
        <div class="maamu-status-chips">
          <span class="status-chip data-chip">📊 30-day data loaded</span>
          <span class="status-chip beast-chip" id="beastChipStatus" style="display:none">🔥 Beast Mode</span>
          <span class="status-chip model-chip">⚡ Llama 3.3 70B</span>
        </div>
      </div>
    </div>
  </div>
`;

// ─── Main Render ─────────────────────────────────────────────────

export function renderIntelligenceBriefing(): void {
  const container = document.getElementById('intelligencePane');
  if (!container) return;

  migrateLegacyHistory();

  if (!document.getElementById('maamuGptContainer')) {
    container.innerHTML = intelligenceView;
  }

  // Sync state
  const toggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  if (toggle) toggle.checked = !!appState.settings.beastMode;

  const avatarChip = document.getElementById('maamuUserAvatarChip');
  if (avatarChip) avatarChip.textContent = getUserAvatar();

  const beastChip = document.getElementById('beastChipStatus');
  if (beastChip) beastChip.style.display = appState.settings.beastMode ? 'inline-flex' : 'none';

  const session = getActiveSession();
  const titleEl = document.getElementById('activeMissionTitle');
  if (titleEl && session) titleEl.textContent = session.title.toUpperCase();

  renderSessionsList();
  renderActiveChat();
  renderSidebarMetrics();
  setupListeners();
}

// ─── Sessions List ───────────────────────────────────────────────

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
    const lastUserMsg = sess.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || 'No messages yet';
    const preview = lastUserMsg.length > 30 ? lastUserMsg.slice(0, 30) + '…' : lastUserMsg;
    const date = new Date(sess.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `
      <div class="maamu-session-item ${isActive ? 'active' : ''}" data-id="${sess.id}">
        <div class="session-item-content">
          <div class="session-item-title">${sess.title}</div>
          <div class="session-item-meta">
            <span class="session-preview">${preview}</span>
            <span class="session-date">${date}</span>
          </div>
        </div>
        <button class="session-delete-btn" data-id="${sess.id}" title="Delete mission">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.maamu-session-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const delBtn = (e.target as HTMLElement).closest('.session-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        if (confirm('Delete this mission log?')) {
          deleteSession(delBtn.getAttribute('data-id') || '');
          saveSettingsToStorage(appState.settings);
          renderSessionsList();
          renderActiveChat();
          const s = getActiveSession();
          const titleEl = document.getElementById('activeMissionTitle');
          if (titleEl && s) titleEl.textContent = s.title.toUpperCase();
        }
        return;
      }
      switchSession(el.getAttribute('data-id') || '');
      saveSettingsToStorage(appState.settings);
      renderSessionsList();
      renderActiveChat();
      const s = getActiveSession();
      const titleEl = document.getElementById('activeMissionTitle');
      if (titleEl && s) titleEl.textContent = s.title.toUpperCase();
      if (window.innerWidth <= 1024) {
        document.getElementById('maamuSidebar')?.classList.remove('active');
      }
    });
  });
}

// ─── Message Builder ─────────────────────────────────────────────

function buildMessageHTML(role: string, content: string, msgIndex: number): string {
  const isUser = role === 'user';
  const avatar = isUser ? getUserAvatar() : '🧠';
  const name = isUser ? getUserDisplayName() : 'Maamu';
  const actions = !isUser ? `
    <div class="msg-actions">
      <button class="msg-action-btn copy-response-btn" data-idx="${msgIndex}" title="Copy response">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="msg-action-btn regenerate-btn" data-idx="${msgIndex}" title="Regenerate response">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Retry
      </button>
    </div>
  ` : '';
  return `
    <div class="msg-row ${role}" data-idx="${msgIndex}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-body">
        <div class="msg-sender">${name}</div>
        <div class="msg-content">${formatMaamuText(content)}</div>
        ${actions}
      </div>
    </div>
  `;
}

// ─── Chat Renderer ───────────────────────────────────────────────

function renderActiveChat(): void {
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!chatOutput) return;

  const session = getActiveSession();
  if (!session) return;

  const userMessages = session.messages.filter(m => m.role !== 'system');

  if (userMessages.length === 0) {
    chatOutput.innerHTML = buildWelcomeScreen();
    bindQuickPrompts(chatOutput);
    checkAndInjectDailyBriefing(chatOutput);
    return;
  }

  chatOutput.innerHTML = userMessages
    .map((msg, i) => buildMessageHTML(msg.role, msg.content, i))
    .join('');

  bindMessageActions(chatOutput);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function buildWelcomeScreen(): string {
  return `
    <div class="maamu-welcome">
      <div class="maamu-welcome-avatar">🧠</div>
      <h3 class="maamu-welcome-title">THE MAAMU</h3>
      <p class="maamu-welcome-sub">Elite AI mentor. Connected to your 30-day analytics.<br/>Ask anything — strategy, code, career, or reality checks.</p>
      <div class="maamu-quick-prompts">
        <button class="quick-prompt">Analyze my weaknesses this week</button>
        <button class="quick-prompt">Give me a reality check hindi mein</button>
        <button class="quick-prompt">Build me a study plan for today</button>
        <button class="quick-prompt">What should I focus on right now?</button>
      </div>
    </div>
  `;
}

function bindQuickPrompts(chatOutput: HTMLElement): void {
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
}

function bindMessageActions(chatOutput: HTMLElement): void {
  // Copy response  
  chatOutput.querySelectorAll('.copy-response-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx') || '0');
      const session = getActiveSession();
      const msgs = session?.messages.filter(m => m.role !== 'system') || [];
      const content = msgs[idx]?.content || '';
      navigator.clipboard.writeText(content);
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        (btn as HTMLElement).innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      }, 1500);
    });
  });

  // Regenerate last response
  chatOutput.querySelectorAll('.regenerate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const session = getActiveSession();
      if (!session) return;
      const msgs = session.messages.filter(m => m.role !== 'system');
      const idx = parseInt(btn.getAttribute('data-idx') || '0');
      // Find the preceding user message
      let userQuery = '';
      for (let i = idx - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') { userQuery = msgs[i].content; break; }
      }
      if (!userQuery) return;

      // Remove the assistant message from session history
      const sessionMsg = session.messages.find((m, i) => {
        const filtered = session.messages.filter(x => x.role !== 'system');
        return filtered[idx] === m;
      });
      if (sessionMsg) session.messages.splice(session.messages.indexOf(sessionMsg), 1);

      // Re-render and stream
      const msgRow = chatOutput.querySelector(`.msg-row[data-idx="${idx}"]`);
      if (msgRow) {
        msgRow.outerHTML = `
          <div class="msg-row assistant" data-idx="${idx}">
            <div class="msg-avatar">🧠</div>
            <div class="msg-body">
              <div class="msg-sender">Maamu</div>
              <div class="msg-content streaming-content"><span class="thinking-indicator"><span></span><span></span><span></span></span></div>
            </div>
          </div>
        `;
      }

      streamResponse(userQuery, chatOutput);
    });
  });
}

// ─── Daily Briefing ──────────────────────────────────────────────

function checkAndInjectDailyBriefing(chatOutput: HTMLElement): void {
  const todayKey = 'maamu_daily_briefing_' + new Date().toISOString().split('T')[0];
  const session = getActiveSession();
  if (!session || localStorage.getItem(todayKey) === session.id) return;
  
  // Only on a completely fresh session
  if (session.messages.length > 0) return;

  // Inject into the welcome screen area
  const briefing = getTacticalBriefing();
  const username = getUserDisplayName();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const briefMsg = `${greeting}, **${username}**. Here is your Arena status report:

**Sustainability:** ${briefing.sustainabilityScore}% · **Discipline:** ${briefing.disciplineTrend}% · **Momentum:** ${briefing.momentum > 0 ? '+' : ''}${briefing.momentum}%

${briefing.mentorMessage}

**Peak Window:** ${briefing.peakHourStr} · **Watch Out:** ${briefing.vulnerableDay}s

*Your 30-day analytics are fully synchronized. What do you need help with today?*`;

  // Inject as pre-loaded assistant message in welcome screen
  const welcomeEl = chatOutput.querySelector('.maamu-welcome');
  if (!welcomeEl) return;

  const briefEl = document.createElement('div');
  briefEl.className = 'daily-briefing-banner';
  briefEl.innerHTML = `
    <div class="daily-brief-header">
      <span>🧠</span>
      <span>DAILY BRIEFING</span>
    </div>
    <div class="daily-brief-body">${formatMaamuText(briefMsg)}</div>
  `;
  welcomeEl.prepend(briefEl);

  localStorage.setItem(todayKey, session.id);
}

// ─── Streaming Send ──────────────────────────────────────────────

function streamResponse(query: string, chatOutput: HTMLElement, _isNew = true): void {
  const tacticalBrief = getTacticalBriefingString();

  const session = getActiveSession();
  if (!session) return;
  const isFirstMessage = session.messages.filter(m => m.role === 'user').length <= 1;

  // Create assistant bubble
  const assistantRow = document.createElement('div');
  assistantRow.className = 'msg-row assistant streaming';
  assistantRow.innerHTML = `
    <div class="msg-avatar">🧠</div>
    <div class="msg-body">
      <div class="msg-sender">Maamu</div>
      <div class="msg-content streaming-content"><span class="thinking-indicator"><span></span><span></span><span></span></span></div>
    </div>
  `;
  chatOutput.appendChild(assistantRow);
  chatOutput.scrollTop = chatOutput.scrollHeight;


  const contentEl = assistantRow.querySelector('.streaming-content') as HTMLElement;
  let rawAccumulated = '';

  getMaamuResponseStream(
    query,
    tacticalBrief,
    (_chunk, accumulated) => {
      rawAccumulated = accumulated;
      if (contentEl) {
        contentEl.innerHTML = formatMaamuText(accumulated) + '<span class="stream-cursor">▋</span>';
        chatOutput.scrollTop = chatOutput.scrollHeight;
      }
    },
    (fullResponse) => {
      // Final render without cursor
      assistantRow.classList.remove('streaming');
      const msgIdx = getChatSessions().indexOf(session);
      const userMsgs = session.messages.filter(m => m.role !== 'system');
      const idx = userMsgs.length - 1;
      if (contentEl) {
        contentEl.innerHTML = formatMaamuText(fullResponse);
      }
      // Add action buttons
      const msgBody = assistantRow.querySelector('.msg-body');
      if (msgBody) {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        actions.innerHTML = `
          <button class="msg-action-btn copy-response-btn" title="Copy response">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
          <button class="msg-action-btn regenerate-btn" title="Regenerate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Retry
          </button>
        `;
        msgBody.appendChild(actions);

        // Bind copy
        actions.querySelector('.copy-response-btn')?.addEventListener('click', (e) => {
          navigator.clipboard.writeText(fullResponse);
          (e.currentTarget as HTMLElement).textContent = '✓ Copied!';
          setTimeout(() => { (e.currentTarget as HTMLElement).innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1500);
        });
      }

      // Auto-name session from first message
      if (isFirstMessage && session.title === 'New Mission Strategy') {
        const firstUserMsg = session.messages.find(m => m.role === 'user')?.content || '';
        const autoTitle = generateSessionTitle(firstUserMsg);
        session.title = autoTitle;
        const titleEl = document.getElementById('activeMissionTitle');
        if (titleEl) titleEl.textContent = autoTitle.toUpperCase();
        renderSessionsList();
        saveSettingsToStorage(appState.settings);
      }

      chatOutput.scrollTop = chatOutput.scrollHeight;
    },
    (err) => {
      assistantRow.classList.remove('streaming');
      if (contentEl) contentEl.innerHTML = `<span class="error-msg">⚡ ${err}</span>`;
    }
  );
}

// ─── Sidebar Footer: Metrics + API ──────────────────────────────

function renderSidebarMetrics(): void {
  const footer = document.getElementById('maamuSidebarFooter');
  if (!footer) return;

  const briefing = getTacticalBriefing();
  const getColor = (v: number) => v > 75 ? '#10b981' : v > 45 ? '#f59e0b' : '#ef4444';
  
  footer.innerHTML = `
    <div class="sidebar-metrics">
      <div class="sm-label">ARENA STATS</div>
      <div class="sm-row">
        <span>Sustain</span>
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
        <div class="sm-bar"><div class="sm-fill" style="width:${Math.max(0,Math.min(100,briefing.momentum+50))}%;background:${getColor(briefing.momentum+50)}"></div></div>
        <span class="sm-val">${briefing.momentum > 0 ? '+' : ''}${briefing.momentum}%</span>
      </div>
    </div>
    <div class="sidebar-api-section">
      <div class="sm-label">GROQ API KEY</div>
      <input type="password" id="maamuApiKeyInput" class="api-key-input" 
        value="${appState.settings.groqApiKey || ''}" 
        placeholder="gsk_...">
      <button id="saveMaamuApiKey" class="save-api-btn">Save Key</button>
      <a href="https://console.groq.com" target="_blank" class="api-link">Get your free API key →</a>
    </div>
  `;

  document.getElementById('saveMaamuApiKey')?.addEventListener('click', () => {
    const val = (document.getElementById('maamuApiKeyInput') as HTMLInputElement)?.value.trim();
    appState.settings.groqApiKey = val;
    saveSettingsToStorage(appState.settings);
    const btn = document.getElementById('saveMaamuApiKey');
    if (btn) { btn.textContent = '✓ Saved!'; setTimeout(() => { btn.textContent = 'Save Key'; }, 2000); }
  });
}

// ─── Listeners ────────────────────────────────────────────────────

function setupListeners(): void {
  const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('sendMaamuQuery');
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!input || !sendBtn || !chatOutput) return;

  // New Mission
  document.getElementById('newMissionBtn')?.addEventListener('click', () => {
    const title = prompt('Mission title (e.g., "DSA Phase 3"):') || 'New Mission Strategy';
    createNewSession(title);
    saveSettingsToStorage(appState.settings);
    renderSessionsList();
    renderActiveChat();
    const s = getActiveSession();
    const titleEl = document.getElementById('activeMissionTitle');
    if (titleEl && s) titleEl.textContent = s.title.toUpperCase();
  });

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  const handleSend = () => {
    const query = input.value.trim();
    if (!query) return;
    const session = getActiveSession();
    if (!session) return;

    // Remove welcome screen
    const welcome = chatOutput.querySelector('.maamu-welcome');
    if (welcome) welcome.remove();

    // Show user message immediately in UI (groq service handles saving)
    const userRow = document.createElement('div');
    userRow.className = 'msg-row user';
    userRow.innerHTML = `
      <div class="msg-avatar">${getUserAvatar()}</div>
      <div class="msg-body">
        <div class="msg-sender">${getUserDisplayName()}</div>
        <div class="msg-content">${formatMaamuText(query)}</div>
      </div>
    `;
    chatOutput.appendChild(userRow);
    input.value = '';
    input.style.height = 'auto';
    chatOutput.scrollTop = chatOutput.scrollHeight;

    streamResponse(query, chatOutput);
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
    const beastChip = document.getElementById('beastChipStatus');
    if (beastChip) beastChip.style.display = beastToggle.checked ? 'inline-flex' : 'none';
    const banner = document.createElement('div');
    banner.className = 'system-msg';
    banner.textContent = beastToggle.checked
      ? '🔥 BEAST MODE: ELITE INTENSITY ENGAGED — NO MERCY.'
      : '✅ BEAST MODE: Deactivated. Standard mode restored.';
    chatOutput.appendChild(banner);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  });

  // Sidebar Toggle
  document.getElementById('toggleMaamuSidebar')?.addEventListener('click', () => {
    document.getElementById('maamuSidebar')?.classList.toggle('active');
  });

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
