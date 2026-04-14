/**
 * HTML templates for the Maamu AI chat.
 * 
 * This file contains the HTML strings for the chat interface, 
 * messages, and the welcome screen.
 */

// --- Simple Markdown Parser ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapListBlocks(html: string, tag: 'ul' | 'ol'): string {
  const itemTag = tag === 'ul' ? 'li' : 'li';
  const blockRegex = new RegExp(`(?:<${itemTag} data-list="${tag}">[\\s\\S]*?<\\/${itemTag}>)(?:\\s*<br\\/>\\s*<${itemTag} data-list="${tag}">[\\s\\S]*?<\\/${itemTag}>)*`, 'g');
  return html.replace(blockRegex, block => {
    const clean = block
      .replace(/<br\/>\s*(?=<li data-list=)/g, '')
      .replace(/<li data-list="(?:ul|ol)">/g, '<li>');
    return `<${tag}>${clean}</${tag}>`;
  });
}

function convertSimpleTables(html: string): string {
  const rows = html.split('<br/>');
  const converted: string[] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i].trim();
    const next = rows[i + 1]?.trim() || '';
    const isHeader = /^\|.*\|$/.test(row);
    const isDivider = /^\|\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(next);
    if (isHeader && isDivider) {
      const tableRows: string[] = [row];
      i += 2;
      while (i < rows.length && /^\|.*\|$/.test(rows[i].trim())) {
        tableRows.push(rows[i].trim());
        i++;
      }
      const parseCells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const headers = parseCells(tableRows[0]);
      const body = tableRows.slice(1).map(parseCells);
      const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
      converted.push(`<div class="maamu-table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }
    converted.push(rows[i]);
    i++;
  }
  return converted.join('<br/>');
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
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^\s*[-*]\s+(.*)$/gm, '<li data-list="ul">$1</li>')
    .replace(/^\s*\d+\.\s+(.*)$/gm, '<li data-list="ol">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/==(.*?)==/g, '<mark>$1</mark>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

  html = wrapListBlocks(html, 'ul');
  html = wrapListBlocks(html, 'ol');
  html = convertSimpleTables(html);
  codeBlocks.forEach((b, i) => { html = html.replace(`__CB_${i}__`, b); });
  inlines.forEach((ic, i) => { html = html.replace(`__IC_${i}__`, ic); });
  return html;
}

// --- UI Skeleton ---

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
      <div style="padding: 8px 12px 6px;">
        <input id="maamuSessionSearch" class="api-key-input" style="margin:0; height:30px;" placeholder="Search chats..." />
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
            <span class="beast-label">Model</span>
            <select id="maamuModelSelectInline" class="api-key-input" style="margin:0; min-width: 210px; padding: 6px 10px;">
            </select>
          </div>
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
        <div class="maamu-template-row">
          <button class="maamu-template-btn" data-template="Debug this code with root-cause and fix steps">Debug Code</button>
          <button class="maamu-template-btn" data-template="Take my interview now with one hard question at a time">Interview Me</button>
          <button class="maamu-template-btn" data-template="Build my weekly study plan from my current data">Weekly Plan</button>
          <button class="maamu-template-btn" data-template="Explain this concept in simple steps with examples">Explain Simply</button>
        </div>
        <div class="maamu-input-box">
          <div class="user-avatar-chip" id="maamuUserAvatarChip">👤</div>
          <textarea id="maamuQueryInput" class="maamu-textarea"
            placeholder="Ask Maamu anything — Hinglish, code, strategy..." rows="1" spellcheck="false"></textarea>
          <button id="stopMaamuQuery" class="maamu-stop-btn" title="Stop generation" style="display:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
          <button id="sendMaamuQuery" class="maamu-send-btn" title="Send (Enter / Ctrl+Enter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div class="maamu-status-chips">
          <span class="status-chip data-chip">📊 30-day data</span>
          <span class="status-chip model-chip" id="maamuUsageChip">🧮 Today: 0 tok</span>
          <span class="status-chip beast-chip" id="beastChipStatus" style="display:none">🔥 Beast Mode</span>
          <span class="status-chip profile-chip" id="maamuProfileChip">👤 You</span>
          <select id="maamuSessionSelectBottom" class="maamu-model-inline-select" title="Past chats"></select>
          <button id="maamuDeleteSessionBtn" class="maamu-session-delete-inline-btn" title="Delete selected chat">Delete Chat</button>
          <button id="maamuExportMdBtn" class="maamu-session-delete-inline-btn" title="Export active chat as markdown">Export .md</button>
          <select id="maamuModelSelectBottom" class="maamu-model-inline-select" title="Select model"></select>
        </div>
      </div>
    </div>
  </div>
`;

// --- HTML Templates ---

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
      <button class="msg-action-btn copy-response-btn" data-idx="${idx}" data-copy-mode="markdown" title="Copy Markdown">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy MD
      </button>
      <button class="msg-action-btn copy-response-btn" data-idx="${idx}" data-copy-mode="text" title="Copy Plain Text">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>
        Copy Text
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
