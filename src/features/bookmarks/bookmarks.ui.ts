/**
 * HTML templates for the Bookmarks page.
 */
export const bookmarksView = `
  <article class="card">
    <div class="row-between">
      <h2>Bookmarks Vault</h2>
      <button id="addBookmarkBtn" class="btn btn-primary">
        Add Bookmark
      </button>
    </div>
    <div id="bookmarkFilters" class="bookmark-filters"></div>
    <div id="bookmarkList"></div>
  </article>
`;
