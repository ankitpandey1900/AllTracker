import './roadmap.css';
import * as XLSX from 'xlsx';
import { appState } from '@/state/app-state';
import { saveRoadmapToStorage } from '@/services/data-bridge';
import { log } from '@/utils/logger.utils';

let overlay: HTMLElement | null = null;
let roadmapSearchQuery = '';

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
            <h2><i class="fas fa-map"></i> Syllabus / Roadmap</h2>
            <div id="roadmapProgressContainer" class="roadmap-progress-container"></div>
          </div>
          <div class="roadmap-actions">
            <div class="roadmap-search-box">
              <i class="fas fa-search"></i>
              <input type="text" id="roadmapSearchInput" placeholder="Search syllabus..." autocomplete="off" />
            </div>
            <button id="importRoadmapBtn" class="roadmap-btn">
              <i class="fas fa-file-import"></i> Import
            </button>
            <button id="clearRoadmapBtn" class="roadmap-btn">
              <i class="fas fa-trash"></i> Clear
            </button>
            <button id="closeRoadmapBtn" class="roadmap-btn primary">
              Close
            </button>
          </div>
        </div>
        <div class="roadmap-content">
          <div id="roadmapUploadArea" class="roadmap-upload-area">
            <input type="file" id="roadmapFileInput" accept=".xlsx, .xls, .csv" style="display: none;" />
            <div id="roadmapDropZone" class="roadmap-upload-box">
              <i class="fas fa-file-excel"></i>
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
    renderRoadmap();
  });

  // Drag and drop
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

  // Update Progress Stats
  const completedCount = rows.filter(r => r.isCompleted).length;
  const totalCount = rows.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const progressContainer = document.getElementById('roadmapProgressContainer');
  if (progressContainer) {
    progressContainer.innerHTML = `
      <div class="roadmap-progress-text">
        <span><i class="fas fa-bullseye"></i> ${progressPercent}% Completed</span>
        <span class="roadmap-progress-count">${completedCount} / ${totalCount} tasks</span>
      </div>
      <div class="roadmap-progress-bar-bg">
        <div class="roadmap-progress-bar-fill" style="width: ${progressPercent}%"></div>
      </div>
    `;
  }

  // Search Filtering
  const filteredRows = roadmapSearchQuery 
    ? rows.filter(row => {
        // Search across all cell values
        return Object.values(row.cells).some(val => 
          String(val).toLowerCase().includes(roadmapSearchQuery)
        );
      })
    : rows;

  // Render Headers
  let headerHtml = '<tr><th class="col-checkbox"><i class="fas fa-check"></i></th>';
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
  filteredRows.forEach(row => {
    const tr = document.createElement('tr');
    if (row.isCompleted) tr.classList.add('completed');

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

      // Date Highlighting Logic
      if (col.toUpperCase() === 'DATE' || col.toUpperCase() === 'DEADLINE') {
        if (cellValueStr && !row.isCompleted) {
          // Attempt to parse date (assuming format like "23-Aug-2026" or "2026-08-23")
          // Removing bracketed days if any like "23-Aug-2026 [Sun]"
          const cleanDateStr = cellValueStr.replace(/\[.*?\]/g, '').trim();
          const parsedDate = new Date(cleanDateStr);
          if (!isNaN(parsedDate.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Compare dates
            if (parsedDate < today) {
              td.classList.add('date-overdue');
            } else if (parsedDate.getTime() === today.getTime()) {
              td.classList.add('date-today');
            }
          }
        }
      }
      
      if (col.toUpperCase() === 'STATUS') {
        const select = document.createElement('select');
        const updateSelectStyle = (val: string) => {
          const statusClass = val.toLowerCase().replace(/\s+/g, '-');
          select.className = `roadmap-cell-select status-${statusClass}`;
        };
        
        const options = ['Not Started', 'In Progress', 'Completed', 'Skipped'];
        const currentValue = row.cells[col] ? String(row.cells[col]).trim() : 'Not Started';
        
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          if (currentValue.toLowerCase() === opt.toLowerCase()) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        // Add the current value if it's not in the default options
        if (!options.some(opt => opt.toLowerCase() === currentValue.toLowerCase())) {
          const customOption = document.createElement('option');
          customOption.value = currentValue;
          customOption.textContent = currentValue;
          customOption.selected = true;
          select.appendChild(customOption);
        }

        updateSelectStyle(select.value);

        select.addEventListener('change', () => {
          row.cells[col] = select.value;
          updateSelectStyle(select.value);
          saveRoadmapToStorage(appState.roadmap);
          
          // Optionally auto-check the row checkbox if marked 'Completed'
          if (select.value === 'Completed' && !row.isCompleted) {
            row.isCompleted = true;
            saveRoadmapToStorage(appState.roadmap);
            renderRoadmap(); // re-render to update the checkbox and strike-through
          }
        });
        
        td.appendChild(select);
      } else {
        const editableDiv = document.createElement('div');
        editableDiv.className = 'roadmap-cell-input';
        editableDiv.contentEditable = 'true';
        editableDiv.textContent = row.cells[col] !== undefined && row.cells[col] !== null 
          ? String(row.cells[col]) 
          : '';
        
        // Update state on blur (when user clicks away)
        editableDiv.addEventListener('blur', () => {
          row.cells[col] = editableDiv.textContent || '';
          saveRoadmapToStorage(appState.roadmap);
        });

        // Allow Shift+Enter for newlines, but regular Enter to blur
        editableDiv.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            editableDiv.blur();
          }
        });
        
        td.appendChild(editableDiv);
      }
      
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Setup mouse drag to scroll
  const container = document.querySelector('.roadmap-table-container') as HTMLElement;
  if (container && !container.dataset.dragAttached) {
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    container.addEventListener('mousedown', (e) => {
      // Don't drag if clicking inside an editable cell, checkbox, or select
      const target = e.target as HTMLElement;
      if (target.closest('.roadmap-cell-input') || target.tagName === 'SELECT' || target.tagName === 'INPUT') {
        return;
      }
      isDown = true;
      container.style.cursor = 'grabbing';
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });
    
    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.style.cursor = 'default';
    });
    
    container.addEventListener('mouseup', () => {
      isDown = false;
      container.style.cursor = 'default';
    });
    
    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2; // scroll fast
      container.scrollLeft = scrollLeft - walk;
    });
    
    container.dataset.dragAttached = 'true';
  }

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
