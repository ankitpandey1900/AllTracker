/**
 * Maamu AI Intelligence Feature
 * 
 * Handles the logic for chat sessions, streaming responses, 
 * and side-effect management for the AI mentor.
 */

import { 
  getTacticalBriefing, 
  getTacticalBriefingString, 
  getChatSessions, 
  getActiveSession, 
  createNewSession, 
  deleteSession, 
  switchSession 
} from './intelligence.service';
import { getMaamuResponseStream, generateSessionTitle } from '@/services/groq.service';
import { appState } from '@/state/app-state';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { STORAGE_KEYS } from '@/config/constants';
import { 
  intelligenceView, 
  buildMessageHTML, 
  buildWelcomeScreen, 
  formatMaamuText 
} from './intelligence.ui';

// ─── Helpers ─────────────────────────────────────────────────────

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

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Main Render ──────────────────────────────────────────────────

export function renderIntelligenceBriefing(): void {
  const container = document.getElementById('intelligencePane');
  if (!container) return;

  if (!document.getElementById('maamuGptContainer')) {
    container.innerHTML = intelligenceView;
  }

  const toggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  if (toggle) toggle.checked = !!appState.settings.beastMode;

  const avatarChip = document.getElementById('maamuUserAvatarChip');
  if (avatarChip) avatarChip.textContent = getUserAvatar();

  const beastChip = document.getElementById('beastChipStatus');
  if (beastChip) beastChip.style.display = appState.settings.beastMode ? 'inline-flex' : 'none';

  const session = getActiveSession();
  const titleEl = document.getElementById('activeMissionTitle');
  if (titleEl) titleEl.textContent = session ? session.title : 'MAAMU AI';

  renderSessionsList();
  renderActiveChat();
  renderSidebarMetrics();
  setupListeners();
}

// ─── Session List ─────────────────────────────────────────────────

function renderSessionsList(): void {
  const list = document.getElementById('maamuSessionList');
  if (!list) return;

  const sessions = getChatSessions();
  const activeId = getActiveSession()?.id;

  const countEl = document.getElementById('maamuSessionCount');
  if (countEl) countEl.textContent = String(sessions.length);

  if (sessions.length === 0) {
    list.innerHTML = `
      <div class="no-sessions">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>No conversations yet</span>
        <small>Click "New Chat" to start</small>
      </div>
    `;
    return;
  }

  list.innerHTML = sessions.map(sess => {
    const isActive = sess.id === activeId;
    const userMsgs = sess.messages.filter(m => m.role === 'user');
    const lastMsg = userMsgs.slice(-1)[0]?.content || '';
    const preview = lastMsg.length > 38 ? lastMsg.slice(0, 38) + '…' : (lastMsg || 'Empty session');
    const msgCount = userMsgs.length;
    const timeLabel = getRelativeTime(sess.lastActive);

    return `
      <div class="maamu-session-item ${isActive ? 'active' : ''}" data-id="${sess.id}">
        <div class="session-icon">${isActive ? '▶' : '●'}</div>
        <div class="session-item-content">
          <div class="session-item-title">${sess.title}</div>
          <div class="session-preview">${preview}</div>
          <div class="session-item-footer">
            <span class="session-time">${timeLabel}</span>
            ${msgCount > 0 ? `<span class="session-msg-count">${msgCount} msg${msgCount !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
        <button class="session-delete-btn" data-id="${sess.id}" title="Delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.maamu-session-item').forEach(el => {
    el.addEventListener('click', e => {
      const delBtn = (e.target as HTMLElement).closest('.session-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        if (confirm('Delete this conversation?')) {
          deleteSession(delBtn.getAttribute('data-id') || '');
          saveSettingsToStorage(appState.settings);
          renderSessionsList();
          renderActiveChat();
          const s = getActiveSession();
          const t = document.getElementById('activeMissionTitle');
          if (t) t.textContent = s ? s.title : 'MAAMU AI';
        }
        return;
      }
      switchSession(el.getAttribute('data-id') || '');
      saveSettingsToStorage(appState.settings);
      renderSessionsList();
      renderActiveChat();
      const s = getActiveSession();
      const t = document.getElementById('activeMissionTitle');
      if (t) t.textContent = s ? s.title : 'MAAMU AI';
      if (window.innerWidth <= 1024) document.getElementById('maamuSidebar')?.classList.remove('active');
    });
  });
}

// ─── Chat Render ──────────────────────────────────────────────────

function renderActiveChat(): void {
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!chatOutput) return;
  const session = getActiveSession();
  if (!session) return;

  const msgs = session.messages.filter(m => m.role !== 'system');
  if (msgs.length === 0) {
    chatOutput.innerHTML = buildWelcomeScreen();
    chatOutput.querySelectorAll('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
        if (input) { input.value = (btn as HTMLElement).textContent || ''; input.dispatchEvent(new Event('input')); input.focus(); }
      });
    });
    injectDailyBriefing(chatOutput);
    return;
  }
  chatOutput.innerHTML = msgs.map((m, i) => buildMessageHTML(m.role, m.content, i, getUserAvatar(), getUserDisplayName())).join('');
  bindMsgActions(chatOutput);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function injectDailyBriefing(chatOutput: HTMLElement): void {
  const todayKey = 'maamu_brief_' + new Date().toISOString().split('T')[0];
  const session = getActiveSession();
  if (!session || localStorage.getItem(todayKey) === session.id || session.messages.length > 0) return;

  const briefing = getTacticalBriefing();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = getUserDisplayName();
  const getColor = (v: number) => v > 75 ? '#10b981' : v > 45 ? '#f59e0b' : '#ef4444';

  const el = document.createElement('div');
  el.className = 'daily-briefing-banner';
  el.innerHTML = `
    <div class="daily-brief-header"><span>🧠</span><span>DAILY BRIEFING</span></div>
    <p class="daily-brief-greeting">${greeting}, <strong>${name}</strong></p>
    <div class="daily-brief-stats">
      <div class="bs-item"><span>Sustainability</span><div class="bs-bar"><div class="bs-fill" style="width:${briefing.sustainabilityScore}%;background:${getColor(briefing.sustainabilityScore)}"></div></div><span>${briefing.sustainabilityScore}%</span></div>
      <div class="bs-item"><span>Discipline</span><div class="bs-bar"><div class="bs-fill" style="width:${briefing.disciplineTrend}%;background:${getColor(briefing.disciplineTrend)}"></div></div><span>${briefing.disciplineTrend}%</span></div>
    </div>
    <p class="daily-brief-msg">${briefing.mentorMessage}</p>
  `;
  const welcome = chatOutput.querySelector('.maamu-welcome');
  if (welcome) welcome.prepend(el);
  localStorage.setItem(todayKey, session.id);
}

function bindMsgActions(chatOutput: HTMLElement): void {
  chatOutput.querySelectorAll('.copy-response-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx') || '0');
      const msgs = getActiveSession()?.messages.filter(m => m.role !== 'system') || [];
      navigator.clipboard.writeText(msgs[idx]?.content || '');
      (btn as HTMLElement).textContent = '✓ Copied!';
      setTimeout(() => { (btn as HTMLElement).innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1500);
    });
  });
}

// ─── Streaming ────────────────────────────────────────────────────

function streamResponse(query: string, chatOutput: HTMLElement): void {
  const tacticalBrief = getTacticalBriefingString();
  const session = getActiveSession();
  if (!session) return;
  const isFirstMsg = session.messages.filter(m => m.role === 'user').length <= 1;

  const assistantRow = document.createElement('div');
  assistantRow.className = 'msg-row assistant streaming';
  assistantRow.innerHTML = `
    <div class="msg-avatar">🧠</div>
    <div class="msg-body">
      <div class="msg-sender">Maamu</div>
      <div class="msg-content streaming-content">
        <span class="thinking-indicator"><span></span><span></span><span></span></span>
      </div>
    </div>
  `;
  chatOutput.appendChild(assistantRow);
  chatOutput.scrollTop = chatOutput.scrollHeight;

  const contentEl = assistantRow.querySelector('.streaming-content') as HTMLElement;

  getMaamuResponseStream(
    query, tacticalBrief,
    (_chunk, accumulated) => {
      if (contentEl) { contentEl.innerHTML = formatMaamuText(accumulated) + '<span class="stream-cursor">▋</span>'; chatOutput.scrollTop = chatOutput.scrollHeight; }
    },
    (fullResponse) => {
      assistantRow.classList.remove('streaming');
      if (contentEl) contentEl.innerHTML = formatMaamuText(fullResponse);

      const msgBody = assistantRow.querySelector('.msg-body');
      if (msgBody) {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        actions.innerHTML = `
          <button class="msg-action-btn copy-response-btn" title="Copy">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
          </button>
        `;
        msgBody.appendChild(actions);
        actions.querySelector('.copy-response-btn')?.addEventListener('click', e => {
          navigator.clipboard.writeText(fullResponse);
          (e.currentTarget as HTMLElement).textContent = '✓ Copied!';
          setTimeout(() => { (e.currentTarget as HTMLElement).innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1500);
        });
      }

      // Auto-name session from first message
      if (isFirstMsg && session.title === 'New Mission Strategy') {
        const title = generateSessionTitle(query);
        session.title = title;
        const t = document.getElementById('activeMissionTitle');
        if (t) t.textContent = title;
        renderSessionsList();
        saveSettingsToStorage(appState.settings);
      }
      chatOutput.scrollTop = chatOutput.scrollHeight;
    },
    err => {
      assistantRow.classList.remove('streaming');
      if (contentEl) contentEl.innerHTML = `<span class="error-msg">⚡ ${err}</span>`;
    }
  );
}

// ─── Sidebar Footer ───────────────────────────────────────────────

function renderSidebarMetrics(): void {
  const footer = document.getElementById('maamuSidebarFooter');
  if (!footer) return;
  const b = getTacticalBriefing();
  const col = (v: number) => v > 75 ? '#10b981' : v > 45 ? '#f59e0b' : '#ef4444';

  footer.innerHTML = `
    <div class="sidebar-metrics">
      <div class="sm-label">ARENA STATS</div>
      <div class="sm-row"><span>Sustain</span><div class="sm-bar"><div class="sm-fill" style="width:${b.sustainabilityScore}%;background:${col(b.sustainabilityScore)}"></div></div><span class="sm-val">${b.sustainabilityScore}%</span></div>
      <div class="sm-row"><span>Discipline</span><div class="sm-bar"><div class="sm-fill" style="width:${b.disciplineTrend}%;background:${col(b.disciplineTrend)}"></div></div><span class="sm-val">${b.disciplineTrend}%</span></div>
      <div class="sm-row"><span>Momentum</span><div class="sm-bar"><div class="sm-fill" style="width:${Math.max(0,Math.min(100,b.momentum+50))}%;background:${col(b.momentum+50)}"></div></div><span class="sm-val">${b.momentum > 0 ? '+' : ''}${b.momentum}%</span></div>
    </div>
    <div class="sidebar-api-section">
      <div class="sm-label">GROQ API KEY</div>
      <input type="password" id="maamuApiKeyInput" class="api-key-input" value="${appState.settings.groqApiKey || ''}" placeholder="gsk_...">
      <button id="saveMaamuApiKey" class="save-api-btn">Save Key</button>
      <a href="https://console.groq.com" target="_blank" class="api-link">Get your free key →</a>
    </div>
  `;
  document.getElementById('saveMaamuApiKey')?.addEventListener('click', () => {
    const val = (document.getElementById('maamuApiKeyInput') as HTMLInputElement)?.value.trim();
    appState.settings.groqApiKey = val;
    saveSettingsToStorage(appState.settings);
    const btn = document.getElementById('saveMaamuApiKey');
    if (btn) { btn.textContent = '✓ Saved!'; setTimeout(() => btn.textContent = 'Save Key', 2000); }
  });
}

// ─── Listeners ────────────────────────────────────────────────────

function openNewMissionDialog(): void {
  const overlay = document.getElementById('newMissionOverlay');
  const input = document.getElementById('newMissionTitleInput') as HTMLInputElement;
  if (overlay) { overlay.classList.add('visible'); input?.focus(); }
}

function closeNewMissionDialog(): void {
  const overlay = document.getElementById('newMissionOverlay');
  if (overlay) overlay.classList.remove('visible');
}

function setupListeners(): void {
  const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('sendMaamuQuery');
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!input || !sendBtn || !chatOutput) return;

  // ── New Mission Dialog ──
  document.getElementById('newMissionBtn')?.addEventListener('click', openNewMissionDialog);
  document.getElementById('newMissionCancel')?.addEventListener('click', closeNewMissionDialog);
  document.getElementById('newMissionOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('newMissionOverlay')) closeNewMissionDialog();
  });
  document.querySelectorAll('.quick-name-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const inp = document.getElementById('newMissionTitleInput') as HTMLInputElement;
      if (inp) inp.value = (chip as HTMLElement).textContent || '';
    });
  });
  document.getElementById('newMissionConfirm')?.addEventListener('click', () => {
    const titleInput = document.getElementById('newMissionTitleInput') as HTMLInputElement;
    const title = titleInput?.value.trim() || 'New Mission Strategy';
    createNewSession(title);
    saveSettingsToStorage(appState.settings);
    closeNewMissionDialog();
    if (titleInput) titleInput.value = '';
    renderSessionsList();
    renderActiveChat();
    const s = getActiveSession();
    const t = document.getElementById('activeMissionTitle');
    if (t && s) t.textContent = s.title;
  });
  document.getElementById('newMissionTitleInput')?.addEventListener('keydown', (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') document.getElementById('newMissionConfirm')?.click();
    if ((e as KeyboardEvent).key === 'Escape') closeNewMissionDialog();
  });

  // ── Send Message ──
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  const handleSend = () => {
    const query = input.value.trim();
    if (!query) return;
    const session = getActiveSession();
    if (!session) return;

    chatOutput.querySelector('.maamu-welcome')?.remove();

    const userRow = document.createElement('div');
    userRow.innerHTML = `
      <div class="msg-row user">
        <div class="msg-avatar">${getUserAvatar()}</div>
        <div class="msg-body">
          <div class="msg-sender">${getUserDisplayName()}</div>
          <div class="msg-content">${formatMaamuText(query)}</div>
        </div>
      </div>
    `;
    chatOutput.appendChild(userRow.firstElementChild!);
    input.value = '';
    input.style.height = 'auto';
    chatOutput.scrollTop = chatOutput.scrollHeight;
    streamResponse(query, chatOutput);
  };

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  // ── Beast Mode ──
  const beastToggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  beastToggle?.addEventListener('change', () => {
    appState.settings.beastMode = beastToggle.checked;
    saveSettingsToStorage(appState.settings);
    const chip = document.getElementById('beastChipStatus');
    if (chip) chip.style.display = beastToggle.checked ? 'inline-flex' : 'none';
    const banner = document.createElement('div');
    banner.className = 'system-msg';
    banner.textContent = beastToggle.checked ? '🔥 BEAST MODE: ELITE INTENSITY ENGAGED.' : '✅ BEAST MODE deactivated.';
    chatOutput.appendChild(banner);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  });

  // ── Sidebar Toggle ──
  document.getElementById('toggleMaamuSidebar')?.addEventListener('click', () => {
    document.getElementById('maamuSidebar')?.classList.toggle('active');
  });
  document.addEventListener('click', (e: MouseEvent) => {
    if (window.innerWidth <= 1024) {
      const sb = document.getElementById('maamuSidebar');
      const tog = document.getElementById('toggleMaamuSidebar');
      if (sb?.classList.contains('active') && !sb.contains(e.target as Node) && !tog?.contains(e.target as Node)) {
        sb.classList.remove('active');
      }
    }
  });
}
