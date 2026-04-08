/**
 * The Data Import modal.
 */
export const importModal = `
  <div class="modal" id="importModal">
    <div class="modal-content wide">
      <div class="modal-header">
        <h2>Import Data</h2>
        <button id="closeImportModal" class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <h3>Import JSON</h3>
        <textarea id="importJsonData" class="input" rows="6" placeholder="Paste tracker JSON array"></textarea>
        <button id="importJsonBtn" class="btn btn-primary">
          Import JSON
        </button>
        <h3>Import CSV</h3>
        <input id="importCsvFile" type="file" accept=".csv" />
        <button id="importCsvBtn" class="btn">Import CSV</button>
      </div>
    </div>
  </div>
`;
