/**
 * Manual Modal Logic
 * 
 * Specifically handles the internal documentation scrolling and active link highlighting.
 */

declare global {
  interface Window {
    docScrollTo: (id: string) => void;
  }
}

export function initManualLogic(): void {
  window.docScrollTo = function(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Highlight active link in sidebar
    document.querySelectorAll('.docs-nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = Array.from(document.querySelectorAll('.docs-nav-link')).find(l => 
        l.getAttribute('onclick')?.includes(id)
    );
    if (activeLink) activeLink.classList.add('active');
  };
}
