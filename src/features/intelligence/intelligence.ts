import { getSecureLocalProfileString } from '@/utils/security';
/**
 * Handles the Maamu AI chat logic.
 * 
 * This file deals with starting new chats, showing the responses, 
 * and managing the AI mentor's state.
 */

import { getCurrentUserId } from '@/services/auth.service';
import { 
  getTacticalBriefing, 
  getTacticalBriefingString, 
  getChatSessions, 
  getActiveSession, 
  createNewSession, 
  deleteSession, 
  switchSession 
} from './intelligence.service';
import { getMaamuResponseStream, generateSessionTitle, MAAMU_MODELS, normalizeMaamuModel } from '@/services/groq.service';
import { appState } from '@/state/app-state';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { getCurrentUserLeaderboardContext } from '@/features/dashboard/leaderboard';
import { notificationService } from '@/services/notification.service';
import { formatDuration } from '@/utils/date.utils';
import { 
  intelligenceView, 
  buildMessageHTML, 
  buildWelcomeScreen, 
  formatMaamuText,
  markdownToPlainText,
  buildIdentityRequiredScreen
} from './intelligence.ui';

let listenersBound = false;
let sendMessageFn: ((query?: string) => void) | null = null;
let activeStreamController: AbortController | null = null;
const MAAMU_COMPACT_STORAGE_KEY = 'maamu_compact_view';
const MAAMU_TEMPLATES_COLLAPSED_KEY = 'maamu_templates_collapsed';
const MAAMU_TEMPLATE_FAVS_KEY = 'maamu_template_favs';
const MAAMU_TEMPLATE_CATEGORY_KEY = 'maamu_template_category';
const MOBILE_COMPACT_MEDIA = '(max-width: 768px)';

// --- Helpers ---

function getUserAvatar(): string {
  try {
    const raw = getSecureLocalProfileString();
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

function setStopButtonState(isStreaming: boolean): void {
  const stopBtn = document.getElementById('stopMaamuQuery') as HTMLButtonElement | null;
  if (!stopBtn) return;
  stopBtn.style.display = isStreaming ? 'inline-flex' : 'none';
}

function isCompactModeEnabled(): boolean {
  return localStorage.getItem(MAAMU_COMPACT_STORAGE_KEY) === '1';
}

function setCompactMode(enabled: boolean): void {
  localStorage.setItem(MAAMU_COMPACT_STORAGE_KEY, enabled ? '1' : '0');
  const container = document.getElementById('maamuGptContainer');
  if (container) container.classList.toggle('maamu-compact', enabled);
  const btn = document.getElementById('toggleCompactView') as HTMLButtonElement | null;
  if (btn) btn.textContent = enabled ? 'Comfort' : 'Compact';
}

function hasUserCompactPreference(): boolean {
  return localStorage.getItem(MAAMU_COMPACT_STORAGE_KEY) !== null;
}

function getEffectiveCompactMode(): boolean {
  if (hasUserCompactPreference()) return isCompactModeEnabled();
  return window.matchMedia(MOBILE_COMPACT_MEDIA).matches;
}

function areTemplatesCollapsed(): boolean {
  return localStorage.getItem(MAAMU_TEMPLATES_COLLAPSED_KEY) === '1';
}

function setTemplatesCollapsed(collapsed: boolean): void {
  localStorage.setItem(MAAMU_TEMPLATES_COLLAPSED_KEY, collapsed ? '1' : '0');
  const container = document.getElementById('maamuGptContainer');
  if (container) container.classList.toggle('templates-collapsed', collapsed);
  const btn = document.getElementById('toggleTemplatesBtn') as HTMLButtonElement | null;
  if (btn) btn.textContent = collapsed ? 'Show' : 'Hide';
}

function getTemplateFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(MAAMU_TEMPLATE_FAVS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveTemplateFavorites(favs: Set<string>): void {
  localStorage.setItem(MAAMU_TEMPLATE_FAVS_KEY, JSON.stringify(Array.from(favs)));
}

function getTemplateCategory(): string {
  const value = localStorage.getItem(MAAMU_TEMPLATE_CATEGORY_KEY) || 'all';
  return ['all', 'favorites', 'general', 'coding', 'web'].includes(value) ? value : 'all';
}

function setTemplateCategory(category: string): void {
  localStorage.setItem(MAAMU_TEMPLATE_CATEGORY_KEY, category);
}

function refreshTemplateUI(): void {
  const selectedCategory = getTemplateCategory();
  const favorites = getTemplateFavorites();

  document.querySelectorAll('.maamu-template-cat-btn').forEach((el) => {
    const btn = el as HTMLButtonElement;
    const isActive = btn.getAttribute('data-template-category') === selectedCategory;
    btn.classList.toggle('active', isActive);
  });

  document.querySelectorAll('.maamu-template-btn').forEach((el) => {
    const btn = el as HTMLButtonElement;
    const templateId = btn.getAttribute('data-template-id') || '';
    const templateCategory = btn.getAttribute('data-template-category') || 'general';
    const isFavorite = favorites.has(templateId);
    const shouldShow = selectedCategory === 'all'
      || (selectedCategory === 'favorites' && isFavorite)
      || selectedCategory === templateCategory;

    btn.style.display = shouldShow ? 'inline-flex' : 'none';
    btn.classList.toggle('is-favorite', isFavorite);
    const star = btn.querySelector('.tpl-star-btn') as HTMLElement | null;
    if (star) {
      star.textContent = isFavorite ? '★' : '☆';
      star.setAttribute('title', isFavorite ? 'Remove favorite' : 'Mark favorite');
    }
  });
}

// --- Helpers ---

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil((text || '').length / 4));
}

const DAILY_TOKEN_BUDGET = 10000;

function getUsageStorageKey(): string {
  const day = new Date().toISOString().split('T')[0];
  return `maamu_usage_${day}`;
}

function addDailyUsage(tokens: number): void {
  const key = getUsageStorageKey();
  const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
  localStorage.setItem(key, String(current + Math.max(0, tokens)));
}

function getDailyUsage(): number {
  return parseInt(localStorage.getItem(getUsageStorageKey()) || '0', 10) || 0;
}

function renderUsageChip(): void {
  const chip = document.getElementById('maamuUsageChip');
  if (!chip) return;
  const used = getDailyUsage();
  const remainingPct = Math.max(0, Math.round(((DAILY_TOKEN_BUDGET - used) / DAILY_TOKEN_BUDGET) * 100));
  chip.textContent = `🧮 ${remainingPct}% left`;
  chip.setAttribute('title', `${Math.max(0, DAILY_TOKEN_BUDGET - used)} / ${DAILY_TOKEN_BUDGET} est. tokens remaining today`);
}

function exportActiveConversationMarkdown(): void {
  const session = getActiveSession();
  if (!session) return;
  const body = session.messages
    .filter(m => m.role !== 'system')
    .map(m => `## ${m.role === 'user' ? getUserDisplayName() : 'Maamu'}\n\n${m.content}\n`)
    .join('\n');
  const content = `# ${session.title}\n\n${body}`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title.replace(/[^a-z0-9\-_\s]/gi, '').trim().replace(/\s+/g, '_') || 'maamu_chat'}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

import { getLocalSmallTalkReply, getLocalDataContextReply } from './intelligence.local';

// --- Main Chat UI ---

export function renderIntelligenceBriefing(): void {
  const container = document.getElementById('intelligencePane');
  if (!container) return;

  // Inject shell if missing, then bind listeners once.
  if (!document.getElementById('maamuGptContainer')) {
    container.innerHTML = intelligenceView;
  }
  if (!listenersBound) {
    listenersBound = setupListeners();
  }

  // Ensure send flow always has an active session.
  if (!getActiveSession()) {
    createNewSession().then((id) => {
      if (id) {
        renderIntelligenceBriefing();
      } else {
        const chatOutput = document.getElementById('maamuChatOutput');
        if (chatOutput) {
          chatOutput.innerHTML = buildIdentityRequiredScreen();
        }
      }
    });
    return;
  }

  const toggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  if (toggle) toggle.checked = !!appState.settings.beastMode;

  const avatarChip = document.getElementById('maamuUserAvatarChip');
  if (avatarChip) avatarChip.textContent = getUserAvatar();
  const profileChip = document.getElementById('maamuProfileChip');
  if (profileChip) profileChip.textContent = `${getUserAvatar()} ${getUserDisplayName()}`;

  const beastChip = document.getElementById('beastChipStatus');
  if (beastChip) beastChip.style.display = appState.settings.beastMode ? 'inline-flex' : 'none';

  const session = getActiveSession();
  const titleEl = document.getElementById('activeMissionTitle');
  if (titleEl) titleEl.textContent = session ? session.title : 'MAAMU AI';
  setCompactMode(getEffectiveCompactMode());
  setTemplatesCollapsed(areTemplatesCollapsed());
  renderModelOptions();

  renderSessionsList();
  renderActiveChat();
  renderSidebarMetrics();
  renderSessionQuickAccess();
  renderUsageChip();
}

function renderModelOptions(): void {
  const activeModel = normalizeMaamuModel(appState.settings.maamuModel);
  const options = MAAMU_MODELS.map(model =>
    `<option value="${model.id}" ${model.id === activeModel ? 'selected' : ''}>${model.label}</option>`
  ).join('');

  const inlineSelect = document.getElementById('maamuModelSelectInline') as HTMLSelectElement | null;
  if (inlineSelect) inlineSelect.innerHTML = options;

  const sidebarSelect = document.getElementById('maamuModelSelect') as HTMLSelectElement | null;
  if (sidebarSelect) sidebarSelect.innerHTML = options;

  const bottomSelect = document.getElementById('maamuModelSelectBottom') as HTMLSelectElement | null;
  if (bottomSelect) bottomSelect.innerHTML = options;
}

function bindModelSelect(selectEl: HTMLSelectElement | null): void {
  if (!selectEl || selectEl.dataset.bound === 'true') return;
  selectEl.dataset.bound = 'true';
  selectEl.addEventListener('change', (e) => {
    const selected = normalizeMaamuModel((e.target as HTMLSelectElement).value);
    appState.settings.maamuModel = selected;
    saveSettingsToStorage(appState.settings);
    renderModelOptions();
  });
}

function renderSessionQuickAccess(): void {
  const select = document.getElementById('maamuSessionSelectBottom') as HTMLSelectElement | null;
  if (!select) return;
  const sessions = [...getChatSessions()].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.lastActive - a.lastActive;
  });
  const activeId = getActiveSession()?.id || '';
  select.innerHTML = sessions.map(s => {
    const shortTitle = s.title.length > 26 ? `${s.title.slice(0, 26)}…` : s.title;
    return `<option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>${s.pinned ? '📌' : '💬'} ${shortTitle}</option>`;
  }).join('');
}

function bindSessionQuickAccess(): void {
  const select = document.getElementById('maamuSessionSelectBottom') as HTMLSelectElement | null;
  if (select && select.dataset.bound !== 'true') {
    select.dataset.bound = 'true';
    select.addEventListener('change', (e) => {
      const id = (e.target as HTMLSelectElement).value;
      if (!id) return;
      switchSession(id);
      renderSessionsList();
      renderActiveChat();
      renderSidebarMetrics();
      const s = getActiveSession();
      const t = document.getElementById('activeMissionTitle');
      if (t) t.textContent = s ? s.title : 'MAAMU AI';
    });
  }

  const deleteBtn = document.getElementById('maamuDeleteSessionBtn') as HTMLButtonElement | null;
  if (deleteBtn && deleteBtn.dataset.bound !== 'true') {
    deleteBtn.dataset.bound = 'true';
    deleteBtn.addEventListener('click', async () => {
      const selectedId = (document.getElementById('maamuSessionSelectBottom') as HTMLSelectElement | null)?.value || getActiveSession()?.id || '';
      if (!selectedId) return;
      if (!confirm('Delete this conversation?')) return;
      await deleteSession(selectedId);
      renderSessionsList();
      renderActiveChat();
      renderSessionQuickAccess();
      renderSidebarMetrics();
      const s = getActiveSession();
      const t = document.getElementById('activeMissionTitle');
      if (t) t.textContent = s ? s.title : 'MAAMU AI';
    });
  }
}

// --- Session Management ---

function renderSessionsList(): void {
  const list = document.getElementById('maamuSessionList');
  if (!list) return;

  const allSessions = getChatSessions();
  const activeId = getActiveSession()?.id;
  const searchTerm = ((document.getElementById('maamuSessionSearch') as HTMLInputElement | null)?.value || '').trim().toLowerCase();
  const sessions = [...allSessions]
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.lastActive - a.lastActive;
    })
    .filter(sess => {
      if (!searchTerm) return true;
      const hay = `${sess.title} ${(sess.messages || []).map(m => m.content).join(' ')}`.toLowerCase();
      return hay.includes(searchTerm);
    });

  const countEl = document.getElementById('maamuSessionCount');
  if (countEl) countEl.textContent = String(allSessions.length);

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
        <button class="session-pin-btn ${sess.pinned ? 'active' : ''}" data-id="${sess.id}" title="Pin conversation">📌</button>
        <button class="session-delete-btn" data-id="${sess.id}" title="Delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.maamu-session-item').forEach(el => {
    el.addEventListener('click', async e => {
      const delBtn = (e.target as HTMLElement).closest('.session-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        if (confirm('Delete this conversation?')) {
          await deleteSession(delBtn.getAttribute('data-id') || '');
          renderSessionsList();
          renderActiveChat();
          renderSessionQuickAccess();
          const s = getActiveSession();
          const t = document.getElementById('activeMissionTitle');
          if (t) t.textContent = s ? s.title : 'MAAMU AI';
        }
        return;
      }
      const pinBtn = (e.target as HTMLElement).closest('.session-pin-btn');
      if (pinBtn) {
        e.stopPropagation();
        const target = getChatSessions().find(s => s.id === pinBtn.getAttribute('data-id'));
        if (!target) return;
        target.pinned = !target.pinned;
        renderSessionsList();
        renderSessionQuickAccess();
        return;
      }
      switchSession(el.getAttribute('data-id') || '');
      renderSessionsList();
      renderActiveChat();
      renderSessionQuickAccess();
      const s = getActiveSession();
      const t = document.getElementById('activeMissionTitle');
      if (t) t.textContent = s ? s.title : 'MAAMU AI';
      if (window.innerWidth <= 1024) document.getElementById('maamuSidebar')?.classList.remove('active');
    });
  });
}

// --- Chat Rendering ---

function renderActiveChat(): void {
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!chatOutput) return;
  const session = getActiveSession();
  if (!session) return;

  const msgs = session.messages.filter(m => m.role !== 'system');
  if (msgs.length > 0 && !areTemplatesCollapsed()) setTemplatesCollapsed(true);
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
      const mode = btn.getAttribute('data-copy-mode') || 'markdown';
      const msgs = getActiveSession()?.messages.filter(m => m.role !== 'system') || [];
      const raw = msgs[idx]?.content || '';
      const content = mode === 'text' ? markdownToPlainText(raw) : raw;
      navigator.clipboard.writeText(content);
      (btn as HTMLElement).textContent = '✓ Copied!';
      setTimeout(() => {
        (btn as HTMLElement).innerHTML = mode === 'text'
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg> Copy Text`
          : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy MD`;
      }, 1500);
    });
  });

  chatOutput.querySelectorAll('.regenerate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx') || '0');
      const sessionMsgs = getActiveSession()?.messages.filter(m => m.role !== 'system') || [];
      let retryPrompt = '';
      for (let i = idx - 1; i >= 0; i--) {
        if (sessionMsgs[i]?.role === 'user') {
          retryPrompt = sessionMsgs[i].content || '';
          break;
        }
      }
      if (retryPrompt && sendMessageFn) sendMessageFn(retryPrompt);
    });
  });
}

// --- Streaming AI Responses ---

function streamResponse(
  query: string,
  chatOutput: HTMLElement,
  options: { sessionId: string; onFinish: () => void }
): void {
  const tacticalBrief = getTacticalBriefingString();
  const session = getActiveSession();
  if (!session) {
    options.onFinish();
    return;
  }
  const isFirstMsg = session.messages.filter(m => m.role === 'user').length <= 1;

  const assistantRow = document.createElement('div');
  assistantRow.className = 'msg-row assistant streaming';
  assistantRow.innerHTML = `
    <div class="msg-avatar"><span class="maamu-ai-avatar">🧠</span></div>
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

  activeStreamController = new AbortController();
  setStopButtonState(true);
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
          <button class="msg-action-btn copy-response-btn" data-copy-mode="markdown" title="Copy Markdown">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
          </button>
          <button class="msg-action-btn copy-response-btn" data-copy-mode="text" title="Copy Plain Text">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg> Copy Text
          </button>
        `;
        msgBody.appendChild(actions);
        actions.querySelectorAll('.copy-response-btn').forEach(btn => btn.addEventListener('click', e => {
          const mode = (e.currentTarget as HTMLElement).getAttribute('data-copy-mode') || 'markdown';
          const content = mode === 'text' ? markdownToPlainText(fullResponse) : fullResponse;
          navigator.clipboard.writeText(content);
          (e.currentTarget as HTMLElement).textContent = '✓ Copied!';
          setTimeout(() => {
            (e.currentTarget as HTMLElement).innerHTML = mode === 'text'
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg> Copy Text`
              : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy MD`;
          }, 1500);
        }));
      }

      // Auto-name session from first message
      if (isFirstMsg && session.title === 'New Chat') {
        const title = generateSessionTitle(query);
        session.title = title;
        const t = document.getElementById('activeMissionTitle');
        if (t) t.textContent = title;
        renderSessionsList();
        saveSettingsToStorage(appState.settings);
      }

      // 🛡️ Universal Recall: Persist both query and full response to DB
      import('./intelligence.service').then(({ persistMessage }) => {
        persistMessage(options.sessionId, 'user', query);
        persistMessage(options.sessionId, 'assistant', fullResponse);
      });

      addDailyUsage(estimateTokens(query) + estimateTokens(fullResponse));
      renderUsageChip();
      chatOutput.scrollTop = chatOutput.scrollHeight;
      activeStreamController = null;
      setStopButtonState(false);
      options.onFinish();
    },
    err => {
      assistantRow.classList.remove('streaming');
      if (contentEl) {
        contentEl.innerHTML = err === 'Generation stopped.'
          ? `<span class="error-msg">⏹️ Generation stopped.</span>`
          : `<span class="error-msg">⚡ ${err}</span>`;
      }
      activeStreamController = null;
      setStopButtonState(false);
      options.onFinish();
    },
    { sessionId: options.sessionId, signal: activeStreamController.signal }
  );
}

// --- Sidebar Stats ---

function renderSidebarMetrics(): void {
  const footer = document.getElementById('maamuSidebarFooter');
  if (!footer) return;
  const sessions = getChatSessions();
  const activeId = getActiveSession()?.id || '';
  const quickItems = sessions.slice(0, 6).map(s => `
    <div class="maamu-footer-session ${s.id === activeId ? 'active' : ''}" data-id="${s.id}">
      <span class="mfs-title">${s.title.length > 20 ? `${s.title.slice(0, 20)}…` : s.title}</span>
      <button class="mfs-delete" data-id="${s.id}" title="Delete">×</button>
    </div>
  `).join('');

  const syncId = getCurrentUserId();
  
  if (syncId) {
    footer.innerHTML = `
      <div class="sidebar-metrics">
        <div class="sm-label">RECENT CONVERSATIONS</div>
        <div class="maamu-footer-history">
          ${quickItems || '<div class="session-preview">No chat history yet</div>'}
        </div>
      </div>
      <div class="sidebar-api-section">
        <div class="sm-label">AI MODEL</div>
        <select id="maamuModelSelect" class="api-key-input"></select>
        <div class="sm-label">GROQ API KEY</div>
        <form onsubmit="return false;" style="margin:0; padding:0;">
          <input type="text" name="username" style="display:none;" autocomplete="username" value="maamu-ai-key">
          <input type="password" id="maamuApiKeyInput" class="api-key-input" value="${appState.settings.groqApiKey || ''}" placeholder="gsk_..." autocomplete="new-password">
        </form>
        <button type="button" id="saveMaamuApiKey" class="save-api-btn">Save Key</button>
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
    footer.querySelectorAll('.maamu-footer-session').forEach(el => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.mfs-delete')) return;
        const id = (el as HTMLElement).getAttribute('data-id') || '';
        if (!id) return;
        switchSession(id);
        renderSessionsList();
        renderActiveChat();
        renderSidebarMetrics();
      });
    });
    footer.querySelectorAll('.mfs-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute('data-id') || '';
        if (!id || !confirm('Delete this conversation?')) return;
        await deleteSession(id);
        renderSessionsList();
        renderActiveChat();
        renderSidebarMetrics();
      });
    });
    renderModelOptions();
    bindModelSelect(document.getElementById('maamuModelSelect') as HTMLSelectElement | null);
  } else {
    footer.innerHTML = `
      <div class="sidebar-metrics">
        <div class="sm-label">RECENT CONVERSATIONS</div>
        <div class="maamu-footer-history">
          ${quickItems || '<div class="session-preview">No chat history yet</div>'}
        </div>
      </div>
      <div class="sidebar-api-section auth-locked">
        <div class="sm-label">AI MISSION CONTROL</div>
        <div class="auth-required-note">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V17M12 7V13M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke-linecap="round"/></svg>
          <strong>Identity Required</strong>
          <p>Login to your Mission Profile to activate your private AI Strategist.</p>
        </div>
      </div>
    `;
    footer.querySelectorAll('.maamu-footer-session').forEach(el => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.mfs-delete')) return;
        const id = (el as HTMLElement).getAttribute('data-id') || '';
        if (!id) return;
        switchSession(id);
        renderSessionsList();
        renderActiveChat();
        renderSidebarMetrics();
      });
    });
    footer.querySelectorAll('.mfs-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute('data-id') || '';
        if (!id || !confirm('Delete this conversation?')) return;
        await deleteSession(id);
        renderSessionsList();
        renderActiveChat();
        renderSidebarMetrics();
      });
    });
  }
}

// --- Event Listeners ---

function openNewMissionDialog(): void {
  const overlay = document.getElementById('newMissionOverlay');
  const input = document.getElementById('newMissionTitleInput') as HTMLInputElement;
  if (overlay) { overlay.classList.add('visible'); input?.focus(); }
}

function closeNewMissionDialog(): void {
  const overlay = document.getElementById('newMissionOverlay');
  if (overlay) overlay.classList.remove('visible');
}

function setupListeners(): boolean {
  const input = document.getElementById('maamuQueryInput') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('sendMaamuQuery');
  const chatOutput = document.getElementById('maamuChatOutput');
  if (!input || !sendBtn || !chatOutput) return false;
  let isSending = false;

  const updateSendButtonState = () => {
    const hasText = !!input.value.trim();
    const busy = isSending;
    sendBtn.toggleAttribute('disabled', busy || !hasText);
    sendBtn.setAttribute('aria-disabled', String(busy || !hasText));
    sendBtn.style.opacity = busy || !hasText ? '0.6' : '1';
    sendBtn.style.cursor = busy || !hasText ? 'not-allowed' : 'pointer';
  };

  // ── New Mission Dialog ──
  renderModelOptions();
  bindModelSelect(document.getElementById('maamuModelSelectInline') as HTMLSelectElement | null);
  bindModelSelect(document.getElementById('maamuModelSelectBottom') as HTMLSelectElement | null);
  bindSessionQuickAccess();
  renderUsageChip();
  document.getElementById('maamuSessionSearch')?.addEventListener('input', () => renderSessionsList());
  document.querySelectorAll('.maamu-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = (btn as HTMLElement).getAttribute('data-template') || '';
      if (!tpl) return;
      input.value = tpl;
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  });
  document.querySelectorAll('.tpl-star-btn').forEach(star => {
    star.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const templateBtn = (e.currentTarget as HTMLElement).closest('.maamu-template-btn') as HTMLElement | null;
      const templateId = templateBtn?.getAttribute('data-template-id');
      if (!templateId) return;
      const favorites = getTemplateFavorites();
      if (favorites.has(templateId)) favorites.delete(templateId);
      else favorites.add(templateId);
      saveTemplateFavorites(favorites);
      refreshTemplateUI();
    });
  });
  document.querySelectorAll('.maamu-template-cat-btn').forEach(cat => {
    cat.addEventListener('click', () => {
      const category = (cat as HTMLElement).getAttribute('data-template-category') || 'all';
      setTemplateCategory(category);
      refreshTemplateUI();
    });
  });
  refreshTemplateUI();
  document.getElementById('maamuExportMdBtn')?.addEventListener('click', exportActiveConversationMarkdown);
  document.getElementById('toggleCompactView')?.addEventListener('click', () => {
    setCompactMode(!getEffectiveCompactMode());
  });
  const mobileCompactMedia = window.matchMedia(MOBILE_COMPACT_MEDIA);
  mobileCompactMedia.addEventListener?.('change', () => {
    if (!hasUserCompactPreference()) setCompactMode(getEffectiveCompactMode());
  });
  document.getElementById('toggleTemplatesBtn')?.addEventListener('click', () => {
    setTemplatesCollapsed(!areTemplatesCollapsed());
  });

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
  document.getElementById('newMissionConfirm')?.addEventListener('click', async () => {
    const titleInput = document.getElementById('newMissionTitleInput') as HTMLInputElement;
    const title = titleInput?.value.trim() || 'New Chat';
    await createNewSession(title);
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
    input.scrollTop = input.scrollHeight;
    updateSendButtonState();
  });

  const handleSend = (overrideQuery?: string) => {
    if (isSending) return;
    const query = (overrideQuery ?? input.value).trim();
    if (!query) return;
    const localReply = getLocalSmallTalkReply(query, getUserDisplayName()) || getLocalDataContextReply(query);
    let session = getActiveSession();
    if (!session) {
      createNewSession();
      saveSettingsToStorage(appState.settings);
      session = getActiveSession();
      if (!session) return;
      renderSessionsList();
    }
    const lockedSessionId = session.id;

    isSending = true;
    updateSendButtonState();

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
    if (!overrideQuery) {
      input.value = '';
      input.style.height = 'auto';
      input.scrollTop = 0;
    }
    chatOutput.scrollTop = chatOutput.scrollHeight;
    if (localReply) {
      const botRow = document.createElement('div');
      botRow.innerHTML = `
        <div class="msg-row assistant">
          <div class="msg-avatar"><span class="maamu-ai-avatar">🧠</span></div>
          <div class="msg-body">
            <div class="msg-sender">Maamu</div>
            <div class="msg-content">${formatMaamuText(localReply)}</div>
          </div>
        </div>
      `;
      chatOutput.appendChild(botRow.firstElementChild!);
      // Persist both messages to DB via in-memory cache + non-blocking API call
      import('./intelligence.service').then(({ persistMessage }) => {
        persistMessage(lockedSessionId, 'user', query);
        persistMessage(lockedSessionId, 'assistant', localReply);
      });
      addDailyUsage(estimateTokens(query) + estimateTokens(localReply));
      renderSessionsList();
      renderSidebarMetrics();
      renderUsageChip();
      isSending = false;
      updateSendButtonState();
      input.focus();
      return;
    }
    streamResponse(query, chatOutput, {
      sessionId: lockedSessionId,
      onFinish: () => {
        isSending = false;
        updateSendButtonState();
        input.focus();
      }
    });
  };
  sendMessageFn = handleSend;

  sendBtn.addEventListener('click', () => handleSend());
  document.getElementById('stopMaamuQuery')?.addEventListener('click', () => {
    if (activeStreamController) activeStreamController.abort();
  });
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    const wantsSend = e.key === 'Enter' && ((e.ctrlKey || e.metaKey) || !e.shiftKey);
    if (wantsSend) { e.preventDefault(); handleSend(); }
  });
  updateSendButtonState();
  setStopButtonState(false);
  setCompactMode(getEffectiveCompactMode());
  setTemplatesCollapsed(areTemplatesCollapsed());

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
    const sidebar = document.getElementById('maamuSidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('active');
  });
  document.addEventListener('click', (e: MouseEvent) => {
    const sb = document.getElementById('maamuSidebar');
    const tog = document.getElementById('toggleMaamuSidebar');
    if (!sb || !tog) return;
    if (window.innerWidth <= 1024) {
      if (sb.classList.contains('active') && !sb.contains(e.target as Node) && !tog.contains(e.target as Node)) {
        sb.classList.remove('active');
      }
    }    
  });

  window.addEventListener('all-tracker-identity-sync', async () => {
    import('./intelligence.service').then(async ({ loadMaamuSessionsIntoState }) => {
      await loadMaamuSessionsIntoState();
      renderSessionsList();
      renderActiveChat();
      renderSidebarMetrics();
      renderSessionQuickAccess();
      const s = getActiveSession();
      const t = document.getElementById('activeMissionTitle');
      if (t) t.textContent = s ? s.title : 'MAAMU AI';
    });
  });

  return true;
}
