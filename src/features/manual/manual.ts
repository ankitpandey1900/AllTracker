/**
 * Handles the documentation logic for the Mission Dossier.
 * 
 * Features:
 * 1. Smooth scrolling to sections with reveal animations.
 * 2. Active link highlighting.
 * 3. Real-time fuzzy search across all documentation sections.
 */

declare global {
  interface Window {
    docScrollTo: (id: string) => void;
  }
}

export function initManualLogic(): void {
  // 1. SCROLLING & NAVIGATION
  window.docScrollTo = function(id: string) {
    const el = document.getElementById(id);
    if (!el) return;

    // If we are showing search results, switch back to main view
    const mainView = document.getElementById('docsMainView');
    const resultsView = document.getElementById('docsSearchResults');
    if (mainView && resultsView) {
      mainView.style.display = 'block';
      resultsView.style.display = 'none';
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Subtle glitch/reveal effect for the target header
    const header = el.querySelector('h1, h2');
    if (header) {
      header.classList.remove('reveal-active');
      void (header as HTMLElement).offsetWidth; // Trigger reflow
      header.classList.add('reveal-active');
    }

    // Highlight active link in sidebar
    document.querySelectorAll('.docs-nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = Array.from(document.querySelectorAll('.docs-nav-link')).find(l => 
        l.getAttribute('onclick')?.includes(id)
    );
    if (activeLink) activeLink.classList.add('active');
  };

  // 2. SEARCH ENGINE
  const searchInput = document.getElementById('docsSearchInput') as HTMLInputElement;
  const mainView = document.getElementById('docsMainView');
  const resultsView = document.getElementById('docsSearchResults');
  const resultsList = document.getElementById('docsResultsList');

  if (searchInput && mainView && resultsView && resultsList) {
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
      
      if (query.length < 2) {
        mainView.style.display = 'block';
        resultsView.style.display = 'none';
        return;
      }

      // Perform Search
      mainView.style.display = 'none';
      resultsView.style.display = 'block';
      resultsList.innerHTML = '';

      const sections = document.querySelectorAll('.docs-section');
      let foundCount = 0;

      sections.forEach(section => {
        const text = section.textContent?.toLowerCase() || '';
        if (text.includes(query)) {
          foundCount++;
          const title = section.querySelector('h1, h2, h3')?.textContent || 'Untitled Protocol';
          const breadcrumb = section.querySelector('.docs-breadcrumb')?.innerHTML || 'General';
          const id = section.id;

          const resultItem = document.createElement('div');
          resultItem.className = 'docs-step';
          resultItem.style.cursor = 'pointer';
          resultItem.innerHTML = `
            <div class="docs-step-num">${foundCount}</div>
            <div class="docs-step-body">
              <div class="docs-breadcrumb" style="margin-bottom: 5px; font-size: 0.7rem;">${breadcrumb}</div>
              <h4 style="margin: 4px 0; font-family: 'Tektur', sans-serif; color: #fff;">${title}</h4>
              <p style="font-size: 0.85rem; opacity: 0.7;">Protocol match detected in this section.</p>
            </div>
          `;
          resultItem.addEventListener('click', () => {
            searchInput.value = '';
            window.docScrollTo(id);
          });
          resultsList.appendChild(resultItem);
        }
      });

      if (foundCount === 0) {
        resultsList.innerHTML = `
          <div class="search-empty-state">
            <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.5;">📡</div>
            <h3 style="font-family: 'Tektur', sans-serif; color: #fff;">No matching protocols found</h3>
            <p>The system could not locate the requested transmission data.</p>
          </div>
        `;
      }
    });
  }
}

