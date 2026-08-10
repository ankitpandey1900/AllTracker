
import { QUOTES, Quote } from '../../data/quotes.data';
import { appState } from '../../state/app-state';
import { calculateSummaryStats } from '../../utils/calc.utils';

/**
 * QuoteManager category contract.
 *
 * These are the categories supported by the current quotes.data file:
 * THE_CRAFT, future, EXECUTION, spiritual, life, behavior,
 * problem-solving, SAVAGE_WISDOM, AI, CODING, TECH.
 *
 * The Quote type itself remains the source of truth for the actual union.
 */
export class QuotesManager {
  private static instance: QuotesManager;

  private currentQuote: Quote | null = null;
  private previousQuote: Quote | null = null;

  private rotationInterval: ReturnType<typeof setInterval> | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Number of recently displayed quotes that should not
   * be selected again.
   *
   * You have a large quote catalogue, so 50 is a good balance.
   */
  private readonly RECENT_QUOTES_LIMIT = 50;

  /**
   * Stores IDs of recently displayed quotes.
   */
  private recentQuoteIds: number[] = [];

  private constructor() {}

  /**
   * Singleton instance.
   */
  public static getInstance(): QuotesManager {
    if (!QuotesManager.instance) {
      QuotesManager.instance = new QuotesManager();
    }

    return QuotesManager.instance;
  }

  /**
   * Starts the 5-minute quote rotation cycle.
   */
  public startRotation(): void {
    // Prevent multiple intervals from being created.
    if (this.rotationInterval !== null) {
      return;
    }

    // Show the first quote immediately.
    this.rotate();

    // Setup manual quote controls.
    const quoteEl = document.getElementById('currentQuoteText');

    if (quoteEl) {
      quoteEl.style.cursor = 'pointer';
      quoteEl.title =
        'Click for next wisdom | Double-click for previous';

      /**
       * Single click = next quote.
       *
       * 250ms delay allows us to distinguish
       * single click from double click.
       */
      quoteEl.onclick = (): void => {
        if (this.clickTimer !== null) {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
        } else {
          this.clickTimer = setTimeout((): void => {
            this.rotate();
            this.clickTimer = null;
          }, 250);
        }
      };

      /**
       * Double click = previous quote.
       */
      quoteEl.ondblclick = (): void => {
        if (this.clickTimer !== null) {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
        }

        this.goBack();
      };
    }

    /**
     * Automatically rotate every 5 minutes.
     */
    this.rotationInterval = setInterval((): void => {
      this.rotate();
    }, 5 * 60 * 1000);
  }

  /**
   * Picks and displays a new quote.
   */
  public rotate(): void {
    const quote: Quote | null = this.pickQuote();

    if (!quote) {
      return;
    }

    /**
     * Extra protection against displaying
     * the exact same quote twice consecutively.
     */
    if (
      this.currentQuote !== null &&
      quote.id === this.currentQuote.id
    ) {
      return;
    }

    // Move current quote into previous quote.
    this.previousQuote = this.currentQuote;

    // Set new current quote.
    this.currentQuote = quote;

    // Remember quote for anti-repeat protection.
    this.rememberQuote(quote);

    // Update the HUD.
    this.updateHUD();
  }

  /**
   * Returns to the previous quote.
   */
  public goBack(): void {
    if (this.previousQuote === null) {
      return;
    }

    const temp: Quote | null = this.currentQuote;

    this.currentQuote = this.previousQuote;
    this.previousQuote = temp;

    this.updateHUD();
  }

  /**
   * Main quote selection engine.
   *
   * Selection process:
   *
   * 1. Calculate user progress.
   * 2. Determine user's current state.
   * 3. Build relevant quote pool.
   * 4. Remove recently displayed quotes.
   * 5. 15% chance for Gita/Krishna quote.
   * 6. Randomly select a quote.
   */
  private pickQuote(): Quote | null {
    const stats = calculateSummaryStats(
      appState.trackerData
    );

    const currentDay: number =
      appState.trackerData[
        appState.trackerData.length - 1
      ]?.day ?? 1;

    const totalDays: number = appState.totalDays || 365;

    // -----------------------------------------
    // Calculate progress
    // -----------------------------------------

    const expectedPace: number =
      currentDay / totalDays;

    const actualPace: number =
      stats.completedDays / totalDays;

    const diff: number =
      actualPace - expectedPace;

    // -----------------------------------------
    // Determine user's current category
    // -----------------------------------------

    let category:
      | 'behind'
      | 'ahead-high'
      | 'ahead-low'
      | 'steady';

    if (diff < -0.05) {
      category = 'behind';
    } else if (diff > 0.10) {
      category = 'ahead-high';
    } else if (diff > 0) {
      category = 'ahead-low';
    } else {
      category = 'steady';
    }

    // -----------------------------------------
    // Build relevant quote pool
    // -----------------------------------------

    let pool: Quote[];

    switch (category) {
      case 'behind':
        // Direct, practical, resilient, and action-oriented quotes.
        // CODING/TECH are included because technical execution can be
        // especially useful when the user is behind.
        pool = QUOTES.filter(
          (quote: Quote): boolean =>
            quote.category === 'behavior' ||
            quote.category === 'SAVAGE_WISDOM' ||
            quote.category === 'problem-solving' ||
            quote.category === 'CODING' ||
            quote.category === 'TECH'
        );
        break;

      case 'ahead-high':
        // Forward-looking and high-level perspective.
        // AI/TECH naturally fit the future-oriented pool.
        pool = QUOTES.filter(
          (quote: Quote): boolean =>
            quote.category === 'future' ||
            quote.category === 'spiritual' ||
            quote.category === 'life' ||
            quote.category === 'AI' ||
            quote.category === 'TECH'
        );
        break;

      case 'ahead-low':
        // Craft, execution, learning, and deliberate improvement.
        // AI/CODING reinforce technical growth without making the pool
        // purely technical.
        pool = QUOTES.filter(
          (quote: Quote): boolean =>
            quote.category === 'spiritual' ||
            quote.category === 'THE_CRAFT' ||
            quote.category === 'EXECUTION' ||
            quote.category === 'AI' ||
            quote.category === 'CODING'
        );
        break;

      case 'steady':
      default:
        // Broad balanced pool. All three new technical categories are
        // deliberately included so they are actually reachable during
        // normal use.
        pool = QUOTES.filter(
          (quote: Quote): boolean =>
            quote.category === 'THE_CRAFT' ||
            quote.category === 'EXECUTION' ||
            quote.category === 'life' ||
            quote.category === 'spiritual' ||
            quote.category === 'AI' ||
            quote.category === 'CODING' ||
            quote.category === 'TECH'
        );
        break;
    }

    // -----------------------------------------
    // Safety fallback
    // -----------------------------------------

    if (pool.length === 0) {
      pool = [...QUOTES];
    }

    // -----------------------------------------
    // Remove recently displayed quotes
    // -----------------------------------------

    let availablePool: Quote[] = pool.filter(
      (quote: Quote): boolean =>
        !this.recentQuoteIds.includes(quote.id)
    );

    // -----------------------------------------
    // If the category pool is completely exhausted,
    // relax the recent-history restriction.
    // -----------------------------------------

    if (availablePool.length === 0) {
      availablePool = pool.filter(
        (quote: Quote): boolean =>
          quote.id !== this.currentQuote?.id
      );
    }

    // -----------------------------------------
    // 15% Bhagavad Gita / Lord Krishna injection
    // -----------------------------------------

    if (Math.random() < 0.15) {
      const gitaPool: Quote[] = QUOTES.filter(
        (quote: Quote): boolean => {
          const isGitaQuote: boolean =
            quote.a.includes('Bhagavad Gita') ||
            quote.a.includes('Lord Krishna');

          const isRecentlyShown: boolean =
            this.recentQuoteIds.includes(quote.id);

          const isCurrentQuote: boolean =
            quote.id === this.currentQuote?.id;

          return (
            isGitaQuote &&
            !isRecentlyShown &&
            !isCurrentQuote
          );
        }
      );

      if (gitaPool.length > 0) {
        return this.randomQuote(gitaPool);
      }
    }

    // -----------------------------------------
    // Random selection
    // -----------------------------------------

    return this.randomQuote(availablePool);
  }

  /**
   * Selects one random quote from a pool.
   */
  private randomQuote(pool: Quote[]): Quote | null {
    if (pool.length === 0) {
      return null;
    }

    const randomIndex: number =
      Math.floor(Math.random() * pool.length);

    return pool[randomIndex] ?? null;
  }

  /**
   * Adds a quote to recent history.
   *
   * The newest quote is stored first.
   */
  private rememberQuote(quote: Quote): void {
    // Remove the quote if it already exists.
    this.recentQuoteIds =
      this.recentQuoteIds.filter(
        (id: number): boolean => id !== quote.id
      );

    // Add newest quote to the beginning.
    this.recentQuoteIds.unshift(quote.id);

    // Keep only the latest 50.
    this.recentQuoteIds =
      this.recentQuoteIds.slice(
        0,
        this.RECENT_QUOTES_LIMIT
      );
  }

  /**
   * Updates the quote HUD.
   */
  private updateHUD(): void {
    const quoteEl =
      document.getElementById('currentQuoteText');

    if (
      quoteEl === null ||
      this.currentQuote === null
    ) {
      return;
    }

    quoteEl.style.transition =
      'opacity 0.4s ease, transform 0.4s ease';

    quoteEl.style.opacity = '0';
    quoteEl.style.transform =
      'translateY(-10px)';

    setTimeout((): void => {
      if (
        quoteEl === null ||
        this.currentQuote === null
      ) {
        return;
      }

      const authorRaw: string =
        this.currentQuote.a;

      const author: string =
        authorRaw === 'Unknown' ||
        authorRaw === 'Aap Ka Shubh Chintak' ||
        !authorRaw
          ? 'All Tracker'
          : authorRaw;

      quoteEl.innerHTML = `
        "${this.currentQuote.t}"
        <span
          style="
            font-size: 0.35em;
            opacity: 0.35;
            display: block;
            margin-top: 12px;
            font-weight: 500;
            font-family: 'Outfit';
            letter-spacing: 2px;
          "
        >
          — ${author.toUpperCase()}
        </span>
      `;

      quoteEl.style.opacity = '1';
      quoteEl.style.transform =
        'translateY(0)';
    }, 400);
  }

  /**
   * Returns the currently displayed quote.
   *
   * If no quote exists yet, select one immediately.
   */
  public getCurrentQuote(): Quote | null {
    if (this.currentQuote === null) {
      const quote: Quote | null =
        this.pickQuote();

      if (quote !== null) {
        this.currentQuote = quote;
        this.rememberQuote(quote);
      }
    }

    return this.currentQuote;
  }
}

