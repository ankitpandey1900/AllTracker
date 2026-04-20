import { notificationService } from '@/services/notification.service';

// --- Pop-up messages (Toasts) ---

/** Show a quick message on the screen */
export function showToast(
  message: string, 
  type: 'success' | 'error' | 'warning' | 'info' = 'info', 
  duration = 3000,
  onClick?: () => void
): void {
  // 🔔 TACTICAL AUDIO: All system notifications play the chime
  notificationService.playChime();
  
  let container = document.getElementById('toastContainer');

  // Auto-create toast container if missing
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type} ${onClick ? 'clickable' : ''}`;
  if (onClick) {
    toast.onclick = (e) => {
      if ((e.target as HTMLElement).classList.contains('toast-close')) return;
      onClick();
      toast.remove();
    };
  }

  const icons: Record<string, string> = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
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

// --- Updating Text Safely ---

/** Update text on the page by finding the ID */
export function setTxt(id: string, text: string | number): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text);
}

// --- Table Scrolling ---

/** Scroll the table to show a specific day and highlight it briefly */
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

// --- Celebration Effect ---

/** Fire a quick confetti animation */
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

// --- Global Loading Indicator ---

/** Show a high-fidelity loading overlay with a custom message */
export function showLoading(message: string = 'Processing...'): void {
  let loader = document.getElementById('global-app-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-app-loader';
    loader.className = 'global-loader-overlay';
    document.body.appendChild(loader);
  }
  
  loader.innerHTML = `
    <div class="loader-backdrop"></div>
    <div class="loader-content">
      <div class="holographic-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-core"></div>
      </div>
      <div class="loader-message-v3">${message}</div>
      <div class="loader-subtext">MAINTAINING HIGH-FREQUENCY SYNC</div>
    </div>
  `;
  
  loader.classList.remove('hidden');
  loader.style.display = 'flex';
}

/** Hide the global loading overlay */
export function hideLoading(): void {
  const loader = document.getElementById('global-app-loader');
  if (loader) {
    loader.classList.add('hidden');
    // Wait for fade animation
    setTimeout(() => {
      if (loader.classList.contains('hidden')) {
        loader.style.display = 'none';
      }
    }, 400);
  }
}
