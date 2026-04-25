import { appState } from '@/state/app-state';
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
    const match = note.match(/\[Breaks:\s*(.+?)\]/i);
    if (match) {
      const parts = match[1].split(',');
      parts.forEach(p => {
        const multMatch = p.match(/\/ (\d+)x/i);
        const mult = multMatch ? parseInt(multMatch[1]) : 1;
        count += mult;
        const minMatch = p.match(/\((\d+)M/i);
        if (minMatch) mins += parseInt(minMatch[1]) * (multMatch ? 1 : 1);
      });
    }
    return { count, mins };
  };

  const totalHours = displayLogs.reduce((s: number, l: any) => s + (l.duration || 0), 0);
  const totalBreakMins = displayLogs.reduce((s: number, l: any) => s + parseBreaks(l.note || '').mins, 0);
  const maxDuration = Math.max(...displayLogs.map((l: any) => l.duration || 0), 0.001);
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
    statsBar.innerHTML = `
      <span class="sh-stat"><span class="sh-stat-val" id="sh-stat-count">${displayLogs.length}</span><span class="sh-stat-lbl">Sessions</span></span>
      <span class="sh-stat-div"></span>
      <span class="sh-stat"><span class="sh-stat-val">${formatDuration(totalHours)}</span><span class="sh-stat-lbl">Total Time</span></span>
      ${totalBreakMins > 0 ? `
        <span class="sh-stat-div"></span>
        <span class="sh-stat"><span class="sh-stat-val" id="sh-stat-break" style="color:#38bdf8">${formatMinutes(totalBreakMins)}</span><span class="sh-stat-lbl">Total Break</span></span>
      ` : ''}
      <span class="sh-stat-div"></span>
      <span class="sh-stat"><span class="sh-stat-val sh-stat-range">${rangeText}</span><span class="sh-stat-lbl">Date Range</span></span>
    `;
    statsBar.style.display = 'flex';

    requestAnimationFrame(() => {
      animateValue(document.getElementById('sh-stat-count'), displayLogs.length, 600);
      if (totalBreakMins > 0) {
        animateValue(document.getElementById('sh-stat-break'), totalBreakMins, 800, '', 0, formatMinutes);
      }
    });
  }

  const dateMap = new Map<string, { total_hours: number, total_breaks: number, session_count: number, subjects: Map<string, any[]> }>();

  displayLogs.forEach((log: any) => {
    const d = log.log_date || (log.end_at || '').split('T')[0];
    if (!d || d === 'null') return;
    if (!dateMap.has(d)) dateMap.set(d, { total_hours: 0, total_breaks: 0, session_count: 0, subjects: new Map() });
    const dayData = dateMap.get(d)!;
    dayData.total_hours += (log.duration || 0);
    dayData.total_breaks += parseBreaks(log.note || '').mins;
    dayData.session_count++;
    const sub = log.subject || 'General';
    if (!dayData.subjects.has(sub)) dayData.subjects.set(sub, []);
    dayData.subjects.get(sub)!.push(log);
  });

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
  const rows: string[] = [];

  sortedDates.forEach((date, idx) => {
    const dayData = dateMap.get(date)!;
    const rel = getRelativeDate(date);

    rows.push(`
      <div class="sh-date-row sh-row" data-date="${date}" style="animation-delay: ${idx * 0.05}s">
        <div class="sh-date-label">
          <span class="sh-chevron">▶</span>
          <div class="sh-date-stack">
            <span class="sh-date-primary">${rel.primary}</span>
            <span class="sh-date-secondary">${rel.day}</span>
          </div>
        </div>
        <div class="sh-date-sessions-label">
          ${dayData.session_count} session${dayData.session_count !== 1 ? 's' : ''}
          ${dayData.total_breaks > 0 ? `<span style="color:#38bdf8; margin-left:8px; opacity:0.8;">${formatMinutes(dayData.total_breaks)} break</span>` : ''}
        </div>
        <div class="sh-total-hours">${formatDuration(dayData.total_hours)}</div>
        <div></div>
        <div></div>
      </div>
    `);

    Array.from(dayData.subjects.keys()).forEach(subName => {
      const sessions = dayData.subjects.get(subName)!.sort((a: any, b: any) => {
        const tA = new Date(a.start_at || a.end_at || 0).getTime();
        const tB = new Date(b.start_at || b.end_at || 0).getTime();
        return tA - tB;
      });
      const subHours = sessions.reduce((s: number, l: any) => s + (l.duration || 0), 0);
      const col = getSubjectColor(subName);
      const subBreaks = sessions.reduce((s: number, l: any) => s + parseBreaks(l.note || '').mins, 0);
      
      rows.push(`
        <div class="sh-subject-row sh-row sh-child sh-child-${date}">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="sh-subject-badge" style="background:${col.bg}; border-color:${col.border}; color:${col.text};">${subName}</span>
            <span class="sh-subject-count">
              ${sessions.length} session${sessions.length > 1 ? 's' : ''}
              ${subBreaks > 0 ? `<span style="color:#38bdf8; margin-left:6px; opacity:0.7; font-size:0.6rem;">${formatMinutes(subBreaks)} break</span>` : ''}
            </span>
          </div>
          <div></div>
          <div class="sh-sub-hours" style="color:${col.text};">${formatDuration(subHours)}</div>
          <div></div>
          <div></div>
        </div>
      `);

      sessions.forEach((log: any, idx: number) => {
        const duration = log.duration || 0;
        const startTime = log.start_at ? formatTime12h(log.start_at) : '—';
        const endTime = log.end_at ? formatTime12h(log.end_at) : '—';
        let note = (log.note && log.note !== 'null' && log.note.trim()) ? log.note : '';
        const breakInfo = parseBreaks(note);
        const breakBadge = breakInfo.count > 0
          ? `<span class="sh-break-badge">${breakInfo.count} BREAK${breakInfo.count > 1 ? 'S' : ''} ${breakInfo.mins > 0 ? `(${formatMinutes(breakInfo.mins)})` : ''}</span>`
          : '';
        const sessionNum = idx + 1;
        const barW = maxDuration > 0 ? Math.max(6, Math.round((duration / maxDuration) * 100)) : 6;
        const cleanNote = note.replace(/\[Breaks:\s*.+?\]/gi, '').trim();
        const safeNote = note.replace(/"/g, '&quot;');
        const breakMatch = note.match(/\[Breaks:\s*(.+?)\]/i);
        const breakDetails = breakMatch ? breakMatch[1] : '';
        const noteDisplay = cleanNote 
          ? cleanNote 
          : (breakDetails ? `<span style="color:#38bdf8; font-size:0.7rem; opacity:0.85; font-style:italic;">Break: ${breakDetails}</span>` : '<span style="opacity:0.28;">—</span>');

        rows.push(`
          <div class="sh-session-row sh-row sh-child sh-child-${date}${idx % 2 === 1 ? ' alt' : ''}" data-session-id="${log.id}" data-session-duration="${duration}" data-session-subject="${subName}" data-session-note="${safeNote}" data-date="${log.log_date}">
            <div class="sh-session-num">Session ${sessionNum} ${breakBadge}</div>
            <div class="sh-time">
              ${startTime}<span class="sh-time-sep">–</span>${endTime}
            </div>
            <div class="sh-duration">
              <span class="sh-dur-val">${formatDuration(duration)}</span>
              <div class="sh-dur-bar" title="Session Intensity: ${barW}% of daily peak">
                <div class="sh-dur-fill" style="width:${barW}%; background:${col.text};"></div>
              </div>
            </div>
            <div class="sh-category" style="color:${col.text};">${subName}</div>
            <div class="sh-note${cleanNote ? '' : ' empty'}" title="${safeNote}">${noteDisplay}</div>
            <div class="sh-actions">
              ${isRowEditable(log.log_date) ? `
                <button class="sh-btn-edit" title="Edit session" data-id="${log.id}" data-duration="${duration}" data-subject="${subName}" data-note="${safeNote}">✎</button>
                <button class="sh-btn-delete" title="Delete session" data-id="${log.id}">🗑</button>
              ` : '<span style="opacity:0.2; font-size: 0.7rem; letter-spacing: 1px;">LOCKED</span>'}
            </div>
          </div>
        `);
      });
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

      modal.innerHTML = `
        <div style="background:#0f1729; border:1px solid rgba(99,102,241,0.3); border-radius:16px; padding:28px 32px; min-width:380px; max-width:520px; width:90%; box-shadow:0 24px 48px rgba(0,0,0,0.6);">
          <h3 style="margin:0 0 20px; font-size:1.1rem; color:#e2e8f0; letter-spacing:1px;">✎ EDIT SESSION</h3>
          <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; letter-spacing:0.5px;">DURATION (hours)</label>
          <input id="sh-edit-duration" type="number" min="0" step="0.01" value="${oldDuration}" style="width:100%; padding:10px 14px; background:#1e2a45; border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#e2e8f0; font-size:0.95rem; margin-bottom:16px; box-sizing:border-box;">
          <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; letter-spacing:0.5px;">SUBJECT</label>
          <input id="sh-edit-subject" type="text" value="${oldSubject}" style="width:100%; padding:10px 14px; background:#1e2a45; border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#e2e8f0; font-size:0.95rem; margin-bottom:16px; box-sizing:border-box;">
          <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; letter-spacing:0.5px;">NOTE</label>
          <textarea id="sh-edit-note" rows="3" style="width:100%; padding:10px 14px; background:#1e2a45; border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#e2e8f0; font-size:0.95rem; margin-bottom:24px; box-sizing:border-box; resize:vertical;">${oldNote.replace(/&quot;/g, '"')}</textarea>
          <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button id="sh-edit-cancel" style="padding:10px 20px; border-radius:8px; border:1px solid rgba(148,163,184,0.3); background:transparent; color:#94a3b8; cursor:pointer; font-size:0.9rem;">Cancel</button>
            <button id="sh-edit-save" style="padding:10px 24px; border-radius:8px; border:none; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; cursor:pointer; font-size:0.9rem; font-weight:600;">Save Changes</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('sh-edit-cancel')!.onclick = () => modal!.remove();
      modal.addEventListener('click', (ev) => { if (ev.target === modal) modal!.remove(); });

      document.getElementById('sh-edit-save')!.onclick = async () => {
        const newDuration = parseFloat((document.getElementById('sh-edit-duration') as HTMLInputElement).value) || 0;
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
