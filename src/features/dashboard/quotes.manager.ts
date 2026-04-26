import { QUOTES, Quote } from '../../data/quotes.data';
import { appState } from '../../state/app-state';
import { calculateSummaryStats } from '../../utils/calc.utils';

export class QuotesManager {
  private static instance: QuotesManager;
  private currentQuote: Quote | null = null;
  private rotationInterval: any = null;

  private constructor() {}

  public static getInstance(): QuotesManager {
    if (!QuotesManager.instance) {
      QuotesManager.instance = new QuotesManager();
    }
    return QuotesManager.instance;
  }

  /** Starts the 5-minute rotation cycle */
  public startRotation(): void {
    if (this.rotationInterval) return;
    
    // Initial pick
    this.rotate();

    // Enable manual refresh on click
    const statusEl = document.getElementById('heroStatusTitle');
    if (statusEl) {
      statusEl.style.cursor = 'pointer';
      statusEl.title = 'Click for more wisdom';
      statusEl.onclick = () => this.rotate();
    }

    // 5-minute interval (300,000 ms)
    this.rotationInterval = setInterval(() => {
      this.rotate();
    }, 5 * 60 * 1000);
  }

  /** Picks a new quote based on user performance and updates HUD */
  public rotate(): void {
    const quote = this.pickQuote();
    if (!quote) return;

    this.currentQuote = quote;
    this.updateHUD();
  }

  private pickQuote(): Quote | null {
    const stats = calculateSummaryStats(appState.trackerData);
    const currentDay = (appState.trackerData[appState.trackerData.length - 1]?.day || 1);
    const totalDays = appState.totalDays || 365;

    const expectedPace = currentDay / totalDays;
    const actualPace = stats.completedDays / totalDays;
    const diff = actualPace - expectedPace;
    
    let category: 'behind' | 'ahead-high' | 'ahead-low' | 'steady';
    if (diff < -0.05) category = 'behind';
    else if (diff > 0.10) category = 'ahead-high';
    else if (diff > 0) category = 'ahead-low';
    else category = 'steady';

    let pool: Quote[] = [];

    // Mapping logic as per proposed plan:
    // BEHIND -> Savage (behavior) + Problems
    // STEADY -> Coding + Work
    // AHEAD -> Future + Spiritual + Life
    if (category === 'behind') {
      pool = QUOTES.filter(q => q.category === 'behavior' || q.category === 'SAVAGE_WISDOM' || q.category === 'problem-solving');
    } else if (category === 'ahead-high') {
      pool = QUOTES.filter(q => q.category === 'future' || q.category === 'spiritual' || q.category === 'life');
    } else if (category === 'ahead-low') {
      pool = QUOTES.filter(q => q.category === 'spiritual' || q.category === 'THE_CRAFT' || q.category === 'EXECUTION');
    } else {
      // Steady
      pool = QUOTES.filter(q => q.category === 'THE_CRAFT' || q.category === 'EXECUTION' || q.category === 'life');
    }

    if (pool.length === 0) pool = QUOTES; // Fallback

    // Avoid picking the same quote twice in a row if possible
    let selected = pool[Math.floor(Math.random() * pool.length)];
    if (this.currentQuote && selected.id === this.currentQuote.id && pool.length > 1) {
      selected = pool[Math.floor(Math.random() * pool.length)];
    }

    return selected;
  }

  private updateHUD(): void {
    const statusEl = document.getElementById('heroStatusTitle');
    if (!statusEl || !this.currentQuote) return;

    // We want a premium look. 
    statusEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    statusEl.style.opacity = '0';
    statusEl.style.transform = 'translateY(-5px)';

    setTimeout(() => {
      if (statusEl && this.currentQuote) {
        const authorRaw = this.currentQuote.a;
        const author = (authorRaw === 'Unknown' || authorRaw === 'Aap Ka Shubh Chintak' || !authorRaw) 
          ? 'All Tracker' 
          : authorRaw;
        
        statusEl.innerHTML = `
          <span style="color: #fff; font-weight: 500; font-family: 'Outfit', sans-serif; line-height: 1.4; display: block; font-style: italic;">"${this.currentQuote.t}"</span>
          <span style="font-size: 0.75em; opacity: 0.4; display: block; margin-top: 6px; font-weight: 400;">— ${author}</span>
        `;
        statusEl.style.opacity = '1';
        statusEl.style.transform = 'translateY(0)';
      }
    }, 500);
  }

  /** Expose current quote for manual refresh or initial render */
  public getCurrentQuote(): Quote | null {
    return this.currentQuote;
  }
}
