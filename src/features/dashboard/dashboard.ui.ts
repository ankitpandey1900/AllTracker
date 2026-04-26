/**
 * DASHBOARD COMPONENT (Unified V3)
 * 
 * Layout Hierarchy:
 * - .kpi-metrics-grid: Core 3-column tactical grid (Responsive: 2 Col Tablet, 1 Col Mobile)
 *   Row 1: Study Rank, Sustainability, Estimated Finish
 *   Row 2: Avg / Day, Completion, Total Hours
 *   Row 3: Consistency, Best Streak, Current Streak
 */
export const dashboardView = `
      <div class="dashboard-arena-layout">
        <div class="dashboard-main-content">
          <article class="hero card shadow-2xl" style="position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
            <div class="hero-mesh-bg" style="position: absolute; inset: 0; background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0); background-size: 24px 24px; pointer-events: none;"></div>
            
            <div class="row-between hero-top" style="position: relative; z-index: 2;">
              <h2 id="heroStatusTitle" style="font-family: 'Tektur'; letter-spacing: 1px; font-weight: 800; text-transform: uppercase;">Initializing...</h2>
              <div style="display:flex; gap:10px; align-items:center;">
                <button id="shareQuoteBtn" class="hero-action-pill" title="Share Wisdom">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 6px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  SHARE QUOTE
                </button>
                <button id="shareStatsBtn" class="hero-action-pill stats-pill" title="Share Stats">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 6px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  STATS
                </button>
                <div class="hero-day-chip">
                  <div id="currentDay">DAY 0</div>
                  <small>OF <span class="hero-total-days">-</span></small>
                </div>
              </div>
            </div>
            <p class="hero-subtitle">
              Day <span id="heroDayMirror">0</span> of
              <span class="hero-total-days">-</span> •
              <span id="heroStartDateMirror">Loading...</span>
            </p>
            <div id="heroRoutineNext" class="hero-routine-next" style="display: none;">
              <span class="label">UP NEXT</span>
              <span class="value" id="heroNextRoutineText">--</span>
              <span class="time" id="heroNextRoutineTime">--</span>
            </div>
            <div class="hero-level-row">
              <span id="levelBadge">LVL 0</span>
              <div class="xp-track">
                <div id="xpFill" class="xp-fill"></div>
              </div>
            </div>
          </article>

          <div class="row-between section-heading show-mobile-only" style="display: none; margin-bottom: 10px;">
            <h3>Key Performance Indicators</h3>
            <button class="btn btn-ghost" id="toggleKpiBtn" style="padding: 4px 10px; font-size: 0.7rem;">Show</button>
          </div>
          
            <div id="kpiContainer" class="mobile-collapsible">
              <div class="kpi-metrics-grid items-stretch">
                <!-- Row 1 -->
                <article class="card rank-card momentum-card tactical-accent aura-focus" style="border: 1px solid rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.05);">
                  <div class="label" style="color: #60a5fa; font-weight: 800; letter-spacing: 2px;">RANK MOMENTUM</div>
                  <div id="rankScoreDisplay" class="big" style="color: #60a5fa; font-size: 2.4rem; margin: 5px 0; font-family: 'Tektur';">0</div>
                  <div class="meta" style="font-weight: 700; color: #94a3b8; font-size: 0.8rem; letter-spacing: 1px;">VERIFIED OPERATIVE</div>
                </article>

                <article class="card aura-optimal tactical-accent">
                  <div class="label" style="letter-spacing: 2px; color: #22c55e;">SUSTAINABILITY</div>
                  <div id="sustainabilityLabel" class="big" style="font-family: 'Tektur'; font-size: 2.2rem; color: #22c55e;">OPTIMAL</div>
                  <div class="meta" id="sustainabilityDesc">Mission at peak efficiency.</div>
                </article>

                <article class="card compact tactical-accent aura-focus">
                  <div class="label" style="letter-spacing: 2px;">ESTIMATED FINISH</div>
                  <div class="big" id="estimatedFinishDate" style="font-family: 'Tektur'; font-size: 1.8rem;">-</div>
                  <div class="meta" id="estimatedStartDate" style="font-size: 0.75rem; opacity: 0.6;">INCEPTION: --</div>
                </article>

                <!-- Row 2 -->
                <article class="card tactical-accent">
                  <div class="label" style="letter-spacing: 2px;">DAILY INTENSITY</div>
                  <div class="big" id="avgHoursPerDay" style="font-family: 'Tektur'; font-size: 2.4rem;">0.0</div>
                  <div class="meta">AVG HOURS / DAY</div>
                </article>

                <article class="card tactical-accent aura-elite">
                  <div class="label" style="letter-spacing: 2px; color: #f59e0b;">COMPLETION</div>
                  <div id="completionPercent" class="big" style="font-family: 'Tektur'; font-size: 2.4rem; color: #f59e0b;">0%</div>
                  <div class="meta">
                    <span id="completedDaysCount">0</span> / <span class="hero-total-days">-</span> DAYS
                  </div>
                </article>

                <article class="card tactical-accent">
                  <div class="label" style="letter-spacing: 2px;">TOTAL FOCUS</div>
                  <div id="totalHours" class="big" style="font-family: 'Tektur'; font-size: 2.4rem;">0.0h</div>
                  <div class="meta">
                    <canvas id="velocitySparkline" width="100" height="20" style="width: 100px; height: 20px; opacity: 0.6; margin: 4px 0;"></canvas>
                  </div>
                </article>

                <!-- Row 3 -->
                <article class="card compact tactical-accent aura-caution">
                  <div class="label" style="letter-spacing: 2px; color: #f59e0b;">ACTIVE STREAK</div>
                  <div class="big" id="currentStreakStat" style="font-family: 'Tektur'; font-size: 2.4rem; color: #f59e0b;">0</div>
                  <div class="meta">DAYS 🔥</div>
                </article>

                <article class="card compact tactical-accent">
                  <div class="label" style="letter-spacing: 2px;">ELITE STREAK</div>
                  <div class="big" id="bestStreakStat" style="font-family: 'Tektur'; font-size: 2.4rem;">0</div>
                  <div class="meta">ALL-TIME PEAK</div>
                </article>
              </article>

              <!-- Row 4: Rivalry & Intelligence -->
              <article id="rivalHUD" class="card rival-card" style="display: none; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); overflow: hidden; position: relative;">
                <div class="label" style="color: #ef4444; font-weight: 800; letter-spacing: 1px;">TARGET IDENTIFIED 🎯</div>
                <div id="rivalHandle" class="big" style="color: #ef4444; font-size: 1.8rem; margin: 4px 0;">@--</div>
                <div class="meta" style="margin-top: 2px; font-size: 0.75rem;">
                  RANK <span id="rivalRank">--</span> • <span id="rivalGap" style="color: #fca5a5; font-weight: 900;">-0h</span> TO OVERTAKE
                </div>
                <div class="rival-hud-mesh" style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239, 68, 68, 0.03) 2px, rgba(239, 68, 68, 0.03) 4px); pointer-events: none;"></div>
              </article>
            </div>
          </div>

          <div class="row-between section-heading">
            <h3>Category Progress</h3>
            <button class="btn btn-ghost show-mobile-only" id="toggleCategoryBtn" style="display: none; padding: 4px 10px; font-size: 0.7rem;">Show</button>
          </div>
          <div id="categoryCardsContainer" class="mobile-collapsible">
            <div id="categoryCards" class="grid-top"></div>
          </div>

          <article class="card">
            <div class="row-between section-heading">
              <h3>Overall Progress</h3>
              <span id="completionPercentMirror">0%</span>
            </div>
            <div id="allocationBar" class="allocation-bar"></div>
            <div id="allocationLegend" class="legend"></div>
            <div class="allocation-scale">
              <span>Day 1</span>
              <span>Day <span class="hero-total-days">-</span></span>
            </div>
          </article>
        </div>

        <aside class="dashboard-sidebar">
          <!-- World Stage Card -->
          <article class="card world-stage-card">
            <div class="row-between section-heading" style="margin-bottom: 20px;">
              <h3>World Stage</h3>
              <span class="badge-live-pulse">LIVE</span>
            </div>

            <!-- 📡 GLOBAL TELEMETRY HUD: Premium Tactical Implementation -->
            <div class="tactical-hud-card">
              <div class="telem-grid-v2">
                <div class="telem-node">
                  <div class="telem-icon">👥</div>
                  <div class="telem-content">
                    <div class="telem-label">Total Members</div>
                    <div id="telemetry-total-pilots" class="telem-value">--</div>
                  </div>
                </div>
                <div class="telem-node">
                  <div class="telem-icon status-amber">🔥</div>
                  <div class="telem-content">
                    <div class="telem-label status-amber">Focusing Now</div>
                    <div id="telemetry-active-now" class="telem-value status-amber telem-pulse">--</div>
                  </div>
                </div>
                <div class="telem-node">
                  <div class="telem-icon status-blue">⚡</div>
                  <div class="telem-content">
                  <div class="telem-label status-blue">Global Hours Today</div>
                    <div id="telemetry-global-hours" class="telem-value status-blue">--</div>
                  </div>
                </div>
                <div class="telem-node">
                  <div class="telem-icon status-gold">🏆</div>
                  <div class="telem-content">
                    <div class="telem-label status-gold">Platform Total Hours</div>
                    <div id="telemetry-global-total" class="telem-value status-gold">--</div>
                  </div>
                </div>
                <!-- 5th Node: Platform Milestone -->
                <div class="telem-node">
                  <div class="telem-icon" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);">🛰️</div>
                  <div class="telem-content">
                    <div class="telem-label" style="color: #34d399;">Platform Milestone</div>
                    <div id="milestone-percentage-text" class="telem-value" style="color: #34d399; text-shadow: 0 0 10px rgba(16,185,129,0.3);">--%</div>
                  </div>
                </div>
                <!-- 6th Node: Next Target -->
                <div class="telem-node">
                  <div class="telem-icon" style="background: rgba(255, 255, 255, 0.05);">🏁</div>
                  <div class="telem-content">
                    <div class="telem-label">Next Target</div>
                    <div id="milestone-next-target-text" class="telem-value" style="font-size: 1.1rem; opacity: 0.9;">--</div>
                  </div>
                </div>
              </div>

              <!-- 🌐 MILESTONE TIMELINE SECTION -->
              <div class="hud-milestone-section" style="padding-top: 5px;">
                <div class="milestone-timeline">
                  <div id="milestone-tick-marks" class="milestone-ticks"></div>
                  <div class="milestone-track">
                    <div id="milestone-progress-bar" class="milestone-fill" style="width: 0%;"></div>
                    <div id="milestone-timeline-nodes" class="milestone-nodes-layer"></div>
                  </div>
                  <div id="milestone-labels-row" class="milestone-labels"></div>
                </div>

                <div class="milestone-footer">
                  <div class="milestone-chip">
                    <span class="chip-label">GLOBAL AVG</span>
                    <span class="chip-value" id="milestone-avg-hrs">--</span>
                    <span class="chip-unit">hrs</span>
                  </div>
                  <div class="milestone-chip chip-mvp">
                    <span class="chip-label">MVP</span>
                    <span class="chip-value chip-gold" id="milestone-mvp-text">@--</span>
                    <span class="chip-unit" id="milestone-mvp-share">(0%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div id="leaderboardPodium" class="leaderboard-podium" style="display: none;"></div>
            <div id="leaderboardList" class="leaderboard-list">
              <div class="leaderboard-placeholder">Connecting to World Stage...</div>
            </div>
            <div class="arena-footer" style="margin-top: auto; padding-top: 20px; text-align: center;">
              <p style="font-size: 0.72rem; color: var(--text-secondary); opacity: 0.5;">
                Live Real-time Sync (30s Fallback)
              </p>
            </div>
          </article>
        </aside>
      </div>

      <div class="card study-log-controls">
        <div class="study-log-top">
          <div class="row-between section-heading">
            <h3>Study Log</h3>
            <div class="study-log-pills">
              <label class="pill"><input id="filterWithHours" type="checkbox" /> With
                Hours</label>
              <label class="pill"><input id="filterCompleted" type="checkbox" />
                Completed</label>
            </div>
          </div>
          <div class="study-log-actions">
            <button id="jumpToTodayBtn" class="btn">Go to Today</button>
            <button id="historyBtn" class="btn">History</button>
            <button id="heatmapViewBtn" class="btn">Heatmap</button>
            <button id="analyticsViewBtn" class="btn">Analytics</button>
            <button id="badgesViewBtn" class="btn">Badges</button>
            <button id="weeklyViewBtn" class="btn">Weekly Summary</button>
            <button id="exportAllDataBtn" class="btn btn-primary">
              Export All
            </button>
            <button id="importBtn" class="btn">Import</button>
            <button id="exportCsvBtn" class="btn">Export CSV</button>
            <button id="resetBtn" class="btn btn-danger">Reset</button>
          </div>
        </div>
        <div class="study-log-search-row">
          <div class="search-shell">
            <span class="search-icon">⌕</span>
            <input id="tableSearch" class="input search-input"
              placeholder="Search by day, date, topic, or project..." />
          </div>
        </div>
      </div>

      <article class="card table-card overflow-hidden study-log-table">
        <div class="responsive-table-container">
          <table id="trackerTable">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Col 1</th>
                <th>Col 2</th>
                <th>Col 3</th>
                <th>Col 4</th>
                <th id="problemsSolvedHeader">Problems Solved</th>
                <th>Topics</th>
                <th>Project Work</th>
                <th>Done</th>
              </tr>
            </thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </article>


`;
