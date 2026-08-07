/**
 * Handles the 'Share Card' popup.
 * 
 * It shows the image we generated and lets you download it or 
 * share it using your phone's native share menu.
 * 
 * CLEANED: Removed dead theme-dot logic.
 */

import { showToast } from '@/utils/dom.utils';
import { generateQuoteShareCard } from '@/features/dashboard/share-quote-card';

let _activeDataUrl: string = '';
let _currentType: 'quote' | 'stats' = 'stats';

export function openSharePreview(imageDataUrl: string, title: string = 'SHARE YOUR PROGRESS', targetNetwork?: string, shareText?: string, shareUrl?: string): void {
  _activeDataUrl = imageDataUrl;
  _currentType = title.includes('QUOTE') ? 'quote' : 'stats';
  
  const modal = document.getElementById('sharePreviewModal');
  const container = document.getElementById('shareImageContainer');
  const titleEl = document.getElementById('shareModalTitle');
  const subtitleEl = document.getElementById('shareModalSubtitle');
  if (!modal || !container) return;

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = _currentType === 'quote' ? 'Create beautiful quote images to share.' : 'Share your stats and badges with the world.';

  const customTrigger = document.getElementById('customBriefingTrigger');
  const customContainer = document.getElementById('customTextContainer');
  
  // Quote-specific controls
  const isQuote = _currentType === 'quote';
  const shuffleTrigger = document.getElementById('shuffleQuoteBtn');
  const themeTabBar = document.getElementById('themeTabBar');
  const themePresets = document.getElementById('themePresetsContainer');
  
  if (customTrigger) customTrigger.style.display = isQuote ? 'flex' : 'none';
  if (shuffleTrigger) shuffleTrigger.style.display = isQuote ? 'flex' : 'none';
  if (themeTabBar) themeTabBar.style.display = isQuote ? 'flex' : 'none';
  if (themePresets) themePresets.style.display = isQuote ? 'flex' : 'none';
  if (customContainer) customContainer.style.display = 'none';

  // 1. Inject Image
  container.innerHTML = `<img id="previewImg" src="${imageDataUrl}" alt="Progress Statistics" style="cursor: pointer; width: 100%; height: auto; -webkit-user-select: none;">`;
  
  // 2. Bind Actions
  const closeBtn = document.getElementById('closeSharePreviewBtn');
  const shareBtn = document.getElementById('shareNativeBtn');
  const downloadBtn = document.getElementById('downloadShareBtn');
  const copyBtn = document.getElementById('copyShareBtn');
  if (copyBtn) {
    copyBtn.innerHTML = isQuote ? 
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Quote` : 
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Image`;
  }
  
  const customInput = document.getElementById('customBriefingInput') as HTMLTextAreaElement;
  const applyBtn = document.getElementById('applyCustomTextBtn');
  const shuffleBtn = document.getElementById('shuffleQuoteBtn');

  if (shuffleBtn) {
    shuffleBtn.onclick = async () => {
      const loader = document.getElementById('shareLoadingOverlay');
      if (loader) loader.style.display = 'flex';
      try {
        await generateQuoteShareCard(undefined, undefined, true);
      } finally {
        if (loader) loader.style.display = 'none';
      }
    };
  }

  if (customTrigger) {
    customTrigger.onclick = () => {
      if (customContainer) customContainer.style.display = customContainer.style.display === 'none' ? 'block' : 'none';
    };
  }

  if (applyBtn) {
    applyBtn.onclick = async () => {
      const text = customInput?.value;
      const loader = document.getElementById('shareLoadingOverlay');
      if (loader) loader.style.display = 'flex';
      
      try {
        await generateQuoteShareCard('default', text);
      } finally {
        if (loader) loader.style.display = 'none';
      }
    };
  }

  if (closeBtn) closeBtn.onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
  };

  if (shareBtn) {
    if (targetNetwork === 'x') {
      shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Post to X`;
      shareBtn.onclick = async () => {
        await handleCopyToClipboard();
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText || '')}&url=${encodeURIComponent(shareUrl || '')}`, '_blank');
      };
    } else if (targetNetwork === 'linkedin') {
      shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> Post to LinkedIn`;
      shareBtn.onclick = async () => {
        await handleCopyToClipboard();
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || '')}`, '_blank');
      };
    } else {
      shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share`;
      shareBtn.onclick = handleNativeShare;
    }
  }
  if (downloadBtn) downloadBtn.onclick = triggerDownload;
  if (copyBtn) copyBtn.onclick = handleCopyToClipboard;

  // 3. Theme Preset Logic
  const themeBtns = document.querySelectorAll('.theme-preset-btn');
  themeBtns.forEach(btn => {
    (btn as HTMLElement).onclick = async (e) => {
      const target = e.currentTarget as HTMLElement;
      const themeKey = target.getAttribute('data-theme') || 'midnight';
      
      // Update UI active state
      themeBtns.forEach(b => {
        const thumb = b.querySelector('.theme-preset-thumb') as HTMLElement;
        const check = b.querySelector('.theme-active-check') as HTMLElement;
        const name = b.querySelector('.theme-preset-name') as HTMLElement;
        if (thumb) thumb.style.border = '1px solid rgba(255,255,255,0.08)';
        if (check) check.style.display = 'none';
        if (name) name.style.color = '#4a4e5a';
      });

      const thumb = target.querySelector('.theme-preset-thumb') as HTMLElement;
      const check = target.querySelector('.theme-active-check') as HTMLElement;
      const name = target.querySelector('.theme-preset-name') as HTMLElement;
      if (thumb) thumb.style.border = '2px solid rgba(200,169,110,0.5)';
      if (check) check.style.display = 'flex';
      if (name) name.style.color = '#e8e0d4';

      // Regenerate card with new theme
      const text = customInput?.value;
      const loader = document.getElementById('shareLoadingOverlay');
      if (loader) loader.style.display = 'flex';
      
      try {
        await generateQuoteShareCard(themeKey, text);
      } finally {
        if (loader) loader.style.display = 'none';
      }
    };
  });

  // 4. Show Modal
  modal.style.display = 'flex';
  modal.classList.add('active');
}

/** Instant Copy to Clipboard (Image Blob) */
async function handleCopyToClipboard(): Promise<void> {
    try {
        const response = await fetch(_activeDataUrl);
        const blob = await response.blob();
        
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        showToast("Image copied to clipboard! Ready to paste. 🔥", "success");
    } catch (err) {
        console.error("Clipboard error:", err);
        showToast("Clipboard copy failed. Try Download.", "error");
    }
}

/** Uses Web Share API (Mobile native) to share the image directly */
async function handleNativeShare(): Promise<void> {
    if (!navigator.share) {
        showToast("Native sharing not supported. Use Download or Copy Image instead.", "warning");
        return;
    }

    try {
        const res = await fetch(_activeDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'arena_stats.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'My Progress | All Tracker',
                text: 'Tracking my journey to mastery in the Neon Arena. 🚀 #AllTracker #NeonArena'
            });
        } else {
            showToast("Native File Sharing is not allowed on this browser. Try Download.", "warning");
        }
    } catch (e) {
        console.error("Share error:", e);
    }
}

/** Legacy fallback download for all browsers */
function triggerDownload(): void {
    const link = document.createElement('a');
    link.download = 'all_tracker_progress.png';
    link.href = _activeDataUrl;
    link.click();
}
