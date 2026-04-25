import { openProfileModal } from '@/features/profile/profile.ui';
import { formatDuration } from '@/utils/date.utils';

/** HUD interaction events */
export function bindLbItemEvents(): void {
  document.querySelectorAll('.leaderboard-item').forEach(item => {
    const avatarIcon = item.querySelector('.lb-avatar-wrapper, .podium-avatar-wrapper') as HTMLElement;
    
    // Hide the inline template so it doesn't mess with flex layouts
    const inlineCard = item.querySelector('.lb-hover-card') as HTMLElement;
    if (inlineCard) inlineCard.style.display = 'none';

    if (avatarIcon) {
      avatarIcon.onclick = (e) => {
        e.stopPropagation();
        if (item.classList.contains('is-me')) {
          openProfileModal();
        } else {
          // Destroy any existing global HUD & Scrim
          const existingHud = document.getElementById('active-global-hud');
          const existingScrim = document.getElementById('active-hud-scrim');
          if (existingHud) {
            existingHud.classList.remove('active-hud');
            setTimeout(() => existingHud.remove(), 300);
          }
          if (existingScrim) {
            existingScrim.classList.remove('active');
            setTimeout(() => existingScrim.remove(), 300);
          }

          if (inlineCard) {
            const card = inlineCard.cloneNode(true) as HTMLElement;
            card.id = 'active-global-hud';
            card.style.display = 'flex'; // Restore flex from inline none
            
            
            // Create Scrim for "Web Vibe"
            const scrim = document.createElement('div');
            scrim.className = 'lb-hud-scrim';
            scrim.id = 'active-hud-scrim';
            
            document.body.appendChild(scrim);
            document.body.appendChild(card);
            
            // Bind close button on the cloned node
            const hudClose = card.querySelector('.lb-hud-close') as HTMLElement;
            const closeHud = () => {
              card.classList.remove('active-hud');
              scrim.classList.remove('active');
              setTimeout(() => {
                card.remove();
                scrim.remove();
              }, 300);
            };

            if (hudClose) {
              hudClose.onclick = (e) => {
                e.stopPropagation();
                closeHud();
              };
            }

            // Click scrim to close
            scrim.onclick = (e) => {
              e.stopPropagation();
              closeHud();
            };

            requestAnimationFrame(() => {
              card.classList.add('active-hud');
              scrim.classList.add('active');
              animateNumbers(card);
            });
          }
        }
      };
    }
  });
}

export function handleGlobalHudDismiss(e: MouseEvent): void {
  const existingHud = document.getElementById('active-global-hud');
  const existingScrim = document.getElementById('active-hud-scrim');
  
  if (existingHud && !(e.target as HTMLElement).closest('#active-global-hud')) {
    existingHud.classList.remove('active-hud');
    if (existingScrim) existingScrim.classList.remove('active');
    
    setTimeout(() => {
      existingHud.remove();
      if (existingScrim) existingScrim.remove();
    }, 300);
  }
}

/** Cinematic Number Counting for Hover Cards */
export function animateNumbers(card: HTMLElement): void {
  card.querySelectorAll('.stat-val').forEach((el) => {
    const textElement = el as HTMLElement;
    const text = textElement.textContent || '';
    const numMatch = text.match(/[\d.]+/);
    if (!numMatch) return;
    
    const target = parseFloat(numMatch[0]);
    if (isNaN(target) || target === 0) return;
    
    const suffix = text.replace(numMatch[0], '');
    const isFloat = text.includes('.');
    const duration = 800; // 0.8s fast tactical scan
    let startTimestamp: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out explosive
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = target * ease;
      
      textElement.textContent = suffix === 'h' ? formatDuration(current) : (isFloat ? current.toFixed(1) : Math.floor(current).toString()) + suffix;
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        textElement.textContent = text; // Lock exact target instantly
      }
    };
    window.requestAnimationFrame(step);
  });
}
// Force Refresh
