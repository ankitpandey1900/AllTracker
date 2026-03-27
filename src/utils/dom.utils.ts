/**
 * DOM utility functions
 *
 * Shared helpers for toast notifications, text updates, and scrolling.
 */

// ─── Toast Notifications ─────────────────────────────────────

/**
 * Shows a toast notification.
 * Creates the toast container if it doesn't exist yet.
 */
export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000): void {
  let container = document.getElementById('toastContainer');

  // Auto-create toast container if missing
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons: Record<string, string> = {
    success: '',
    error: '',
    warning: '',
    info: '',
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Safe Text Setter ────────────────────────────────────────

/** Safely sets textContent of an element by ID */
export function setTxt(id: string, text: string | number): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text);
}

// ─── Table Scroll ────────────────────────────────────────────

/** Scrolls to a specific day row in the tracker table and briefly highlights it */
export function jumpToDayInTable(day: number): void {
  const dayIndex = day - 1;
  const row = document.querySelector(`tr[data-day="${dayIndex}"]`) as HTMLElement | null;

  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
    setTimeout(() => {
      row.style.backgroundColor = '';
    }, 2000);
  }
}

// ─── Confetti Effect ─────────────────────────────────────────

/** Fires a simple CSS-based confetti animation */
export function startConfetti(): void {
  const colors = ['#ff0055', '#bc13fe', '#00f3ff', '#ffd700', '#00ff9d'];

  for (let i = 0; i < 50; i++) {
    const conf = document.createElement('div');
    conf.style.position = 'fixed';
    conf.style.width = '10px';
    conf.style.height = '10px';
    conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    conf.style.left = Math.random() * 100 + 'vw';
    conf.style.top = '-10px';
    conf.style.zIndex = '9999';
    conf.style.transition = 'top 3s ease-in, transform 3s ease-in';
    document.body.appendChild(conf);

    setTimeout(() => {
      conf.style.top = '100vh';
      conf.style.transform = `rotate(${Math.random() * 360}deg)`;
    }, 100);

    setTimeout(() => conf.remove(), 3000);
  }
}
