import './roadmap.css';
import * as XLSX from 'xlsx';
import { appState } from '@/state/app-state';
import { saveRoadmapToStorage } from '@/services/data-bridge';
import { log } from '@/utils/logger.utils';

let overlay: HTMLElement | null = null;
let roadmapSearchQuery = '';
let roadmapStatusFilter = 'All';
let roadmapCurrentPage = 1;
const roadmapItemsPerPage = 10;
let activeNoteRow: any = null;
let activeNoteCol: string | null = null;
let activeLeetcodeRow: any = null;
let activeLeetcodeCol: string | null = null;

const SVGS = {
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  upload: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  excel: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h2"></path><path d="M8 17h2"></path><path d="M14 13h2"></path><path d="M14 17h2"></path></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  checkCircle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
  cube: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon><line x1="12" y1="22" x2="12" y2="15.5"></line><polyline points="22 8.5 12 15.5 2 8.5"></polyline><polyline points="2 15.5 12 8.5 22 15.5"></polyline><line x1="12" y1="2" x2="12" y2="8.5"></line></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  chevronLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
  chevronRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`
};

export function initRoadmap() {
  injectRoadmapModal();
  setupEventListeners();
  renderRoadmap();
}

function injectRoadmapModal() {
  if (document.getElementById('roadmapOverlay')) return;

  const html = `
    <div id="roadmapOverlay" class="roadmap-overlay">
      <div class="roadmap-modal">
        <div class="roadmap-header">
          <div class="roadmap-header-left">
            <h2>Syllabus / Roadmap</h2>
            <div class="roadmap-header-badge">
              <div class="badge-dot"></div>
              <span id="headerProgressText">0% Completed</span>
              <span class="divider">•</span>
              <span id="headerProgressCount">0 / 0 tasks</span>
            </div>
          </div>
          <div class="roadmap-actions">
            <div class="roadmap-filter-box">
              <select id="roadmapStatusFilter" class="roadmap-filter-select">
                <option value="All">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Skipped">Skipped</option>
              </select>
            </div>
            <div class="roadmap-search-box">
              ${SVGS.search}
              <input type="text" id="roadmapSearchInput" placeholder="Search syllabus..." autocomplete="off" />
            </div>
            <button id="importRoadmapBtn" class="roadmap-btn">
              ${SVGS.upload} Import
            </button>
            <button id="clearRoadmapBtn" class="roadmap-btn">
              ${SVGS.trash} Clear
            </button>
            <button id="closeRoadmapBtn" class="roadmap-btn primary">
              ${SVGS.close} Close
            </button>
          </div>
        </div>
        <div class="roadmap-content">
          <div id="roadmapUploadArea" class="roadmap-upload-area">
            <input type="file" id="roadmapFileInput" accept=".xlsx, .xls, .csv" style="display: none;" />
            <div id="roadmapDropZone" class="roadmap-upload-box">
              ${SVGS.excel}
              <p>Click or drag an Excel file to import</p>
              <span>Supports .xlsx, .xls, .csv</span>
            </div>
          </div>
          <div class="roadmap-table-container">
            <table class="roadmap-table" id="roadmapTable">
              <thead id="roadmapThead"></thead>
              <tbody id="roadmapTbody"></tbody>
            </table>
          </div>
        </div>
        <div class="roadmap-footer" id="roadmapFooter">
          <div class="roadmap-stats">
            <div class="roadmap-stat-box">
              <div class="roadmap-stat-icon icon-bg-blue">${SVGS.calendar}</div>
              <div class="roadmap-stat-text">
                <span class="roadmap-stat-label">Total Days</span>
                <span class="roadmap-stat-value" id="statTotalDays">0</span>
              </div>
            </div>
            <div class="roadmap-stat-box">
              <div class="roadmap-stat-icon icon-bg-purple">${SVGS.checkCircle}</div>
              <div class="roadmap-stat-text">
                <span class="roadmap-stat-label">Completed</span>
                <span class="roadmap-stat-value" id="statCompleted">0 <span style="font-size: 0.7em; opacity: 0.7; font-weight: 500;">(0%)</span></span>
              </div>
            </div>
            <div class="roadmap-stat-box">
              <div class="roadmap-stat-icon icon-bg-purple-dark">${SVGS.clock}</div>
              <div class="roadmap-stat-text">
                <span class="roadmap-stat-label">Remaining</span>
                <span class="roadmap-stat-value" id="statRemaining">0 <span style="font-size: 0.7em; opacity: 0.7; font-weight: 500;">(0%)</span></span>
              </div>
            </div>
            <div class="roadmap-stat-box" style="flex: 1; padding-left: 0.5rem;">
              <div class="roadmap-stat-progress-container">
                <div class="roadmap-stat-progress-header">
                  <span class="roadmap-stat-label">Progress</span>
                  <span class="roadmap-stat-value" id="statProgressText" style="font-size: 0.85rem;">0%</span>
                </div>
                <div class="roadmap-stat-progress-track">
                  <div class="roadmap-stat-progress-fill" id="statProgressFill" style="width: 0%"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="roadmap-pagination" id="roadmapPagination">
            <!-- Pagination buttons -->
          </div>
        </div>
      </div>
    </div>
    <div id="roadmapNoteModal" class="roadmap-note-modal">
      <div class="roadmap-note-content">
        <div class="roadmap-note-header">
          <h3>${SVGS.file} Notes</h3>
          <button id="closeRoadmapNoteBtn" class="roadmap-note-close">${SVGS.close}</button>
        </div>
        <textarea id="roadmapNoteTextarea" placeholder="Write your notes here..."></textarea>
        <div class="roadmap-note-footer">
          <button id="saveRoadmapNoteBtn" class="roadmap-btn primary">Save</button>
        </div>
      </div>
    </div>
    <div id="roadmapLeetcodeModal" class="roadmap-note-modal">
      <div class="roadmap-note-content">
        <div class="roadmap-note-header">
          <h3>${SVGS.file} LeetCode Solved</h3>
          <button id="closeRoadmapLeetcodeBtn" class="roadmap-note-close">${SVGS.close}</button>
        </div>
        <textarea id="roadmapLeetcodeTextarea" placeholder="Enter LeetCode problems, links, or count..."></textarea>
        <div class="roadmap-note-footer">
          <button id="saveRoadmapLeetcodeBtn" class="roadmap-btn primary">Save</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  overlay = document.getElementById('roadmapOverlay');
}

export function openRoadmap() {
  renderRoadmap();
  if (overlay) overlay.classList.add('active');
}

export function closeRoadmap() {
  if (overlay) overlay.classList.remove('active');
}

function setupEventListeners() {
  document.getElementById('closeRoadmapBtn')?.addEventListener('click', closeRoadmap);
  
  const fileInput = document.getElementById('roadmapFileInput') as HTMLInputElement;
  const dropZone = document.getElementById('roadmapDropZone');
  const importBtn = document.getElementById('importRoadmapBtn');
  const clearBtn = document.getElementById('clearRoadmapBtn');

  // Note Modal Elements
  const noteModal = document.getElementById('roadmapNoteModal');
  const noteTextarea = document.getElementById('roadmapNoteTextarea') as HTMLTextAreaElement;
  const closeNoteBtn = document.getElementById('closeRoadmapNoteBtn');
  const saveNoteBtn = document.getElementById('saveRoadmapNoteBtn');

  const closeNoteModal = () => {
    if (noteModal) noteModal.classList.remove('active');
    activeNoteRow = null;
    activeNoteCol = null;
  };

  closeNoteBtn?.addEventListener('click', closeNoteModal);
  
  // Close note modal on background click
  noteModal?.addEventListener('click', (e) => {
    if (e.target === noteModal) closeNoteModal();
  });

  saveNoteBtn?.addEventListener('click', () => {
    if (activeNoteRow && activeNoteCol) {
      activeNoteRow.cells[activeNoteCol] = noteTextarea.value;
      saveRoadmapToStorage(appState.roadmap);
      renderRoadmap();
    }
    closeNoteModal();
  });

  // Leetcode Modal Elements
  const leetcodeModal = document.getElementById('roadmapLeetcodeModal');
  const leetcodeTextarea = document.getElementById('roadmapLeetcodeTextarea') as HTMLTextAreaElement;
  const closeLeetcodeBtn = document.getElementById('closeRoadmapLeetcodeBtn');
  const saveLeetcodeBtn = document.getElementById('saveRoadmapLeetcodeBtn');

  const closeLeetcodeModal = () => {
    if (leetcodeModal) leetcodeModal.classList.remove('active');
    activeLeetcodeRow = null;
    activeLeetcodeCol = null;
  };

  closeLeetcodeBtn?.addEventListener('click', closeLeetcodeModal);
  
  leetcodeModal?.addEventListener('click', (e) => {
    if (e.target === leetcodeModal) closeLeetcodeModal();
  });

  saveLeetcodeBtn?.addEventListener('click', () => {
    if (activeLeetcodeRow && activeLeetcodeCol) {
      activeLeetcodeRow.cells[activeLeetcodeCol] = leetcodeTextarea.value;
      saveRoadmapToStorage(appState.roadmap);
      renderRoadmap();
    }
    closeLeetcodeModal();
  });

  importBtn?.addEventListener('click', () => fileInput?.click());
  dropZone?.addEventListener('click', () => fileInput?.click());
  
  clearBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your entire roadmap?')) {
      appState.roadmap = { columns: [], rows: [] };
      saveRoadmapToStorage(appState.roadmap);
      renderRoadmap();
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleFileUpload(file);
    fileInput.value = ''; // Reset
  });

  const searchInput = document.getElementById('roadmapSearchInput') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    roadmapSearchQuery = (e.target as HTMLInputElement).value.toLowerCase();
    roadmapCurrentPage = 1; // Reset to page 1 on search
    renderRoadmap();
  });

  const statusFilter = document.getElementById('roadmapStatusFilter') as HTMLSelectElement;
  statusFilter?.addEventListener('change', (e) => {
    roadmapStatusFilter = (e.target as HTMLSelectElement).value;
    roadmapCurrentPage = 1;
    renderRoadmap();
  });

  // Drag and drop for upload
  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  });

  // Mouse drag-to-scroll and wheel scroll for table container
  const tableContainer = document.querySelector('.roadmap-table-container') as HTMLElement;
  if (tableContainer) {
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    tableContainer.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      // Don't drag if clicking on interactive elements
      if (target.closest('button') || target.closest('input') || target.closest('.roadmap-cell-select') || target.closest('.roadmap-col-resizer') || target.closest('.roadmap-checkbox') || target.closest('.custom-dropdown-item')) {
        return;
      }
      isDown = true;
      tableContainer.style.cursor = 'grabbing';
      startX = e.pageX - tableContainer.offsetLeft;
      scrollLeft = tableContainer.scrollLeft;
    });

    tableContainer.addEventListener('mouseleave', () => {
      isDown = false;
      tableContainer.style.cursor = '';
    });

    tableContainer.addEventListener('mouseup', () => {
      isDown = false;
      tableContainer.style.cursor = '';
    });

    tableContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - tableContainer.offsetLeft;
      const walk = (x - startX) * 1.5; // Scroll speed multiplier
      tableContainer.scrollLeft = scrollLeft - walk;
    });
    
    // Translate vertical wheel scroll to horizontal if no vertical overflow
    tableContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0 && !e.shiftKey) {
        // Only hijack if vertical scrollbar is not needed (i.e. table fits vertically)
        // or we want horizontal scrolling prioritized
        const isScrollableVertically = tableContainer.scrollHeight > tableContainer.clientHeight;
        if (!isScrollableVertically) {
          e.preventDefault();
          tableContainer.scrollLeft += e.deltaY;
        }
      }
    });
  }
}

async function handleFileUpload(file: File) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON array (first row is header)
    const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
    if (json.length < 2) {
      alert('The uploaded file seems to be empty or lacks a header row.');
      return;
    }

    const headers = json[0] as string[];
    const rows = json.slice(1);

    const roadmapRows = rows.map((row: any[]) => {
      const cells: Record<string, any> = {};
      headers.forEach((header, index) => {
        if (header) {
          cells[header] = row[index] !== undefined ? row[index] : '';
        }
      });
      return {
        id: crypto.randomUUID(),
        isCompleted: false,
        cells
      };
    }).filter(r => Object.keys(r.cells).length > 0);

    appState.roadmap = {
      columns: headers.filter(h => h),
      rows: roadmapRows
    };

    saveRoadmapToStorage(appState.roadmap);
    renderRoadmap();
  } catch (err) {
    log.error('Failed to parse Excel file', err);
    alert('Failed to parse the file. Please ensure it is a valid Excel or CSV file.');
  }
}

function renderRoadmap() {
  const uploadArea = document.getElementById('roadmapUploadArea');
  const thead = document.getElementById('roadmapThead');
  const tbody = document.getElementById('roadmapTbody');
  
  if (!thead || !tbody || !uploadArea) return;

  const { columns, rows } = appState.roadmap || { columns: [], rows: [] };

  if (columns.length === 0 || rows.length === 0) {
    uploadArea.classList.remove('hidden');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    return;
  }

  uploadArea.classList.add('hidden');

  const completedCount = rows.filter(r => r.isCompleted).length;
  const totalCount = rows.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remainingCount = totalCount - completedCount;
  const remainingPercent = totalCount > 0 ? 100 - progressPercent : 0;

  const statTotalDays = document.getElementById('statTotalDays');
  const statCompleted = document.getElementById('statCompleted');
  const statRemaining = document.getElementById('statRemaining');
  const statProgressText = document.getElementById('statProgressText');
  const statProgressFill = document.getElementById('statProgressFill');
  
  const headerProgressText = document.getElementById('headerProgressText');
  const headerProgressCount = document.getElementById('headerProgressCount');
  
  if (headerProgressText) headerProgressText.textContent = `${progressPercent}% Completed`;
  if (headerProgressCount) headerProgressCount.textContent = `${completedCount} / ${totalCount} tasks`;

  if (statTotalDays) statTotalDays.textContent = `${totalCount}`;
  if (statCompleted) statCompleted.innerHTML = `${completedCount} <span style="font-size: 0.7em; opacity: 0.7; font-weight: 500;">(${progressPercent}%)</span>`;
  if (statRemaining) statRemaining.innerHTML = `${remainingCount} <span style="font-size: 0.7em; opacity: 0.7; font-weight: 500;">(${remainingPercent}%)</span>`;
  if (statProgressText) statProgressText.textContent = `${progressPercent}%`;
  if (statProgressFill) statProgressFill.style.width = `${progressPercent}%`;

  // Search & Status Filtering
  const filteredRows = rows.filter(row => {
    // 1. Check Status
    let rowStatus = 'Not Started';
    columns.forEach(c => {
      const colUpper = c.toUpperCase().trim();
      if (colUpper.includes('STATUS') || colUpper.includes('PROGRESS')) {
        rowStatus = String(row.cells[c] || '').trim();
        if (!rowStatus) rowStatus = 'Not Started';
      }
    });

    if (roadmapStatusFilter !== 'All') {
      if (rowStatus.toLowerCase() !== roadmapStatusFilter.toLowerCase()) return false;
    }

    // 2. Check Search Query
    if (roadmapSearchQuery) {
      return Object.values(row.cells).some(val => 
        String(val).toLowerCase().includes(roadmapSearchQuery)
      );
    }
    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRows.length / roadmapItemsPerPage) || 1;
  if (roadmapCurrentPage > totalPages) roadmapCurrentPage = totalPages;
  if (roadmapCurrentPage < 1) roadmapCurrentPage = 1;

  const startIndex = (roadmapCurrentPage - 1) * roadmapItemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + roadmapItemsPerPage);

  renderPaginationControls(totalPages);

  // Render Headers
  let headerHtml = `<tr><th class="col-checkbox">${SVGS.check}</th>`;
  columns.forEach(col => {
    headerHtml += `<th>
      <div class="roadmap-th-content">
        <span>${col}</span>
        <div class="roadmap-col-resizer"></div>
      </div>
    </th>`;
  });
  headerHtml += '</tr>';
  thead.innerHTML = headerHtml;

  // Render Rows
  tbody.innerHTML = '';
  paginatedRows.forEach(row => {
    const tr = document.createElement('tr');
    if (row.isCompleted) tr.classList.add('completed');

    let statusVal = '';
    columns.forEach(c => {
      if (c.toUpperCase() === 'STATUS') {
        statusVal = (row.cells[c] || '').toString().trim().toLowerCase();
      }
    });

    if (statusVal === 'skipped') {
      tr.classList.add('skipped');
    } else if (statusVal === 'in progress') {
      tr.classList.add('in-progress');
    }

    // Checkbox cell
    const tdCheck = document.createElement('td');
    tdCheck.className = 'col-checkbox';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'roadmap-checkbox';
    checkbox.checked = row.isCompleted;
    checkbox.addEventListener('change', () => {
      row.isCompleted = checkbox.checked;
      saveRoadmapToStorage(appState.roadmap);
      renderRoadmap();
    });
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);
      // Data cells
    columns.forEach(col => {
      const td = document.createElement('td');
      const cellValueStr = row.cells[col] ? String(row.cells[col]).trim() : '';
      const colUpper = col.toUpperCase().trim();

      // Specific Column Renderers
      if (colUpper === 'DAY') {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cell-day';
        if (!row.isCompleted) {
          dayDiv.classList.add('active-day');
        }
        dayDiv.textContent = cellValueStr;
        td.appendChild(dayDiv);
      } 
      // 1. DATE / DEADLINE
      else if (colUpper.includes('DATE') || colUpper.includes('DEADLINE')) {
        const cleanDateStr = cellValueStr.replace(/\[.*?\]/g, '').trim();
        let parsedDate = new Date(cleanDateStr);
        let displayDateStr = cleanDateStr;

        if (/^\d{5}$/.test(cleanDateStr)) {
          const serial = parseInt(cleanDateStr, 10);
          parsedDate = new Date(Math.round((serial - 25569) * 86400 * 1000));
          if (!isNaN(parsedDate.getTime())) {
            displayDateStr = parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          }
        }
        
        let dateHtml = `<div class="date-icon-wrap">${SVGS.calendar}</div> <div class="date-text">`;
        if (!isNaN(parsedDate.getTime())) {
           const today = new Date();
           today.setHours(0, 0, 0, 0);
           
           // Ensure we only compare dates, ignoring any time component created during parsing
           const isToday = parsedDate.getDate() === today.getDate() && 
                           parsedDate.getMonth() === today.getMonth() && 
                           parsedDate.getFullYear() === today.getFullYear();
           
           const overdue = parsedDate.getTime() < today.getTime() && String(row.cells['Status'] || row.cells['STATUS']).toLowerCase() !== 'completed';
           if (overdue) td.classList.add('date-overdue');

           const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
           
           dateHtml += `<span class="date-main">${displayDateStr}</span>`;
           if (isToday) {
             dateHtml += `<span class="date-day-name today">Today</span>`;
           } else {
             dateHtml += `<span class="date-day-name">${dayName}</span>`;
           }
        } else {
           dateHtml += `<span class="date-main">${cellValueStr}</span>`;
        }
        dateHtml += `</div>`;
        td.innerHTML = `<div class="cell-date-complex">${dateHtml}</div>`;
      }
      else if (colUpper.includes('LECTURE') || colUpper.includes('MODULE') || colUpper.includes('EPISODE') || colUpper.includes('LESSON') || colUpper.includes('PART')) {
        if (cellValueStr) {
          const pill = document.createElement('div');
          pill.className = 'cell-lecture-pill';
          pill.textContent = cellValueStr;
          td.appendChild(pill);
        }
      }
      // 3. TOPIC
      else if (colUpper.includes('TOPIC') || colUpper.includes('TITLE') || colUpper.includes('SUBJECT') || colUpper.includes('TRACK') || colUpper.includes('COURSE') || colUpper.includes('PATH')) {
        const topicDiv = document.createElement('div');
        topicDiv.className = 'cell-topic';
        topicDiv.innerHTML = `<div class="topic-icon-bg">${SVGS.book}</div><div class="topic-text">${cellValueStr}</div>`;
        td.appendChild(topicDiv);
      }
      else if (colUpper.includes('PHASE') || colUpper.includes('SECTION') || colUpper.includes('CHAPTER')) {
        if (cellValueStr) {
          const pill = document.createElement('span');
          pill.className = 'cell-phase-pill';
          pill.innerHTML = `<div class="phase-icon-bg">${SVGS.cube}</div> <span>${cellValueStr}</span>`;
          td.appendChild(pill);
        }
      }
      else if (colUpper.includes('STATUS') || colUpper.includes('PROGRESS')) {
        const selectContainer = document.createElement('div');
        selectContainer.className = 'cell-status-container';
        
        const currentValue = cellValueStr || 'Not Started';
        const options = ['Not Started', 'In Progress', 'Completed', 'Skipped'];
        
        if (!options.some(opt => opt.toLowerCase() === currentValue.toLowerCase())) {
          options.push(currentValue);
        }

        const getStatusClass = (val: string) => `status-${val.toLowerCase().replace(/\s+/g, '-')}`;
        
        const triggerBtn = document.createElement('div');
        triggerBtn.className = `roadmap-cell-select ${getStatusClass(currentValue)}`;
        triggerBtn.innerHTML = `<span>${currentValue}</span> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        
        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';
        
        const closeMenu = () => { menu.classList.remove('active'); };
        
        options.forEach(opt => {
          const item = document.createElement('div');
          item.className = `custom-dropdown-item ${getStatusClass(opt)}`;
          item.textContent = opt;
          if (opt === currentValue) item.classList.add('selected');
          
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            row.cells[col] = opt;
            
            triggerBtn.className = `roadmap-cell-select ${getStatusClass(opt)}`;
            triggerBtn.querySelector('span')!.textContent = opt;
            
            Array.from(menu.children).forEach(c => c.classList.remove('selected'));
            item.classList.add('selected');
            
            if (opt === 'Completed' && !row.isCompleted) {
               row.isCompleted = true;
            } else if (opt !== 'Completed' && row.isCompleted) {
               row.isCompleted = false;
            }
            saveRoadmapToStorage(appState.roadmap);
            renderRoadmap();
            closeMenu();
          });
          menu.appendChild(item);
        });

        triggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.custom-dropdown-menu.active').forEach(m => {
            if (m !== menu) m.classList.remove('active');
          });
          menu.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
          if (!selectContainer.contains(e.target as Node)) {
            closeMenu();
          }
        });

        selectContainer.appendChild(triggerBtn);
        selectContainer.appendChild(dot);
        selectContainer.appendChild(menu);
        td.appendChild(selectContainer);
      }
      else if (colUpper.includes('LEETCODE') || colUpper.includes('LINK') || colUpper.includes('PRACTICE') || colUpper.includes('URL') || colUpper.includes('CODE')) {
        const btn = document.createElement('button');
        btn.className = 'roadmap-cell-input-leetcode';
        
        let displayValue = '-';
        let isLong = false;
        if (cellValueStr && cellValueStr !== '0' && cellValueStr !== '-') {
          if (cellValueStr.length > 5) {
             isLong = true;
          } else {
             displayValue = cellValueStr;
          }
          btn.classList.add('has-data');
        }
        
        btn.innerHTML = isLong ? SVGS.code : displayValue;
        
        btn.addEventListener('click', () => {
          activeLeetcodeRow = row;
          activeLeetcodeCol = col;
          const modal = document.getElementById('roadmapLeetcodeModal');
          const textarea = document.getElementById('roadmapLeetcodeTextarea') as HTMLTextAreaElement;
          if (modal && textarea) {
            textarea.value = cellValueStr === '-' ? '' : cellValueStr;
            modal.classList.add('active');
            textarea.focus();
          }
        });
        
        td.appendChild(btn);
      }
      else if (colUpper.includes('NOTE') || colUpper.includes('SUMMARY') || colUpper === 'NI') {
        const noteBtn = document.createElement('button');
        noteBtn.className = 'cell-note-btn';
        noteBtn.innerHTML = SVGS.file;
        noteBtn.title = cellValueStr ? 'View/Edit Notes' : 'Add Note';
        if (cellValueStr) noteBtn.classList.add('has-note');
        
        noteBtn.addEventListener('click', () => {
          activeNoteRow = row;
          activeNoteCol = col;
          const noteModal = document.getElementById('roadmapNoteModal');
          const noteTextarea = document.getElementById('roadmapNoteTextarea') as HTMLTextAreaElement;
          if (noteModal && noteTextarea) {
            noteTextarea.value = cellValueStr;
            noteModal.classList.add('active');
            noteTextarea.focus();
          }
        });
        td.appendChild(noteBtn);
      }
      else {
        // Fallback for unknown columns: editable div
        const div = document.createElement('div');
        div.className = 'roadmap-cell-editable';
        div.contentEditable = 'true';
        div.textContent = cellValueStr;
        div.addEventListener('blur', () => {
          row.cells[col] = div.innerText;
          saveRoadmapToStorage(appState.roadmap);
        });
        div.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              // allow newline
              return;
            }
            e.preventDefault();
            div.blur();
          }
        });
        td.appendChild(div);
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Setup Column Resizing
  const resizers = document.querySelectorAll('.roadmap-col-resizer');
  resizers.forEach(resizer => {
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation(); // prevent drag-to-scroll
      const th = (e.target as HTMLElement).closest('th');
      if (!th) return;
      
      const mouseEvent = e as MouseEvent;
      let startX = mouseEvent.pageX;
      let startWidth = th.offsetWidth;
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth + (moveEvent.pageX - startX);
        if (newWidth > 50) { // minimum width
          th.style.minWidth = `${newWidth}px`;
          th.style.width = `${newWidth}px`;
        }
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

function renderPaginationControls(totalPages: number) {
  const container = document.getElementById('roadmapPagination');
  if (!container) return;
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'roadmap-pagination-btn';
  prevBtn.innerHTML = SVGS.chevronLeft;
  prevBtn.disabled = roadmapCurrentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (roadmapCurrentPage > 1) {
      roadmapCurrentPage--;
      renderRoadmap();
    }
  });
  container.appendChild(prevBtn);

  // Simple pagination (show 1, 2, ..., last)
  let pages = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (roadmapCurrentPage <= 3) {
      pages = [1, 2, 3, 4, '...', totalPages];
    } else if (roadmapCurrentPage >= totalPages - 2) {
      pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', roadmapCurrentPage - 1, roadmapCurrentPage, roadmapCurrentPage + 1, '...', totalPages];
    }
  }

  pages.forEach(p => {
    if (p === '...') {
      const dots = document.createElement('span');
      dots.className = 'roadmap-pagination-dots';
      dots.textContent = '...';
      container.appendChild(dots);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.className = `roadmap-pagination-btn ${p === roadmapCurrentPage ? 'active' : ''}`;
      pageBtn.textContent = String(p);
      pageBtn.addEventListener('click', () => {
        roadmapCurrentPage = p as number;
        renderRoadmap();
      });
      container.appendChild(pageBtn);
    }
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'roadmap-pagination-btn';
  nextBtn.innerHTML = SVGS.chevronRight;
  nextBtn.disabled = roadmapCurrentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (roadmapCurrentPage < totalPages) {
      roadmapCurrentPage++;
      renderRoadmap();
    }
  });
  container.appendChild(nextBtn);
}
