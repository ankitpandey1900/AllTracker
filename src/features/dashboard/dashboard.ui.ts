export const dashboardView = `
      <div class="dashboard-arena-layout">
        <div class="dashboard-main-content">
          <article class="hero card shadow-2xl">
            <div class="row-between hero-top">
              <h1 id="heroStatusTitle">Initializing...</h1>
              <div style="display:flex; gap:12px; align-items:center;">
                <button id="shareStatsBtn" class="btn btn-primary" style="font-size: 0.65rem; font-weight:800; padding: 4px 10px; border-radius: 6px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa;">Share Stats 🚀</button>
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
            <div class="grid-top kpi-grid items-stretch">
              <article class="card">
                <div class="label">Completion</div>
                <div id="completionPercent" class="big">0%</div>
                <div class="meta">
                  <span id="completedDaysCount">0</span> / <span class="hero-total-days">-</span> days
                </div>
              </article>
              <article class="card">
                <div class="label">Total Hours</div>
                <div id="totalHours" class="big">0.0h</div>
                <div class="meta">hours studied</div>
              </article>
              <article class="card">
                <div class="label">Avg / Day</div>
                <div class="big" id="avgHoursPerDay">0</div>
                <div class="meta">hrs/day avg</div>
              </article>
              <article class="card rank-card">
                <div class="label">Study Rank</div>
                <div id="studyRank" class="big">IRON</div>
                <div class="rank-tier-row"><span id="rankTierText">IV</span></div>
                <div class="meta">
                  World rank: <span id="worldRankPos">#40,000,000</span>
                </div>
                <div class="xp-track">
                  <div id="rankXPBar" class="rank-fill"></div>
                </div>
              </article>
            </div>

            <div class="grid-top stats-strip" style="margin-top: 16px;">
              <article class="card compact">
                <div class="label">Consistency</div>
                <div class="big" id="consistencyStat">0%</div>
                <div class="meta">last 7 days</div>
              </article>
              <article class="card compact">
                <div class="label">Current Streak</div>
                <div id="currentStreak" class="big">0 DAYS</div>
                <div class="meta">days in a row</div>
              </article>
              <article class="card compact">
                <div class="label">Best Streak</div>
                <div class="big" id="bestStreakStat">0</div>
                <div class="meta">days (all time)</div>
              </article>
              <article class="card compact">
                <div class="label">Estimated Finish</div>
                <div class="big" id="estimatedFinishDate">-</div>
                <div class="meta" id="startDateLabel">Start: -</div>
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
          <article class="card world-stage-card overflow-hidden">
            <div class="row-between section-heading" style="margin-bottom: 20px;">
              <h3>World Stage</h3>
              <span class="badge-live-pulse">LIVE</span>
            </div>
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
            <button id="quickEntryBtn" class="btn">Quick Entry</button>
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
