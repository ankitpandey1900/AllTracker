import { QUOTES, Quote } from '../../data/quotes.data';
import { appState } from '../../state/app-state';
import { calculateSummaryStats } from '../../utils/calc.utils';

export class QuotesManager {
  private static instance: QuotesManager;
  private currentQuote: Quote | null = null;
  private previousQuote: Quote | null = null;
  private rotationInterval: any = null;
  private clickTimer: any = null;

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
    const quoteEl = document.getElementById('currentQuoteText');
    if (quoteEl) {
      quoteEl.style.cursor = 'pointer';
      quoteEl.title = 'Click for next wisdom | Double-click for previous';
      
      quoteEl.onclick = () => {
        if (this.clickTimer) {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
        } else {
          this.clickTimer = setTimeout(() => {
            this.rotate();
            this.clickTimer = null;
          }, 250);
        }
      };

      quoteEl.ondblclick = () => {
        if (this.clickTimer) {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
        }
        this.goBack();
      };
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

    this.previousQuote = this.currentQuote;
    this.currentQuote = quote;
    this.updateHUD();
  }

  public goBack(): void {
    if (!this.previousQuote) return;
    
    // Swap
    const temp = this.currentQuote;
    this.currentQuote = this.previousQuote;
    this.previousQuote = temp;
    
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

    // 🔱 STRATEGIC INJECTION: 15% chance to pick a Bhagavad Gita quote regardless of pace
    if (Math.random() < 0.15) {
      const gitaPool = QUOTES.filter(q => q.a.includes('Bhagavad Gita') || q.a.includes('Lord Krishna'));
      if (gitaPool.length > 0) {
        return gitaPool[Math.floor(Math.random() * gitaPool.length)];
      }
    }

    let pool: Quote[] = [];

    // Mapping logic as per proposed plan:
    // BEHIND -> Savage (behavior) + Problems
    // STEADY -> Coding + Work
    // AHEAD -> Future + Spiritual + Life
    if (category === 'behind') {
      pool = QUOTES.filter(q => q.category === 'behavior' || q.category === 'SAVAGE_WISDOM' || q.category === 'problem-solving');
    } else if (category === 'ahead-high') {
      // High performers get Futurism, Spirituality (Gita), and Life Philosophy
      pool = QUOTES.filter(q => q.category === 'future' || q.category === 'spiritual' || q.category === 'life');
    } else if (category === 'ahead-low') {
      pool = QUOTES.filter(q => q.category === 'spiritual' || q.category === 'THE_CRAFT' || q.category === 'EXECUTION');
    } else {
      // Steady - Craft, Execution, and Life
      pool = QUOTES.filter(q => q.category === 'THE_CRAFT' || q.category === 'EXECUTION' || q.category === 'life' || q.category === 'spiritual');
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
    const quoteEl = document.getElementById('currentQuoteText');
    if (!quoteEl || !this.currentQuote) return;

    quoteEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    quoteEl.style.opacity = '0';
    quoteEl.style.transform = 'translateY(-10px)';

    setTimeout(() => {
      if (quoteEl && this.currentQuote) {
        const authorRaw = this.currentQuote.a;
        const author = (authorRaw === 'Unknown' || authorRaw === 'Aap Ka Shubh Chintak' || !authorRaw) 
          ? 'All Tracker' 
          : authorRaw;
        
        quoteEl.innerHTML = `
          "${this.currentQuote.t}"
          <span style="font-size: 0.35em; opacity: 0.35; display: block; margin-top: 12px; font-weight: 500; font-family: 'Outfit'; letter-spacing: 2px;">— ${author.toUpperCase()}</span>
        `;
        quoteEl.style.opacity = '1';
        quoteEl.style.transform = 'translateY(0)';
      }
    }, 400);
  }

  /** Expose current quote for manual refresh or initial render */
  public getCurrentQuote(): Quote | null {
    if (!this.currentQuote) {
      this.currentQuote = this.pickQuote();
    }
    return this.currentQuote;
  }
}
