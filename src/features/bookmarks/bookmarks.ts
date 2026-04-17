/**
 * Handles the Bookmarks list.
 * 
 * It deals with adding, editing, and deleting bookmarks, 
 * plus grouping them by category.
 */

import { appState } from '@/state/app-state';
import { BOOKMARK_CATEGORIES } from '@/config/constants';
import { showToast } from '@/utils/dom.utils';
import { saveBookmarksToStorage } from '@/services/data-bridge';
import type { BookmarkCategory } from '@/types/bookmark.types';

// --- State ---

let activeCategory: string | 'All' = 'All';

// --- Rendering ---

function renderBookmarkFilters(): void {
  const container = document.getElementById('bookmarkFilters');
  if (!container) return;

  const categories = ['All', ...BOOKMARK_CATEGORIES];
  container.innerHTML = categories.map(cat => `
    <div class="filter-pill ${activeCategory === cat ? 'active' : ''}" data-category="${cat}">
      ${cat}
    </div>
  `).join('');

  container.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      activeCategory = (e.currentTarget as HTMLElement).dataset.category || 'All';
      renderBookmarks();
    });
  });
}

export function renderBookmarks(): void {
  const list = document.getElementById('bookmarkList');
  if (!list) return;

  renderBookmarkFilters();

  if (appState.bookmarks.length === 0) {
    list.innerHTML = `
      <div class="empty-state-modern">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <div class="empty-state-title">Vault is Empty</div>
        <div class="empty-state-text">No bookmarks saved yet. Secure your favorite study resources here.</div>
      </div>
    `;
    return;
  }

  const filteredBookmarks = activeCategory === 'All' 
    ? appState.bookmarks 
    : appState.bookmarks.filter(b => (b.category || 'Other') === activeCategory);

  if (filteredBookmarks.length === 0) {
    list.innerHTML = `
      <div class="empty-state-modern">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <div class="empty-state-title">No Matches in "${activeCategory}"</div>
        <div class="empty-state-text">Try switching categories or add a new bookmark to this sector.</div>
      </div>
    `;
    return;
  }

  // Define categories to render (either just the active one or all if 'All' is selected)
  const categoriesToRender = activeCategory === 'All' 
    ? BOOKMARK_CATEGORIES 
    : [activeCategory as any];

  let html = '';
  categoriesToRender.forEach((cat) => {
    const catBookmarks = filteredBookmarks.filter((b) => (b.category || 'Other') === cat);
    if (catBookmarks.length === 0) return;

    html += `
      <div class="bookmark-category-section active">
        <h3 class="bookmark-category-header">${cat}</h3>
        <div class="bookmark-grid">
          ${catBookmarks.map((item) => {
            const firstLetter = item.title.charAt(0).toUpperCase();
            return `
              <div class="bookmark-card" data-action="open" data-url="${item.url}">
                <div class="bookmark-info">
                  <div class="bookmark-icon">${firstLetter}</div>
                  <div class="bookmark-content">
                    <span class="bookmark-category-badge">${item.category || 'Other'}</span>
                    <span class="bookmark-title" title="${item.title}">${item.title}</span>
                  </div>
                </div>
                <div class="bookmark-actions">
                  <button class="btn-edit-bookmark" data-action="edit" data-id="${item.id}" title="Edit Bookmark">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button class="btn-delete-bookmark" data-action="delete" data-id="${item.id}" title="Delete Bookmark">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  list.innerHTML = html;

  // Attach listeners
  list.querySelectorAll('[data-action="open"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      if ((e.target as HTMLElement).closest('[data-action="edit"],[data-action="delete"]')) return;
      window.open(target.getAttribute('data-url') || '', '_blank');
    });
  });
  list.querySelectorAll('[data-action="edit"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      editBookmark((e.currentTarget as HTMLElement).getAttribute('data-id') || '');
    });
  });
  list.querySelectorAll('[data-action="delete"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark((e.currentTarget as HTMLElement).getAttribute('data-id') || '');
    });
  });
}

// --- Handling Actions ---

function editBookmark(id: string): void {
  const item = appState.bookmarks.find((b) => b.id === id);
  if (!item) return;

  const modal = document.getElementById('bookmarkModal');
  const modalTitle = modal?.querySelector('.modal-header h2');
  const titleInput = document.getElementById('bookmarkTitleInput') as HTMLInputElement;
  const urlInput = document.getElementById('bookmarkUrlInput') as HTMLInputElement;
  const catInput = document.getElementById('bookmarkCategoryInput') as HTMLSelectElement;
  const saveBtn = document.getElementById('saveBookmarkBtn');

  if (modal) modal.dataset.editId = String(id);
  if (modalTitle) modalTitle.textContent = 'Edit Bookmark';
  if (saveBtn) saveBtn.textContent = 'Update Bookmark';
  if (titleInput) titleInput.value = item.title;
  if (urlInput) urlInput.value = item.url;
  if (catInput) catInput.value = item.category || 'Other';

  modal?.classList.add('active');
}

function deleteBookmark(id: string): void {
  if (confirm('Delete this bookmark?')) {
    appState.bookmarks = appState.bookmarks.filter((b) => b.id !== id);
    saveBookmarksToStorage(appState.bookmarks);
    renderBookmarks();
    showToast('Bookmark removed');
  }
}

// --- Popup Modal Setup ---

export function setupBookmarkListeners(): void {
  const addBtn = document.getElementById('addBookmarkBtn');
  const modal = document.getElementById('bookmarkModal');
  const closeBtn = document.getElementById('closeBookmarkModal');
  const saveBtn = document.getElementById('saveBookmarkBtn');

  if (addBtn && modal) {
    addBtn.addEventListener('click', () => {
      const title = modal.querySelector('.modal-header h2');
      delete modal.dataset.editId;
      if (title) title.textContent = 'Add Bookmark';
      if (saveBtn) saveBtn.textContent = 'Save Bookmark';

      (document.getElementById('bookmarkTitleInput') as HTMLInputElement).value = '';
      (document.getElementById('bookmarkUrlInput') as HTMLInputElement).value = '';
      (document.getElementById('bookmarkCategoryInput') as HTMLSelectElement).value = 'Development';

      modal.classList.add('active');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      delete modal.dataset.editId;
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'bookmarkModal') {
        modal.classList.remove('active');
        delete modal.dataset.editId;
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const titleInput = document.getElementById('bookmarkTitleInput') as HTMLInputElement;
      const urlInput = document.getElementById('bookmarkUrlInput') as HTMLInputElement;
      const catInput = document.getElementById('bookmarkCategoryInput') as HTMLSelectElement;

      const title = titleInput.value.trim();
      const url = urlInput.value.trim();
      const category = catInput.value as BookmarkCategory;

      if (!title || !url) {
        showToast('Please provide both a title and a URL!', 'warning');
        return;
      }

      try { new URL(url); } catch {
        showToast('Please enter a valid URL (starting with http:// or https://)', 'error');
        return;
      }

      const editId = modal?.dataset.editId;
      if (editId) {
        const item = appState.bookmarks.find((b) => b.id === editId);
        if (item) { item.title = title; item.url = url; item.category = category; }
      } else {
        appState.bookmarks.push({ id: crypto.randomUUID(), title, url, category });
      }

      saveBookmarksToStorage(appState.bookmarks);
      renderBookmarks();
      showToast(editId ? 'Bookmark updated!' : 'Bookmark saved!', 'success');

      titleInput.value = '';
      urlInput.value = '';
      catInput.value = 'Development';
      modal?.classList.remove('active');
      delete modal?.dataset.editId;

      const modalTitle = modal?.querySelector('.modal-header h2');
      if (modalTitle) modalTitle.textContent = 'Add Bookmark';
      if (saveBtn) saveBtn.textContent = 'Save Bookmark';
    });
  }
}
