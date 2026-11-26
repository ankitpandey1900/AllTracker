/**
 * Landing page behaviour.
 * Design notes: docs/landing-design.md
 *
 * - The hero race: a sample "today" clock ticking toward yesterday's total.
 * - Ledger day labels, the sample year heatmap, Maamu's beast-mode switch.
 * - Live numbers from the public telemetry and leaderboard endpoints.
 */

const DAY_MS = 86_400_000;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

function clockText(total: number): string {
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function spanText(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function hoursText(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

const shortDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ── Header ──────────────────────────────────────────────────────────── */

function initHeader(): void {
  const top = document.querySelector<HTMLElement>('.top');
  const btn = $<HTMLButtonElement>('menuBtn');
  const menu = $('menu');

  if (top) {
    const onScroll = () => top.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', onScroll); // after the browser restores scroll
  }

  if (!btn || !menu) return;
  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => setOpen(menu.hidden));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      btn.focus();
    }
  });
}

/* ── Hero race ───────────────────────────────────────────────────────── */

function initRace(): void {
  const race = $('race');
  const clock = $('clock');
  const gap = $('raceGap');
  const toggle = $<HTMLButtonElement>('raceToggle');
  const status = $('raceStatus');
  if (!race || !clock || !gap || !toggle) return;

  const yesterday = 3 * 3600 + 41 * 60 + 7; // 3:41:07
  const scale = yesterday * 1.25; // yesterday's mark sits at 80% of the track
  let today = 3 * 3600 + 40 * 60 + 31; // 3:40:31, 36 seconds behind
  let running = true;

  const render = () => {
    clock.textContent = clockText(today);
    race.style.setProperty('--pct', `${Math.min(100, (today / scale) * 100)}%`);
    const diff = yesterday - today;
    if (diff > 0) {
      gap.textContent = `${spanText(diff)} behind yesterday`;
    } else if (diff === 0) {
      gap.textContent = 'level with yesterday';
    } else {
      gap.textContent = `${spanText(-diff)} ahead of yesterday`;
    }
    race.dataset.state = !running ? 'paused' : diff < 0 ? 'beaten' : 'running';
  };

  window.setInterval(() => {
    if (!running) return;
    today += 1;
    render();
  }, 1000);

  toggle.addEventListener('click', () => {
    running = !running;
    toggle.textContent = running ? 'Pause' : 'Resume';
    toggle.setAttribute('aria-pressed', String(!running));
    if (status) status.textContent = running ? 'Logging to DSA' : 'On a break';
    render();
  });

  render();
}

/* ── Ledger dates ────────────────────────────────────────────────────── */

function initLedgerDates(): void {
  const today = startOfDay(new Date());
  document.querySelectorAll<HTMLElement>('[data-day]').forEach((el) => {
    const n = Number(el.dataset.day);
    if (n < 2) return; // "Today" and "Yesterday" read better than dates
    el.textContent = shortDate(new Date(today.getTime() - n * DAY_MS));
  });
}

/* ── Sample year ─────────────────────────────────────────────────────── */

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function level(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 1.5) return 1;
  if (hours < 3) return 2;
  if (hours < 5) return 3;
  return 4;
}

function initYear(): void {
  const grid = $('yearGrid');
  const readout = $('yearReadout');
  const summary = $('yearSummary');
  if (!grid) return;

  const WEEKS = 52;
  const today = startOfDay(new Date());
  const thisSunday = new Date(today.getTime() - today.getDay() * DAY_MS);
  const start = new Date(thisSunday.getTime() - (WEEKS - 1) * 7 * DAY_MS);
  const rand = seeded(2047);

  let studied = 0;
  let total = 0;
  let run = 0;
  let best = 0;
  let restRun = 0;
  let prevStudied = false;

  // Month labels sit above the first week that starts in each month.
  const months = $('yearMonths');
  if (months) {
    for (let w = 0; w < WEEKS; w += 1) {
      const d = new Date(start.getTime() + w * 7 * DAY_MS);
      const label = document.createElement('span');
      // Label the first full week of each month so labels never collide.
      if (d.getDate() <= 7 && w < WEEKS - 2) {
        label.textContent = d.toLocaleDateString('en-US', { month: 'short' });
      }
      if (w < WEEKS / 2) label.className = 'is-old';
      months.appendChild(label);
    }
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < WEEKS * 7; i += 1) {
    const date = new Date(start.getTime() + i * DAY_MS);
    const cell = document.createElement('i');
    const week = Math.floor(i / 7);
    if (week < WEEKS / 2) cell.classList.add('is-old');
    // Fill order for the scroll reveal; phones only show the second half.
    cell.style.setProperty('--w', String(week));
    cell.style.setProperty('--wm', String(Math.max(0, week - WEEKS / 2)));

    if (date > today) {
      cell.className += ' is-future';
      frag.appendChild(cell);
      continue;
    }

    // Consistency builds over the year: early weeks are patchy, later ones
    // steady. Showing up yesterday makes showing up today more likely.
    const progress = i / (WEEKS * 7);
    const showUp = prevStudied ? 0.72 + progress * 0.26 : 0.3 + progress * 0.35;
    let hours = 0;
    if (restRun > 0) {
      restRun -= 1;
    } else if (rand() < 0.012 - progress * 0.008) {
      restRun = 2 + Math.floor(rand() * 4); // a missed stretch: exams, travel, life
    } else if (rand() < showUp) {
      const base = 0.75 + progress * 2.5;
      hours = Math.round((base + rand() * (1.5 + progress * 2)) * 4) / 4;
    }
    prevStudied = hours > 0;

    const isToday = date.getTime() === today.getTime();
    if (isToday) hours = 3 + 40 / 60;

    if (hours > 0) {
      studied += 1;
      total += hours;
    }
    run = hours >= 2 ? run + 1 : 0;
    best = Math.max(best, run);

    cell.classList.add(isToday ? 'is-today' : `h${level(hours)}`);
    cell.dataset.d = shortDate(date);
    cell.dataset.h = String(hours);
    frag.appendChild(cell);
  }
  grid.appendChild(frag);

  if (summary) {
    summary.textContent =
      `Each square is a day; darker means longer. This sample year has ${studied} study days, ` +
      `${Math.round(total).toLocaleString('en-IN')} hours, and a longest streak of ${best} days.`;
  }

  let last: HTMLElement | null = null;
  grid.addEventListener('pointerover', (e) => {
    const cell = (e.target as HTMLElement).closest('i');
    if (!cell || !cell.dataset.d || !readout) return;
    last?.classList.remove('is-hover');
    cell.classList.add('is-hover');
    last = cell;
    const h = Number(cell.dataset.h);
    readout.textContent = h > 0 ? `${cell.dataset.d}: ${hoursText(h)}` : `${cell.dataset.d}: no study`;
  });
  grid.addEventListener('pointerleave', () => {
    last?.classList.remove('is-hover');
    last = null;
  });
}

/* ── Maamu ───────────────────────────────────────────────────────────── */

const MAAMU = {
  normal:
    'DSA is steady at 11h 20m. System design has been at zero for four days, and your phase ends in 14. ' +
    'Block 90 minutes for it tonight before the 4 AM cutoff.',
  beast:
    'Four days of zero system design with two weeks left in the phase is avoidance, not a plan. ' +
    'Close the easy DSA warm-ups. Open system design and do 90 minutes now.',
};

function initMaamu(): void {
  const sw = $<HTMLButtonElement>('beastSwitch');
  const reply = $('maamuReply');
  if (!sw || !reply) return;
  const p = reply.querySelector('p');

  sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    reply.classList.toggle('is-beast', on);
    if (p) p.textContent = on ? MAAMU.beast : MAAMU.normal;
  });
}

/* ── Live numbers ────────────────────────────────────────────────────── */

interface Telemetry {
  active_now?: number;
  global_hours_today?: number;
  total_platform_hours?: number;
  total_pilots?: number;
}

interface BoardUser {
  display_name?: string;
  avatar?: string;
  timeframe_hours?: number;
  total_hours?: number;
  today_hours?: number;
  current_streak?: number;
  current_rank?: string;
  competitive_score?: number;
  is_focusing_now?: boolean;
  is_online?: boolean;
  is_focus_public?: boolean;
  current_focus_subject?: string | null;
  last_active?: string;
}

type Range = 'today' | 'weekly' | 'monthly' | 'all-time';

const RANGE_LABEL: Record<Range, string> = {
  today: 'today',
  weekly: 'in 7 days',
  monthly: 'in 30 days',
  'all-time': 'all time',
};

/** "PILOT [S:0]" -> "Pilot" */
function rankTitle(raw?: string): string {
  const word = (raw || 'Recruit').split(/[\s[]/)[0].toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Hours the way the app writes them: 0h, 45m, 13h 30m, 1,204h. */
function hrs(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';
  if (hours >= 100) return `${Math.round(hours).toLocaleString('en-IN')}h`;
  return hoursText(hours);
}

function seenText(iso?: string): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `seen ${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `seen ${h}h ago`;
  return `seen ${Math.round(h / 24)}d ago`;
}

/**
 * The database has been reset several times, so the live total only counts
 * hours since the last reset. More than 500 hours were logged before that,
 * so the landing never shows a platform total below that floor. Once the
 * live number passes it, the live number is shown as is.
 */
const PLATFORM_HOURS_FLOOR = 500;

function platformHours(data: Telemetry): number {
  return Math.max(Number(data.total_platform_hours) || 0, PLATFORM_HOURS_FLOOR);
}

function platformText(hours: number): string {
  return hours <= PLATFORM_HOURS_FLOOR ? `${PLATFORM_HOURS_FLOOR}+ hours` : `${Math.round(hours).toLocaleString('en-IN')} hours`;
}

function bold(text: string): HTMLElement {
  const b = document.createElement('b');
  b.textContent = text;
  return b;
}

async function loadTelemetry(): Promise<void> {
  try {
    const res = await fetch('/api/app/telemetry');
    if (!res.ok) return;
    const data = (await res.json()) as Telemetry;
    renderPulse(data);
    renderBoardStats(data);
  } catch {
    // No numbers, no claim: the lines stay hidden.
  }
}

function renderPulse(data: Telemetry): void {
  const pulse = $('pulse');
  const text = $('pulseText');
  if (!pulse || !text) return;

  const active = Number(data.active_now) || 0;
  const todayHrs = Number(data.global_hours_today) || 0;
  const allHrs = platformHours(data);

  const parts: (string | HTMLElement)[] = [];
  if (active > 0) {
    parts.push(bold(`${active} ${active === 1 ? 'person is' : 'people are'}`), ' studying on AllTracker right now');
    if (todayHrs > 0) parts.push(', and ', bold(hrs(todayHrs)), ' have been logged today.');
    else parts.push('.');
  } else if (todayHrs > 0) {
    parts.push(bold(hrs(todayHrs)), ' logged on AllTracker today');
    if (allHrs > 0) parts.push(', ', bold(platformText(allHrs)), ' in total.');
    else parts.push('.');
  } else if (allHrs > 0) {
    parts.push(bold(platformText(allHrs)), ' logged on AllTracker so far.');
  } else {
    return;
  }

  pulse.classList.toggle('is-live', active > 0);
  text.replaceChildren(...parts);
  pulse.hidden = false;
}

function renderBoardStats(data: Telemetry): void {
  const el = $('boardStats');
  if (!el) return;
  const members = Number(data.total_pilots) || 0;
  const allHrs = platformHours(data);
  const active = Number(data.active_now) || 0;
  if (!members && !allHrs) return;

  const parts: (string | HTMLElement)[] = [];
  if (members) parts.push(bold(members.toLocaleString('en-IN')), ' members');
  if (allHrs) parts.push(parts.length ? ', ' : '', bold(platformText(allHrs)), ' logged');
  parts.push(', ', bold(String(active)), ' studying now.');
  el.replaceChildren(...parts);
}

function boardRow(u: BoardUser, i: number, range: Range): HTMLLIElement {
  const li = document.createElement('li');
  if (u.is_focusing_now) li.className = 'is-live';

  const pos = document.createElement('span');
  pos.className = 'board-pos';
  pos.textContent = String(i + 1);

  const av = document.createElement('span');
  av.className = 'board-av';
  av.setAttribute('aria-hidden', 'true');
  av.textContent = u.avatar || '🙂';

  const name = document.createElement('span');
  name.className = 'board-name';
  name.textContent = u.display_name || 'Anonymous';

  const sub = document.createElement('small');
  const title = rankTitle(u.current_rank);
  const streak = Number(u.current_streak) || 0;
  if (u.is_focusing_now) {
    sub.className = 'board-now';
    const subject = u.is_focus_public !== false && u.current_focus_subject;
    sub.textContent = subject ? `Studying ${subject} now` : 'Studying now';
  } else {
    const extra = streak > 0 ? `${streak}-day streak` : u.is_online ? 'online' : seenText(u.last_active);
    sub.textContent = extra ? `${title}, ${extra}` : title;
  }
  name.appendChild(sub);

  // Primary figure: hours in the chosen range. Secondary: the context the app
  // shows beside it (all-time hours, or today's hours on the all-time board).
  const val = Number(u.timeframe_hours) || 0;
  const figs = document.createElement('span');
  figs.className = 'board-figs';

  const main = document.createElement('span');
  main.className = val > 0 ? 'board-hrs' : 'board-hrs is-zero';
  main.textContent = hrs(val);
  const mainLabel = document.createElement('span');
  mainLabel.className = 'sr';
  mainLabel.textContent = ` ${RANGE_LABEL[range]}`;
  main.appendChild(mainLabel);

  // Context lines, as the app shows them: all-time hours, today's hours, points.
  const today = Number(u.today_hours) || 0;
  const lines: string[] = [];
  if (range !== 'all-time') lines.push(`${hrs(Number(u.total_hours) || 0)} all time`);
  if (range !== 'today') lines.push(`+${hrs(today)} today`);
  if (range === 'all-time') lines.push(`${Math.round(Number(u.competitive_score) || 0)} pts`);

  figs.append(main);
  lines.forEach((text) => {
    const s = document.createElement('small');
    s.textContent = text;
    if (text.endsWith('today') && today > 0) s.className = 'is-up';
    figs.append(s);
  });
  li.append(pos, av, name, figs);
  return li;
}

function initBoard(): void {
  const board = $('board');
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-range]');
  if (!board) return;

  const cache = new Map<Range, BoardUser[]>();
  let current: Range = 'weekly';

  const fetchRange = async (range: Range): Promise<BoardUser[]> => {
    const hit = cache.get(range);
    if (hit) return hit;
    const res = await fetch(`/api/app/leaderboard?timeframe=${range}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as BoardUser[];
    const users = Array.isArray(data) ? data : [];
    cache.set(range, users);
    return users;
  };

  const message = (text: string, withLink: boolean) => {
    const li = document.createElement('li');
    li.className = 'board-empty';
    li.append(text);
    if (withLink) {
      const a = document.createElement('a');
      a.href = '/app';
      a.textContent = 'the app';
      li.append(' You can find it under World Stage in ', a, '.');
    }
    return li;
  };

  const show = async (range: Range) => {
    current = range;
    board.setAttribute('aria-busy', 'true');
    try {
      // The shorter ranges report all-time hours slightly differently, so the
      // "all time" figure always comes from the all-time board, as in the app.
      const [ranged, allTime] = await Promise.all([
        fetchRange(range),
        range === 'all-time' ? Promise.resolve(null) : fetchRange('all-time').catch(() => null),
      ]);
      if (range !== current) return; // a newer tab was picked meanwhile
      const allByName = new Map((allTime ?? []).map((u) => [u.display_name, Number(u.timeframe_hours) || 0]));
      const users = ranged.map((u) =>
        allByName.has(u.display_name) ? { ...u, total_hours: allByName.get(u.display_name) } : u,
      );

      // People with no hours at all only add noise to a public board.
      const list = users.filter((u) => (Number(u.total_hours) || 0) > 0).slice(0, 5);
      if (list.length === 0) {
        board.replaceChildren(message('Nobody is on the board yet.', true));
        return;
      }
      const rows: HTMLLIElement[] = list.map((u, i) => boardRow(u, i, range));
      if (list.every((u) => !((Number(u.timeframe_hours) || 0) > 0))) {
        rows.unshift(message(
          range === 'today'
            ? 'No hours logged yet today. The first session takes the top spot.'
            : 'Nobody has logged hours in this range yet.',
          false,
        ));
      }
      board.replaceChildren(...rows);
    } catch {
      if (range === current) board.replaceChildren(message('The live board didn’t load here.', true));
    } finally {
      board.removeAttribute('aria-busy');
    }
  };

  const list = [...tabs];
  list.forEach((tab) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => {
      list.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      void show(tab.dataset.range as Range);
    });
    // Arrow keys move between tabs, as in any tab list.
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const idx = list.indexOf(tab);
      const next = list[(idx + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
      next.focus();
      next.click();
    });
  });

  void show('weekly');
}

/* ── Scroll motion ───────────────────────────────────────────────────── */

/**
 * Each block arrives the way its content happens in the app: log rows are
 * written in one by one, the year fills week by week, Maamu replies after
 * you ask, the rank ladder climbs. Off entirely for reduced motion, and
 * nothing is hidden unless this script runs.
 */
function initMotion(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll<HTMLElement>(
    '.sec-head, .ledger, .year, .chat, .board, .ladder, .more, .qa, .close',
  );

  // Stagger indexes, read by CSS as --i.
  const stagger = (selector: string) =>
    document.querySelectorAll<HTMLElement>(selector).forEach((el, i) => el.style.setProperty('--i', String(i)));
  stagger('.ledger .lr');
  stagger('.ladder-steps li');
  stagger('.more > div');
  stagger('.qa details');

  // Headings get an inner line that rises inside the heading's own box.
  document.querySelectorAll<HTMLElement>('.sec-head h2, .close h2').forEach((h) => {
    const span = document.createElement('span');
    span.className = 'rise';
    span.append(...h.childNodes);
    h.appendChild(span);
  });

  document.documentElement.classList.add('motion');

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
  );
  targets.forEach((el) => {
    // Anything already on screen at load is shown as is, without a replay.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) el.classList.add('is-in', 'no-anim');
    else io.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initRace();
  initLedgerDates();
  initYear();
  initMaamu();
  initBoard();
  initMotion();
  void loadTelemetry();
});
