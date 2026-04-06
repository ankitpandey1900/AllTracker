/**
 * Maamu AI Intelligence UI Templates
 * 
 * Contains only the HTML strings and basic string formatting 
 * for the AI mentor feature.
 */

// ─── Markdown Parser (Basic) ──────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatMaamuText(text: string): string {
  if (!text) return '';
  const codeBlocks: string[] = [];
  let html = text.replace(/```(?:[\w\+]+)?\n?([\s\S]*?)\n?```/g, (_m, code) => {
    const id = `__CB_${codeBlocks.length}__`;
    codeBlocks.push(`<div class="code-block-wrapper"><div class="code-block-header"><span>CODE</span><button class="copy-code-btn" onclick="(function(b){const c=b.closest('.code-block-wrapper').querySelector('code').textContent;navigator.clipboard.writeText(c);b.textContent='✓ Copied!';setTimeout(()=>b.textContent='📋 Copy',1500)})(this)">📋 Copy</button></div><pre><code>${escapeHtml(code.trim())}</code></pre></div>`);
    return id;
  });
  const inlines: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_m, c) => { const id = `__IC_${inlines.length}__`; inlines.push(`<code class="inline-code">${escapeHtml(c)}</code>`); return id; });
  html = escapeHtml(html)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^(\s*)[*-]\s+(.*)$/gm, '<li>$2</li>')
    .replace(/\n/g, '<br/>');
  codeBlocks.forEach((b, i) => { html = html.replace(`__CB_${i}__`, b); });
  inlines.forEach((ic, i) => { html = html.replace(`__IC_${i}__`, ic); });
  return html;
}

// ─── Static Shell ─────────────────────────────────────────────────

export const intelligenceView = `
  <div class="maamu-gpt-container" id="maamuGptContainer">

    <!-- ── Sidebar ── -->
    <aside class="maamu-sidebar" id="maamuSidebar">
      <div class="maamu-sidebar-top">
        <div class="maamu-brand">
          <div class="maamu-logo">M</div>
          <span>MAAMU AI</span>
        </div>
        <button id="newMissionBtn" class="new-chat-btn" title="Start a new conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Chat
        </button>
      </div>

      <div class="session-list-header">
        <span class="session-list-title">Conversations</span>
        <span class="session-count" id="maamuSessionCount">0</span>
      </div>

      <div class="maamu-session-list" id="maamuSessionList"></div>
      <div class="maamu-sidebar-footer" id="maamuSidebarFooter"></div>
    </aside>

    <!-- ── Custom New-Mission Dialog ── -->
    <div class="maamu-dialog-overlay" id="newMissionOverlay">
      <div class="maamu-dialog">
        <div class="maamu-dialog-icon">💬</div>
        <h3 class="maamu-dialog-title">New Conversation</h3>
        <p class="maamu-dialog-sub">Give this chat a name — or pick one below.</p>
        <input type="text" id="newMissionTitleInput" class="maamu-dialog-input"
          placeholder="e.g. DSA Phase 3, Career Plan..." maxlength="50" />
        <div class="maamu-quick-names">
          <button class="quick-name-chip">Study Plan</button>
          <button class="quick-name-chip">Career Advice</button>
          <button class="quick-name-chip">Code Review</button>
          <button class="quick-name-chip">Reality Check</button>
        </div>
        <div class="maamu-dialog-actions">
          <button class="maamu-dialog-cancel" id="newMissionCancel">Cancel</button>
          <button class="maamu-dialog-confirm" id="newMissionConfirm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- ── Main Chat Area ── -->
    <div class="maamu-chat-area">
      <div class="maamu-chat-header">
        <div class="chat-header-left">
          <button class="sidebar-toggle-btn" id="toggleMaamuSidebar" title="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
          <div class="active-session-info">
            <div class="session-dot"></div>
            <span id="activeMissionTitle">MAAMU AI</span>
          </div>
        </div>
        <div class="chat-header-right">
          <div class="beast-toggle-group">
            <span class="beast-label">Beast Mode</span>
            <label class="tactical-switch" title="Activates harsh, no-mercy coaching">
              <input type="checkbox" id="beastModeToggle">
              <span class="tactical-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="maamu-messages" id="maamuChatOutput"></div>

      <div class="maamu-input-zone">
        <div class="maamu-input-box">
          <div class="user-avatar-chip" id="maamuUserAvatarChip">👤</div>
          <textarea id="maamuQueryInput" class="maamu-textarea"
            placeholder="Ask Maamu anything — Hinglish, code, strategy..." rows="1" spellcheck="false"></textarea>
          <button id="sendMaamuQuery" class="maamu-send-btn" title="Send (Enter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div class="maamu-status-chips">
          <span class="status-chip data-chip">📊 30-day data</span>
          <span class="status-chip beast-chip" id="beastChipStatus" style="display:none">🔥 Beast Mode</span>
          <span class="status-chip model-chip">⚡ Llama 3.3 70B</span>
        </div>
      </div>
    </div>
  </div>
`;

// ─── Templates ────────────────────────────────────────────────────

export function buildWelcomeScreen(): string {
  return `
    <div class="maamu-welcome">
      <div class="maamu-welcome-avatar">🧠</div>
      <h3 class="maamu-welcome-title">THE MAAMU</h3>
      <p class="maamu-welcome-sub">Elite AI mentor. 30-day analytics loaded.<br/>Ask anything — strategy, code, career, or a reality check.</p>
      <div class="maamu-quick-prompts">
        <button class="quick-prompt">Analyze my weaknesses this week</button>
        <button class="quick-prompt">Reality check hindi mein do</button>
        <button class="quick-prompt">Build a study plan for today</button>
        <button class="quick-prompt">What should I focus on right now?</button>
      </div>
    </div>
  `;
}

export function buildMessageHTML(role: string, content: string, idx: number, avatar: string, name: string): string {
  const isUser = role === 'user';
  const roleAvatar = isUser ? avatar : '🧠';
  const roleName = isUser ? name : 'Maamu';
  const actions = !isUser ? `
    <div class="msg-actions">
      <button class="msg-action-btn copy-response-btn" data-idx="${idx}" title="Copy">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="msg-action-btn regenerate-btn" data-idx="${idx}" title="Retry">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Retry
      </button>
    </div>` : '';
  return `
    <div class="msg-row ${role}" data-idx="${idx}">
      <div class="msg-avatar">${roleAvatar}</div>
      <div class="msg-body">
        <div class="msg-sender">${roleName}</div>
        <div class="msg-content">${formatMaamuText(content)}</div>
        ${actions}
      </div>
    </div>
  `;
}
