/**
 * Share Preview Logic
 * 
 * Handles the "Preview BEFORE Share" experience.
 * Integrates Web Share API (native WhatsApp/IG) and provides high-res downloads.
 */

import { showToast } from '@/utils/dom.utils';

let _activeDataUrl: string = '';

export function openSharePreview(imageDataUrl: string): void {
  _activeDataUrl = imageDataUrl;
  
  const modal = document.getElementById('sharePreviewModal');
  const container = document.getElementById('shareImageContainer');
  if (!modal || !container) return;

  // 1. Inject Image for Preview
  container.innerHTML = `<img src="${imageDataUrl}" alt="Progress Statistics" style="cursor: pointer; -webkit-user-select: none;">`;
  
  // 2. Bind Actions
  const closeBtn = document.getElementById('closeSharePreviewBtn');
  const shareBtn = document.getElementById('shareNativeBtn');
  const downloadBtn = document.getElementById('downloadShareBtn');

  if (closeBtn) closeBtn.onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
  };

  if (shareBtn) shareBtn.onclick = handleNativeShare;
  if (downloadBtn) downloadBtn.onclick = triggerDownload;

  // 3. Show Modal
  modal.style.display = 'flex';
  modal.classList.add('active');
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
