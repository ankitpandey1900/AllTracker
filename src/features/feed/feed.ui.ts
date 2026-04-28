import { Transmission } from './feed.types';
import { fetchFeed, toggleLike, toggleRepost, postTransmission, deletePost, fetchComments, postComment, fetchUserPosts, getUnreadNotifCount, getNotifications, markNotifsRead, searchMentionUsers } from './feed.manager';

const MAX_CHARS = 280;
let feedPollTimer: ReturnType<typeof setInterval> | null = null;
let isLoggedIn = false;

export async function renderFeedView(container: HTMLElement): Promise<void> {
  const headerRight = document.getElementById('headerRight');
  isLoggedIn = !!(headerRight && headerRight.querySelector('.pilot-hud-pill, #headerUserAlias'));

  container.innerHTML = `
    <div class="feed-arena-layout">
      <div class="world-stage-card">
        <div class="feed-header">
          <h2>WORLD FEED</h2>
          <div class="feed-header-right">
            ${isLoggedIn ? `<button class="notif-bell" id="notifBell" title="Notifications">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="notif-badge" id="notifBadge" style="display:none;">0</span>
            </button>` : ''}
            <span class="pulse-live">● LIVE</span>
          </div>
        </div>
        
        ${isLoggedIn ? `
        <div class="transmission-box">
          <textarea id="transmissionInput" placeholder="Share your thoughts, progress, or questions..." maxlength="${MAX_CHARS}"></textarea>
          <div class="transmission-actions">
            <span id="charCounter" class="char-counter">${MAX_CHARS}</span>
            <button id="btnBroadcast" class="tactical-btn solid" disabled>POST</button>
          </div>
        </div>
        ` : `
        <div class="feed-login-prompt">
          <span>🔒</span> Log in to share your progress with the community
        </div>
        `}

        <div id="feedStream" class="feed-stream">
          <div class="feed-skeleton">
            <div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-lines"><div class="skeleton-line w60"></div><div class="skeleton-line w100"></div><div class="skeleton-line w80"></div></div></div>
            <div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-lines"><div class="skeleton-line w40"></div><div class="skeleton-line w100"></div><div class="skeleton-line w60"></div></div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (isLoggedIn) {
    const btnBroadcast = document.getElementById('btnBroadcast') as HTMLButtonElement;
    const inputEl = document.getElementById('transmissionInput') as HTMLTextAreaElement;
    const charCounter = document.getElementById('charCounter') as HTMLSpanElement;

    let mentionTimer: ReturnType<typeof setTimeout> | null = null;

    inputEl.addEventListener('input', () => {
      const remaining = MAX_CHARS - inputEl.value.length;
      charCounter.textContent = String(remaining);
      charCounter.className = 'char-counter' + (remaining <= 20 ? ' warn' : '') + (remaining <= 0 ? ' danger' : '');
      btnBroadcast.disabled = inputEl.value.trim().length === 0 || remaining < 0;

      // @mention autocomplete detection
      const cursorPos = inputEl.selectionStart || 0;
      const textBefore = inputEl.value.substring(0, cursorPos);
      const mentionMatch = textBefore.match(/@(\w*)$/);
      
      if (mentionMatch && mentionMatch[1].length >= 1) {
        const query = mentionMatch[1];
        if (mentionTimer) clearTimeout(mentionTimer);
        mentionTimer = setTimeout(async () => {
          const users = await searchMentionUsers(query);
          showMentionDropdown(inputEl, users, mentionMatch.index!);
        }, 300);
      } else {
        hideMentionDropdown();
      }
    });

    btnBroadcast.onclick = async () => {
      const content = inputEl.value.trim();
      if (!content || content.length > MAX_CHARS) return;
      
      btnBroadcast.disabled = true;
      btnBroadcast.textContent = 'POSTING...';
      
      try {
        await postTransmission(content);
        inputEl.value = '';
        charCounter.textContent = String(MAX_CHARS);
        charCounter.className = 'char-counter';
        await refreshFeedStream();
      } catch {
        showFeedToast('Failed to post. Please try again.', 'error');
      } finally {
        btnBroadcast.disabled = false;
        btnBroadcast.textContent = 'POST';
      }
    };
  }

  await refreshFeedStream();

  if (feedPollTimer) clearInterval(feedPollTimer);
  feedPollTimer = setInterval(() => {
    const feedPane = document.getElementById('feedPane');
    if (feedPane && feedPane.classList.contains('active')) {
      refreshFeedStream();
      if (isLoggedIn) updateNotifBadge();
    } else {
      if (feedPollTimer) clearInterval(feedPollTimer);
      feedPollTimer = null;
    }
  }, 30000);

  // Notification bell
  if (isLoggedIn) {
    updateNotifBadge();
    const bell = document.getElementById('notifBell');
    if (bell) {
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotifDropdown();
      });
    }
  }
}

async function updateNotifBadge() {
  const count = await getUnreadNotifCount();
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

async function toggleNotifDropdown() {
  const existing = document.getElementById('notifDropdown');
  if (existing) { existing.remove(); return; }

  // Close on outside click
  const closeHandler = (e: MouseEvent) => {
    const dd = document.getElementById('notifDropdown');
    if (dd && !dd.contains(e.target as Node)) {
      dd.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 10);

  const bell = document.getElementById('notifBell');
  if (!bell) return;

  const dropdown = document.createElement('div');
  dropdown.id = 'notifDropdown';
  dropdown.className = 'notif-dropdown';
  dropdown.innerHTML = '<div class="notif-loading">Loading...</div>';
  bell.parentElement!.appendChild(dropdown);

  // Mark as read + fetch
  await markNotifsRead();
  updateNotifBadge();

  const notifs = await getNotifications();
  if (notifs.length === 0) {
    dropdown.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }

  dropdown.innerHTML = notifs.map((n: any) => {
    const typeLabel = n.type === 'POST_MENTION' ? 'mentioned you in a post' : 'mentioned you in a reply';
    const time = getRelativeTime(new Date(n.created_at));
    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}">
        <div class="notif-avatar">${n.from_avatar}</div>
        <div class="notif-body">
          <span class="notif-from">${escapeHtml(n.from_name)}</span>
          <span class="notif-type">${typeLabel}</span>
          <div class="notif-preview">${escapeHtml(n.preview)}</div>
          <span class="notif-time">${time}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function refreshFeedStream() {
  const streamEl = document.getElementById('feedStream');
  if (!streamEl) return;

  try {
    const transmissions = await fetchFeed();
    
    if (transmissions.length === 0) {
      streamEl.innerHTML = `<div class="feed-empty">
        <div class="feed-empty-icon">📡</div>
        <div class="feed-empty-title">No posts yet</div>
        <div class="feed-empty-text">Be the first to share something with the world!</div>
      </div>`;
      return;
    }

    streamEl.innerHTML = transmissions.map(t => renderTransmission(t)).join('');
    bindFeedEvents();
  } catch {
    streamEl.innerHTML = `<div class="feed-empty">
      <div class="feed-empty-icon">⚠️</div>
      <div class="feed-empty-title">Couldn't load posts</div>
      <div class="feed-empty-text">Check your connection and try again.</div>
    </div>`;
  }
}

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    'IRON': '#94a3b8', 'BRONZE': '#cd7f32', 'SILVER': '#c0c0c0',
    'GOLD': '#fbbf24', 'PLATINUM': '#22d3ee', 'DIAMOND': '#a78bfa',
    'MASTER': '#f43f5e', 'LEGEND': '#ff6b35'
  };
  return colors[rank] || '#94a3b8';
}

function renderTransmission(t: Transmission): string {
  const timeDisplay = getRelativeTime(new Date(t.created_at));
  const rankColor = getRankColor(t.rank);
  const mineLabel = t.is_mine ? `<span class="you-badge">You</span>` : '';
  
  return `
    <div class="transmission-card ${t.is_mine ? 'is-mine' : ''}" data-id="${t.id}" style="--rank-accent: ${rankColor};">
      <div class="trans-avatar-wrapper profile-link" data-user-id="${t.user_id}" data-user-name="${escapeHtml(t.display_name || 'User')}" data-user-handle="${escapeHtml(t.handle)}" data-user-avatar="${t.avatar}" data-user-rank="${t.rank}">
        <div class="trans-avatar" style="border-color: ${rankColor};">${t.avatar}</div>
      </div>
      <div class="trans-content">
        <div class="trans-header">
          <span class="trans-name profile-link" style="color: ${rankColor}; cursor:pointer;" data-user-id="${t.user_id}" data-user-name="${escapeHtml(t.display_name || 'User')}" data-user-handle="${escapeHtml(t.handle)}" data-user-avatar="${t.avatar}" data-user-rank="${t.rank}">${escapeHtml(t.display_name || 'User')}</span>
          ${mineLabel}
          <span class="trans-handle">${escapeHtml(t.handle)}</span>
          <span class="trans-time">· ${timeDisplay}</span>
        </div>
        <div class="trans-body">${highlightMentions(escapeHtml(t.content))}</div>
        <div class="trans-actions">
          <button class="action-btn reply-btn" data-action="reply" data-id="${t.id}">
            <svg viewBox="0 0 24 24"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"></path></svg>
            <span class="count">${t.replies_count || 0}</span>
          </button>
          <button class="action-btn repost-btn ${t.is_reposted_by_me ? 'active' : ''}" data-action="repost" data-id="${t.id}">
            <svg viewBox="0 0 24 24"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></svg>
            <span class="count">${t.reposts_count}</span>
          </button>
          <button class="action-btn like-btn ${t.is_liked_by_me ? 'active' : ''}" data-action="like" data-id="${t.id}">
            <svg viewBox="0 0 24 24"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></svg>
            <span class="count">${t.likes_count}</span>
          </button>
          <button class="action-btn view-btn">
            <svg viewBox="0 0 24 24"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></svg>
            <span class="count">${t.views_count}</span>
          </button>
          ${t.is_mine ? `
          <button class="action-btn delete-btn" data-action="delete" data-id="${t.id}" title="Delete post">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
          </button>` : ''}
        </div>
        <div class="comments-section" id="comments-${t.id}" style="display:none;">
          <div class="comments-list" id="comments-list-${t.id}"></div>
          ${isLoggedIn ? `
          <div class="comment-input-row">
            <input type="text" class="comment-input" id="comment-input-${t.id}" placeholder="Write a reply..." maxlength="280" />
            <button class="comment-send-btn" data-post-id="${t.id}">Reply</button>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function bindFeedEvents() {
  // Like
  document.querySelectorAll('.like-btn').forEach(btn => {
    (btn as HTMLElement).onclick = async (e) => {
      if (!isLoggedIn) { showFeedToast('Log in to like posts', 'error'); return; }
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) { await toggleLike(id); refreshFeedStream(); }
    };
  });

  // Repost
  document.querySelectorAll('.repost-btn').forEach(btn => {
    (btn as HTMLElement).onclick = async (e) => {
      if (!isLoggedIn) { showFeedToast('Log in to repost', 'error'); return; }
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) { await toggleRepost(id); refreshFeedStream(); }
    };
  });

  // Delete
  document.querySelectorAll('.delete-btn').forEach(btn => {
    (btn as HTMLElement).onclick = async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (!id) return;
      if (!confirm('Delete this post? This cannot be undone.')) return;

      const card = (e.currentTarget as HTMLElement).closest('.transmission-card') as HTMLElement;
      if (card) {
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'translateX(-10px)';
        setTimeout(() => card.remove(), 300);
      }
      const success = await deletePost(id);
      if (!success) showFeedToast('Failed to delete post.', 'error');
    };
  });

  // Reply / Comment toggle
  document.querySelectorAll('.reply-btn').forEach(btn => {
    (btn as HTMLElement).onclick = async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (!id) return;

      const section = document.getElementById(`comments-${id}`);
      if (!section) return;

      if (section.style.display === 'none') {
        section.style.display = 'block';
        // Load comments
        const listEl = document.getElementById(`comments-list-${id}`);
        if (listEl) {
          listEl.innerHTML = '<div class="comment-loading">Loading replies...</div>';
          const comments = await fetchComments(id);
          if (comments.length === 0) {
            listEl.innerHTML = '<div class="comment-empty">No replies yet. Be the first!</div>';
          } else {
            listEl.innerHTML = comments.map((c: any) => `
              <div class="comment-item">
                <div class="comment-avatar">${c.avatar}</div>
                <div class="comment-body">
                  <span class="comment-author" style="color: ${getRankColor(c.rank)};">${escapeHtml(c.display_name)}</span>
                  <span class="comment-handle">${escapeHtml(c.handle)}</span>
                  <span class="comment-time">· ${getRelativeTime(new Date(c.created_at))}</span>
                  <div class="comment-text">${escapeHtml(c.content)}</div>
                </div>
              </div>
            `).join('');
          }
        }
      } else {
        section.style.display = 'none';
      }
    };
  });

  // Send comment
  document.querySelectorAll('.comment-send-btn').forEach(btn => {
    (btn as HTMLElement).onclick = async (e) => {
      const postId = (e.currentTarget as HTMLElement).dataset.postId;
      if (!postId) return;

      const input = document.getElementById(`comment-input-${postId}`) as HTMLInputElement;
      const content = input?.value?.trim();
      if (!content) return;

      (e.currentTarget as HTMLButtonElement).disabled = true;
      const success = await postComment(postId, content);
      
      if (success) {
        input.value = '';
        // Reload comments
        const listEl = document.getElementById(`comments-list-${postId}`);
        if (listEl) {
          const comments = await fetchComments(postId);
          listEl.innerHTML = comments.map((c: any) => `
            <div class="comment-item">
              <div class="comment-avatar">${c.avatar}</div>
              <div class="comment-body">
                <span class="comment-author" style="color: ${getRankColor(c.rank)};">${escapeHtml(c.display_name)}</span>
                <span class="comment-handle">${escapeHtml(c.handle)}</span>
                <span class="comment-time">· ${getRelativeTime(new Date(c.created_at))}</span>
                <div class="comment-text">${escapeHtml(c.content)}</div>
              </div>
            </div>
          `).join('');
        }
        // Update reply count on button
        const replyBtn = document.querySelector(`.reply-btn[data-id="${postId}"] .count`);
        if (replyBtn) {
          replyBtn.textContent = String(Number(replyBtn.textContent || '0') + 1);
        }
        showFeedToast('Reply posted!', 'success');
      } else {
        showFeedToast('Failed to post reply.', 'error');
      }
      (e.currentTarget as HTMLButtonElement).disabled = false;
    };
  });

  // Profile click — open user posts modal
  document.querySelectorAll('.profile-link').forEach(el => {
    (el as HTMLElement).onclick = (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const userId = target.dataset.userId;
      const userName = target.dataset.userName || 'User';
      const userHandle = target.dataset.userHandle || '@user';
      const userAvatar = target.dataset.userAvatar || '👤';
      const userRank = target.dataset.userRank || 'IRON';
      if (userId) openProfileModal(userId, userName, userHandle, userAvatar, userRank);
    };
  });
}

async function openProfileModal(userId: string, name: string, handle: string, avatar: string, rank: string) {
  // Remove existing modal
  document.getElementById('userProfileModal')?.remove();

  const rankColor = getRankColor(rank);
  const modal = document.createElement('div');
  modal.id = 'userProfileModal';
  modal.className = 'profile-modal-overlay';
  modal.innerHTML = `
    <div class="profile-modal">
      <div class="profile-modal-header">
        <button class="profile-modal-close" id="closeProfileModal">✕</button>
      </div>
      <div class="profile-modal-user">
        <div class="profile-modal-avatar" style="border-color: ${rankColor};">${avatar}</div>
        <div class="profile-modal-info">
          <div class="profile-modal-name" style="color: ${rankColor};">${name}</div>
          <div class="profile-modal-handle">${handle}</div>
          <div class="profile-modal-rank" style="color: ${rankColor};">▸ ${rank}</div>
        </div>
      </div>
      <div class="profile-modal-divider"></div>
      <div class="profile-modal-posts-label">Posts</div>
      <div class="profile-modal-posts" id="profileModalPosts">
        <div class="comment-loading">Loading posts...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));

  // Close via delegation on inner modal (handles overflow scroll issues)
  const innerModal = modal.querySelector('.profile-modal') as HTMLElement;
  if (innerModal) {
    innerModal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('profile-modal-close') || target.closest('.profile-modal-close')) {
        e.stopPropagation();
        closeProfileModal();
      }
    });
  }
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProfileModal();
  });
  // Close on Escape key
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeProfileModal(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  // Fetch user posts
  const posts = await fetchUserPosts(userId);
  const postsEl = document.getElementById('profileModalPosts');
  if (!postsEl) return;

  if (posts.length === 0) {
    postsEl.innerHTML = '<div class="comment-empty">No posts yet.</div>';
    return;
  }

  postsEl.innerHTML = posts.map(t => {
    const time = getRelativeTime(new Date(t.created_at));
    return `
      <div class="profile-post-item">
        <div class="profile-post-text">${escapeHtml(t.content)}</div>
        <div class="profile-post-meta">
          <span>❤️ ${t.likes_count}</span>
          <span>🔁 ${t.reposts_count}</span>
          <span>💬 ${t.replies_count || 0}</span>
          <span>👁 ${t.views_count}</span>
          <span class="profile-post-time">${time}</span>
        </div>
      </div>
    `;
  }).join('');
}

function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 200);
  }
}

function showFeedToast(message: string, type: 'success' | 'error' = 'success') {
  const existing = document.querySelector('.feed-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `feed-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getRelativeTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightMentions(text: string): string {
  return text.replace(/@(\w+)/g, '<span class="mention-highlight">@$1</span>');
}

function showMentionDropdown(inputEl: HTMLTextAreaElement, users: any[], matchIndex: number) {
  hideMentionDropdown();
  if (users.length === 0) return;

  const dropdown = document.createElement('div');
  dropdown.id = 'mentionDropdown';
  dropdown.className = 'mention-dropdown';

  dropdown.innerHTML = users.map((u: any) => `
    <div class="mention-option" data-username="${escapeHtml(u.username)}">
      <span class="mention-opt-avatar">${u.avatar}</span>
      <div class="mention-opt-info">
        <span class="mention-opt-name">${escapeHtml(u.full_name)}</span>
        <span class="mention-opt-handle">@${escapeHtml(u.username)}</span>
      </div>
    </div>
  `).join('');

  // Position relative to the compose box
  const box = inputEl.closest('.transmission-box');
  if (box) {
    (box as HTMLElement).style.position = 'relative';
    box.appendChild(dropdown);
  }

  // Click to insert
  dropdown.querySelectorAll('.mention-option').forEach(opt => {
    (opt as HTMLElement).onclick = () => {
      const username = (opt as HTMLElement).dataset.username!;
      const text = inputEl.value;
      const before = text.substring(0, matchIndex);
      const after = text.substring(inputEl.selectionStart || 0);
      inputEl.value = before + '@' + username + ' ' + after;
      inputEl.focus();
      const newPos = matchIndex + username.length + 2;
      inputEl.setSelectionRange(newPos, newPos);
      hideMentionDropdown();
      // Trigger input event to update char counter
      inputEl.dispatchEvent(new Event('input'));
    };
  });
}

function hideMentionDropdown() {
  document.getElementById('mentionDropdown')?.remove();
}
