export const bookmarkModal = `
  <div class="modal" id="bookmarkModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Bookmark</h2>
        <button id="closeBookmarkModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <input id="bookmarkTitleInput" class="input" placeholder="Bookmark title" />
        <input id="bookmarkUrlInput" class="input" placeholder="https://..." />
        <select id="bookmarkCategoryInput" class="input">
          <option>Development</option>
          <option>Learning</option>
          <option>Work</option>
          <option>Social</option>
          <option>Personal</option>
          <option>Random</option>
          <option>Other</option>
        </select>
        <button id="saveBookmarkBtn" class="btn btn-primary">
          Save Bookmark
        </button>
      </div>
    </div>
  </div>
`;
