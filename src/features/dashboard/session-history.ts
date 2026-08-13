
import { StudySession } from '@/types/profile.types';
import { fetchMySessionsCloud, deleteStudySessionCloud, updateStudySessionCloud } from '@/services/vault.service';
import { showToast, showLoading, hideLoading, animateValue } from '@/utils/dom.utils';
import { formatTime12h, formatDuration, formatMinutes } from '@/utils/date.utils';
import { isRowEditable } from '@/services/integrity';
import { adjustTrackerDataForSessionDelta, generateTable } from '@/features/tracker/tracker';
import { log } from '@/utils/logger.utils';
import { updateDashboard } from './dashboard';
import { refreshLeaderboard } from './leaderboard';

// --- Session History Helpers ---

function getSubjectColor(name: string): { bg: string; border: string; text: string } {
  const palette = [
    { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)', text: '#93c5fd' },
    { bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.35)', text: '#c4b5fd' },
    { bg: 'rgba(52,211,153,0.11)', border: 'rgba(52,211,153,0.35)', text: '#6ee7b7' },
    { bg: 'rgba(251,191,36,0.11)', border: 'rgba(251,191,36,0.35)', text: '#fcd34d' },
    { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', text: '#fca5a5' },
    { bg: 'rgba(34,211,238,0.11)', border: 'rgba(34,211,238,0.35)', text: '#67e8f9' },
    { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)', text: '#fdba74' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getRelativeDate(dateStr: string): { primary: string; day: string } {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  const day = dayNames[date.getDay()];
  const fmt = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  if (diff === 0) return { primary: 'Today', day: `${day} \u00b7 ${fmt}` };
  if (diff === 1) return { primary: 'Yesterday', day: `${day} \u00b7 ${fmt}` };
  if (diff < 7) return { primary: `${diff}d ago`, day: `${day} \u00b7 ${fmt}` };
  return { primary: fmt, day };
}

// --- Session History Popup ---

export async function renderSessionHistory(): Promise<void> {
  const container = document.getElementById('recentSessionsBody');
  const fromInput = document.getElementById('sh-from-date') as HTMLInputElement;
  const toInput = document.getElementById('sh-to-date') as HTMLInputElement;
  const migrationBanner = document.getElementById('historyMigrationBanner');

  if (!container) return;
  if (migrationBanner) migrationBanner.style.display = 'none';

  showLoading('Loading session history...');
  const cloudLogs = await fetchMySessionsCloud();
  hideLoading();

  const localSaved = localStorage.getItem('all_tracker_history');
  const localLogs: StudySession[] = localSaved ? JSON.parse(localSaved) : [];

  // ── DATE RANGE FILTER ────────────────────────────────────────
  const fromVal = fromInput?.value || '';   // YYYY-MM-DD
  const toVal = toInput?.value || '';   // YYYY-MM-DD

  let displayLogs = cloudLogs.filter((log: any) => {
    const d = log.log_date || (log.end_at || '').split('T')[0];
    if (!d) return false;
    if (fromVal && d < fromVal) return false;
    if (toVal && d > toVal) return false;
    return true;
  });

  const activeFilter = fromVal || toVal;
  const isOnline = !!localStorage.getItem('tracker_username');

  if (displayLogs.length === 0) {
    const hasRealLocal = !isOnline && localLogs.length > 0 && localLogs.some((l: any) => l.duration > 0 || l.note);
    const fmtDMYq = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
    const msg = activeFilter
      ? `No sessions found${fromVal ? ` from ${fmtDMYq(fromVal)}` : ''}${toVal ? ` to ${fmtDMYq(toVal)}` : ''}.`
      : hasRealLocal
        ? 'Sync your legacy data to see history here.'
        : 'No sessions recorded yet. Start a study timer!';
    container.innerHTML = `
      <div class="sh-empty">
        <div class="sh-empty-icon">📋</div>
        <div class="sh-empty-text">${msg}</div>
      </div>`;
    return;
  }

  // ── STATS BAR ────────────────────────────────────────────────
  const parseBreaks = (note: string) => {
    let count = 0;
    let mins = 0;
    let types: string[] = [];
    const match = note.match(/\[Breaks:\s*(.+?)\]/i);
    if (match) {
      const parts = match[1].split(',');
      parts.forEach(p => {
        const multMatch = p.match(/\/ (\d+)x/i);
        const mult = multMatch ? parseInt(multMatch[1]) : 1;
        count += mult;
        const minMatch = p.match(/\((\d+)M/i);
        if (minMatch) mins += parseInt(minMatch[1]) * (multMatch ? 1 : 1);

        const typeMatch = p.match(/^\s*([^\(]+)/);
        if (typeMatch) {
          let t = typeMatch[1].trim();
          if (mult > 1) t += ` (${mult}x)`;
          types.push(t);
        }
      });
    }
    return { count, mins, types };
  };

  const totalHours = displayLogs.reduce((s: number, l: any) => s + (l.duration || 0), 0);
  const totalBreakMins = displayLogs.reduce((s: number, l: any) => s + parseBreaks(l.note || '').mins, 0);

  const statsBar = document.getElementById('sh-stats-bar');

  const fmtDMY = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  if (statsBar) {
    const allDates = displayLogs
      .map((l: any) => l.log_date || (l.end_at || '').split('T')[0])
      .filter(Boolean).sort();
    const firstDate = allDates[0] ?? '';
    const lastDate = allDates[allDates.length - 1] ?? '';
    const rangeText = firstDate === lastDate
      ? fmtDMY(firstDate)
      : `${fmtDMY(firstDate)} → ${fmtDMY(lastDate)}`;
    const chartSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`;
    const clockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const coffeeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
    const calSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

    statsBar.innerHTML = `
      <div class="sh-stat-card">
        <div class="sh-stat-icon-wrapper">${chartSvg}</div>
        <div class="sh-stat-content">
          <span class="sh-stat-val" id="sh-stat-count">${displayLogs.length}</span>
          <span class="sh-stat-lbl">Sessions</span>
        </div>
      </div>
      <div class="sh-stat-card">
        <div class="sh-stat-icon-wrapper">${clockSvg}</div>
        <div class="sh-stat-content">
          <span class="sh-stat-val">${formatDuration(totalHours)}</span>
          <span class="sh-stat-lbl">Total Time</span>
        </div>
      </div>
      <div class="sh-stat-card" style="opacity: ${totalBreakMins > 0 ? '1' : '0.4'}">
        <div class="sh-stat-icon-wrapper">${coffeeSvg}</div>
        <div class="sh-stat-content">
          <span class="sh-stat-val" id="sh-stat-break">${totalBreakMins > 0 ? formatMinutes(totalBreakMins) : '0m'}</span>
          <span class="sh-stat-lbl">Total Break</span>
        </div>
      </div>
      <div class="sh-stat-card">
        <div class="sh-stat-icon-wrapper">${calSvg}</div>
        <div class="sh-stat-content">
          <span class="sh-stat-val sh-stat-range">${rangeText.replace(' → ', ' – ')}</span>
          <span class="sh-stat-lbl">Date Range</span>
        </div>
      </div>
    `;
    statsBar.style.display = 'flex';

    requestAnimationFrame(() => {
      animateValue(document.getElementById('sh-stat-count'), displayLogs.length, 600);
      if (totalBreakMins > 0) {
        animateValue(document.getElementById('sh-stat-break'), totalBreakMins, 800, '', 0, formatMinutes);
      }
    });
  }

  const dateMap = new Map<string, { total_hours: number, total_breaks: number, session_count: number, sessions: any[] }>();

  displayLogs.forEach((log: any) => {
    const d = log.log_date || (log.end_at || '').split('T')[0];
    if (!d || d === 'null') return;
    if (!dateMap.has(d)) dateMap.set(d, { total_hours: 0, total_breaks: 0, session_count: 0, sessions: [] });
    const dayData = dateMap.get(d)!;
    dayData.total_hours += (log.duration || 0);
    dayData.total_breaks += parseBreaks(log.note || '').mins;
    dayData.session_count++;
    dayData.sessions.push(log);
  });

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
  const rows: string[] = [];

  sortedDates.forEach((date, idx) => {
    const dayData = dateMap.get(date)!;
    const rel = getRelativeDate(date);
    
    // Sort sessions chronologically
    const sessions = dayData.sessions.sort((a: any, b: any) => {
      const tA = new Date(a.start_at || a.end_at || 0).getTime();
      const tB = new Date(b.start_at || b.end_at || 0).getTime();
      return tA - tB;
    });

    const calendarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sh-calendar-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    const chevronSvg = `<div class="sh-chevron-box"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sh-chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg></div>`;

    rows.push(`
      <div class="sh-date-row sh-row" data-date="${date}" style="animation-delay: ${idx * 0.05}s">
        <div class="sh-date-label">
          ${chevronSvg}
          <div class="sh-date-icon-box">${calendarSvg}</div>
          <div class="sh-date-stack">
            <span class="sh-date-primary">${rel.primary}</span>
            <span class="sh-date-secondary">${rel.day}</span>
          </div>
        </div>
        <div class="sh-date-sessions-label">
          ${dayData.session_count} session${dayData.session_count !== 1 ? 's' : ''}
          ${dayData.total_breaks > 0 ? `<div class="sh-break-label">${formatMinutes(dayData.total_breaks)} break</div>` : ''}
        </div>
        <div class="sh-total-hours" style="color: var(--sh-accent); font-weight: 500;">${formatDuration(dayData.total_hours)}</div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    `);

    sessions.forEach((log: any, idx: number) => {
      const subName = log.subject || 'General';
      const col = getSubjectColor(subName);
      const duration = log.duration || 0;
      const startTime = log.start_at ? formatTime12h(log.start_at) : '—';
      const endTime = log.end_at ? formatTime12h(log.end_at) : '—';
      let note = (log.note && log.note !== 'null' && log.note.trim()) ? log.note : '';
      const breakInfo = parseBreaks(note);
      
      const cleanNote = note.replace(/\[Breaks:\s*.+?\]/gi, '').trim();
      const safeNote = note.replace(/"/g, '&quot;');
      let noteDisplay = cleanNote ? cleanNote : '<span style="opacity:0.28;">—</span>';
      
      let breakTags = '';
      if (breakInfo.types.length > 0) {
        breakTags = `<div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px;">`;
        breakInfo.types.forEach(t => {
          breakTags += `<span style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; color: #94a3b8;">${t}</span>`;
        });
        breakTags += `</div>`;
      }
      
      // We still keep the badge for the Time column
      const breakBadge = breakInfo.count > 0
        ? `<span class="sh-break-badge" style="color: var(--sh-accent); margin-left: 8px; font-size: 0.7rem;">${breakInfo.count} BREAK${breakInfo.count > 1 ? 'S' : ''} ${breakInfo.mins > 0 ? `(${formatMinutes(breakInfo.mins)})` : ''}</span>`
        : '';
        
      const lockedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

      rows.push(`
        <div class="sh-session-row sh-row sh-child sh-child-${date}" data-session-id="${log.id}" data-session-duration="${duration}" data-session-subject="${subName}" data-session-note="${safeNote}" data-date="${log.log_date}">
          <div class="sh-session-num">
            <div class="sh-dot" style="background:${col.text}; box-shadow: 0 0 8px ${col.text}88;"></div>
            <span style="opacity: 0.7;">Session ${idx + 1}</span> ${breakBadge}
          </div>
          <div class="sh-time">${startTime}<span class="sh-time-sep">–</span>${endTime}</div>
          <div class="sh-duration" style="color: var(--sh-accent); font-weight: 500;">${formatDuration(duration)}</div>
          <div class="sh-category" style="color: var(--text-muted);">${subName}</div>
          <div class="sh-note${cleanNote ? '' : ' empty'}" title="${safeNote}">
            ${noteDisplay}
            ${breakTags}
          </div>
          <div class="sh-actions">
            ${isRowEditable(log.log_date) ? `
              <button class="sh-btn-edit" title="Edit session" data-id="${log.id}" data-duration="${duration}" data-subject="${subName}" data-note="${safeNote}">✎</button>
              <button class="sh-btn-delete" title="Delete session" data-id="${log.id}">🗑</button>
            ` : `<span style="opacity:0.6; font-size: 0.7rem; display:flex; align-items:center;">${lockedSvg} Locked</span>`}
          </div>
        </div>
      `);
    });
  });

  container.innerHTML = rows.join('');

  // ── BIND CLICK LISTENERS ─────────────────────────────────────
  document.querySelectorAll<HTMLElement>('.sh-date-row').forEach(row => {
    row.addEventListener('click', () => {
      const date = row.dataset.date!;
      const isOpen = row.classList.toggle('open');
      document.querySelectorAll<HTMLElement>(`.sh-child-${date}`).forEach(child => {
        child.classList.toggle('expanded', isOpen);
      });
    });
  });

  // ── DELETE HANDLER ────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.sh-btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id!;
      if (!id) return;
      const confirmed = window.confirm('Delete this session? This cannot be undone.');
      if (!confirmed) return;
      try {
        const date = btn.closest('.sh-session-row')?.getAttribute('data-date') || '';
        const duration = parseFloat(btn.dataset.duration || '0');
        const subject = btn.dataset.subject || '';

        await deleteStudySessionCloud(id);
        if (date && subject) {
          await adjustTrackerDataForSessionDelta(date, subject, -duration);
        }
        showToast('Session deleted ✓');
        await renderSessionHistory();
        updateDashboard();
        generateTable();
        refreshLeaderboard();
      } catch (err) {
        showToast('Failed to delete session.');
        log.error('Delete session failed', err);
      }
    });
  });

  // ── EDIT HANDLER ──────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.sh-btn-edit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id!;
      const oldDuration = parseFloat(btn.dataset.duration || '0');
      const oldSubject = btn.dataset.subject || '';
      const oldNote = btn.dataset.note || '';

      const modalId = 'sh-edit-modal';
      let modal = document.getElementById(modalId);
      if (modal) modal.remove();

      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:rgba(0,0,0,0.7)', 'backdrop-filter:blur(6px)',
      ].join(';');

      const oldHrs = Math.floor(oldDuration);
      const oldMins = Math.round((oldDuration - oldHrs) * 60);

      modal.innerHTML = `
        <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:24px 32px; min-width:380px; max-width:520px; width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          
          <h3 style="margin:0 0 20px; font-size:1.1rem; color:#f8fafc; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#94a3b8;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            EDIT SESSION
          </h3>

          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <div style="flex:1;">
              <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; font-weight:500;">HOURS</label>
              <div style="position:relative;">
                <input id="sh-edit-hours" type="number" min="0" step="1" value="${oldHrs}" style="width:100%; padding:10px 14px 10px 42px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#f8fafc; font-size:0.95rem; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#64748b; font-size:0.8rem; pointer-events:none;">HR</span>
              </div>
            </div>
            <div style="flex:1;">
              <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; font-weight:500;">MINUTES</label>
              <div style="position:relative;">
                <input id="sh-edit-mins" type="number" min="0" max="59" step="1" value="${oldMins}" style="width:100%; padding:10px 14px 10px 44px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#f8fafc; font-size:0.95rem; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#64748b; font-size:0.8rem; pointer-events:none;">MIN</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; font-weight:500;">SUBJECT</label>
            <input id="sh-edit-subject" type="text" value="${oldSubject}" style="width:100%; padding:10px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#f8fafc; font-size:0.95rem; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
          </div>

          <div style="margin-bottom:24px;">
            <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; font-weight:500;">NOTE</label>
            <textarea id="sh-edit-note" rows="3" style="width:100%; padding:10px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#f8fafc; font-size:0.95rem; box-sizing:border-box; resize:vertical; transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">${oldNote.replace(/&quot;/g, '"')}</textarea>
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="sh-edit-cancel" style="padding:8px 18px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#cbd5e1; cursor:pointer; font-size:0.9rem; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">Cancel</button>
            <button id="sh-edit-save" style="padding:8px 20px; border-radius:6px; border:none; background:#2563eb; color:#fff; cursor:pointer; font-size:0.9rem; font-weight:500; transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Save Changes</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('sh-edit-cancel')!.onclick = () => modal!.remove();
      modal.addEventListener('click', (ev) => { if (ev.target === modal) modal!.remove(); });

      document.getElementById('sh-edit-save')!.onclick = async () => {
        const h = parseFloat((document.getElementById('sh-edit-hours') as HTMLInputElement).value) || 0;
        const m = parseFloat((document.getElementById('sh-edit-mins') as HTMLInputElement).value) || 0;
        const newDuration = h + (m / 60);
        
        const newSubject = (document.getElementById('sh-edit-subject') as HTMLInputElement).value.trim() || oldSubject;
        const newNote = (document.getElementById('sh-edit-note') as HTMLTextAreaElement).value.trim();
        try {
          const date = btn.closest('.sh-session-row')?.getAttribute('data-date') || '';
          await updateStudySessionCloud(id, { duration: newDuration, subject: newSubject, note: newNote });
          if (date) {
            await adjustTrackerDataForSessionDelta(date, oldSubject, -oldDuration);
            await adjustTrackerDataForSessionDelta(date, newSubject, newDuration);
          }
          modal!.remove();
          showToast('Session updated ✓');
          await renderSessionHistory();
          updateDashboard();
          generateTable();
          refreshLeaderboard();
        } catch (err) {
          showToast('Failed to update session.');
          log.error('Update session failed', err);
        }
      };
    });
  });
}
