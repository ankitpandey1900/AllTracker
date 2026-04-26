/**
 * Handles the 'Share Card' popup.
 * 
 * It shows the image we generated and lets you download it or 
 * share it using your phone's native share menu.
 */

import { showToast } from '@/utils/dom.utils';
import { generateQuoteShareCard } from '@/features/dashboard/share-quote-card';
import { generateShareCard } from '@/features/dashboard/share-card';

let _activeDataUrl: string = '';
let _currentType: 'quote' | 'stats' = 'stats';

export function openSharePreview(imageDataUrl: string, title: string = 'SHARE YOUR PROGRESS'): void {
  _activeDataUrl = imageDataUrl;
  _currentType = title.includes('QUOTE') ? 'quote' : 'stats';
  
  const modal = document.getElementById('sharePreviewModal');
  const container = document.getElementById('shareImageContainer');
  const titleEl = document.getElementById('shareModalTitle');
  if (!modal || !container) return;

  if (titleEl) titleEl.textContent = title;

  const customTrigger = document.getElementById('customBriefingTrigger');
  const customContainer = document.getElementById('customTextContainer');
  if (customTrigger) customTrigger.style.display = _currentType === 'quote' ? 'block' : 'none';
  if (customContainer) customContainer.style.display = 'none';

  // 1. Inject Image
  container.innerHTML = `<img id="previewImg" src="${imageDataUrl}" alt="Progress Statistics" style="cursor: pointer; width: 100%; height: auto; -webkit-user-select: none;">`;
  
  // 2. Bind Actions
  const closeBtn = document.getElementById('closeSharePreviewBtn');
  const shareBtn = document.getElementById('shareNativeBtn');
  const downloadBtn = document.getElementById('downloadShareBtn');
  const copyBtn = document.getElementById('copyShareBtn');
  const dots = document.querySelectorAll('.theme-dot');
  
  // Custom Text UI
  const customInput = document.getElementById('customBriefingInput') as HTMLTextAreaElement;
  const applyBtn = document.getElementById('applyCustomTextBtn');

  if (customTrigger) {
    customTrigger.onclick = () => {
      if (customContainer) customContainer.style.display = customContainer.style.display === 'none' ? 'block' : 'none';
    };
  }

  if (applyBtn) {
    applyBtn.onclick = async () => {
      const text = customInput?.value;
      const activeDot = document.querySelector('.theme-dot.active') as HTMLElement;
      const theme = activeDot?.dataset.theme || 'default';
      
      const loader = document.getElementById('shareLoadingOverlay');
      if (loader) loader.style.display = 'flex';
      
      try {
        await generateQuoteShareCard(theme, text);
      } finally {
        if (loader) loader.style.display = 'none';
      }
    };
  }

  if (closeBtn) closeBtn.onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
  };

  if (shareBtn) shareBtn.onclick = handleNativeShare;
  if (downloadBtn) downloadBtn.onclick = triggerDownload;
  if (copyBtn) copyBtn.onclick = handleCopyToClipboard;

  // Theme Dots logic
  dots.forEach(dot => {
    (dot as HTMLElement).onclick = async (e) => {
      const selectedTheme = (e.currentTarget as HTMLElement).dataset.theme;
      if (!selectedTheme) return;

      // Update UI dots
      dots.forEach(d => {
        (d as HTMLElement).style.borderColor = 'transparent';
        (d as HTMLElement).classList.remove('active');
      });
      (e.currentTarget as HTMLElement).style.borderColor = '#fff';
      (e.currentTarget as HTMLElement).classList.add('active');

      // Show loading
      const loader = document.getElementById('shareLoadingOverlay');
      if (loader) loader.style.display = 'flex';

      try {
        if (_currentType === 'quote') {
          await generateQuoteShareCard(selectedTheme, customInput?.value);
        } else {
          await generateShareCard(); 
        }
      } finally {
        if (loader) loader.style.display = 'none';
      }
    };
  });

  // 3. Show Modal
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
        // Convert base64 to Blob/File for sharing
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
    } catch (err) {
        console.error("Sharing error:", err);
        showToast("Sharing failed. Check permissions.", "error");
    }
}

/** Fallback trigger for manual PNG download */
function triggerDownload(): void {
    const link = document.createElement('a');
    link.download = `Arena_Stats_${new Date().toISOString().split('T')[0]}.png`;
    link.href = _activeDataUrl;
    link.click();
    showToast("Progress Captured! Ready for transmission.", "success");
}
