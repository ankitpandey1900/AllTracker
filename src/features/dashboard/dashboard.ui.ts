/**
 * DASHBOARD COMPONENT (Unified V3.2 - Complete & Clean)
 * 
 * Restores all core features (Heatmap, History, Categories) 
 * while maintaining the high-clarity professional design.
 */
export const dashboardView = `
      <div class="dashboard-arena-layout">
        <div class="dashboard-main-content">
          <!-- PRIMARY MISSION CONTROL -->
          <article class="hero card" style="margin-bottom: 24px;">
            <div class="row-between hero-top" style="margin-bottom: 20px;">
              <h1 id="heroStatusTitle" style="font-family: 'Outfit'; font-size: 0.9rem; letter-spacing: 2px; color: var(--accent-blue); font-weight: 800; text-transform: uppercase;">MISSION STATUS</h1>
              <div style="display: flex; gap: 12px; align-items: center;">
                <button id="shareQuoteBtn" class="btn-icon" title="Share Wisdom">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button id="shareStatsBtn" class="btn-icon" title="Share Performance">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </button>
                <div class="hero-day-chip" style="background: var(--bg-tertiary); padding: 6px 14px; border-radius: 99px; border: 1px solid var(--border);">
                  <span id="currentDay" style="font-weight: 800; font-size: 0.8rem; color: var(--accent-blue);">DAY 0</span>
                </div>
              </div>
            </div>
            
            <div id="quoteDisplayArea" style="margin-bottom: 32px;">
               <h2 id="currentQuoteText" style="font-family: 'Tektur'; font-size: clamp(1.8rem, 3.5vw, 2.8rem); line-height: 1.1; margin-bottom: 12px; text-transform: uppercase; font-weight: 900; color: var(--text-primary);">READY FOR DEPLOYMENT</h2>
               <p class="hero-subtitle" style="color: var(--text-secondary); font-size: 1rem; opacity: 0.8;">
                 Every hour logged is a step toward dominance.
                 <span id="heroDayMirror" style="display: none;">0</span>
               </p>
            </div>

            <div class="hero-primary-actions" style="display: flex; gap: 16px; margin-bottom: 32px;">
              <button id="mainMissionStartBtn" class="btn btn-primary" style="height: 52px; padding: 0 32px; font-size: 1rem; letter-spacing: 1px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                INITIATE MISSION
              </button>
              <button id="jumpToTodayBtn" class="btn" style="height: 52px; padding: 0 24px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;">
                GO TO TODAY
              </button>
            </div>

            <div class="hero-level-row" style="opacity: 0.9;">
              <div class="row-between" style="margin-bottom: 6px;">
                <span id="levelBadge" style="font-size: 0.7rem; font-weight: 800; color: var(--accent-blue); letter-spacing: 1px;">XP RANK PROGRESSION</span>
                <span id="heroStartDateMirror" style="font-size: 0.7rem; opacity: 0.5;">Started --</span>
              </div>
              <div class="xp-track" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; flex: 1;">
                <div id="xpFill" class="xp-fill" style="height: 100%; background: var(--accent-purple); width: 0%;"></div>
              </div>
            </div>
          </article>

          <!-- UTILITY ACTION BAR -->
          <div class="card utility-bar" style="display: flex; gap: 8px; overflow-x: auto; padding: 10px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.03);">
            <button id="historyBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">HISTORY</button>
            <button id="heatmapViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">HEATMAP</button>
            <button id="analyticsViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">ANALYTICS</button>
            <button id="badgesViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">BADGES</button>
            <button id="weeklyViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">WEEKLY</button>
          </div>

          <!-- KPI & CATEGORY DISCLOSURE -->
          <div class="row-between section-heading" style="margin-bottom: 16px;">
            <h3 style="font-size: 0.75rem; letter-spacing: 2px; color: var(--text-muted);">MISSION TELEMETRY</h3>
            <button class="btn btn-ghost" id="toggleKpiBtn" style="padding: 4px 12px; font-size: 0.7rem; color: var(--accent-blue); font-weight: 700;">SHOW DETAILS</button>
          </div>
          
          <div id="kpiContainer" class="mobile-collapsible" style="display: none; margin-bottom: 24px;">
            <div class="kpi-metrics-grid items-stretch" style="margin-bottom: 24px;">
              <!-- ROW 1 -->
              <article class="card">
                <div class="label" style="color: var(--info);">RANK MOMENTUM</div>
                <div id="rankScoreDisplay" class="big" style="color: var(--info);">0</div>
                <div class="meta">VERIFIED OPERATIVE</div>
              </article>
              <article class="card">
                <div class="label" style="color: var(--success);">SUSTAINABILITY</div>
                <div id="sustainabilityLabel" class="big" style="color: var(--success);">OPTIMAL</div>
                <div class="meta" id="sustainabilityDesc">Safe pace.</div>
              </article>
              <article class="card">
                <div class="label">ESTIMATED FINISH</div>
                <div class="big" id="estimatedFinishDate">-</div>
                <div class="meta" id="estimatedStartDate">INCEPTION: --</div>
              </article>
              <article class="card">
                <div class="label" style="color: var(--accent-blue);">DAILY INTENSITY</div>
                <div id="avgHoursPerDay" class="big" style="color: var(--accent-blue);">0.0h</div>
                <div class="meta">AVG HOURS / DAY</div>
              </article>
              
              <!-- ROW 2 -->
              <article class="card">
                <div class="label" style="color: var(--warning);">COMPLETION</div>
                <div id="completionPercent" class="big" style="color: var(--warning);">0%</div>
                <div class="meta">
                  <span id="completedDaysCount">0</span> / <span class="hero-total-days">-</span> DAYS
                </div>
              </article>
              <article class="card">
                <div class="label">TOTAL FOCUS</div>
                <div id="totalHours" class="big">0.0h</div>
                <div class="meta">
                  <canvas id="velocitySparkline" width="100" height="20" style="width: 100px; height: 20px; opacity: 0.3;"></canvas>
                </div>
              </article>
              <article class="card">
                <div class="label" style="color: var(--warning);">ACTIVE STREAK</div>
                <div id="currentStreak" class="big" style="color: var(--warning);">0</div>
                <div class="meta">DAYS 🔥</div>
                <span id="currentStreakStat" style="display: none;">0</span>
              </article>
              <article class="card">
                <div class="label" style="color: var(--text-secondary);">ELITE STREAK</div>
                <div id="bestStreakStat" class="big" style="color: #cbd5e1;">0</div>
                <div class="meta">ALL-TIME PEAK</div>
              </article>

              <!-- FULL WIDTH RIVALRY ROW -->
              <article class="card" id="rivalHUD" style="display: none; border-radius: 4px;">
                <div class="label">TARGET IDENTIFIED 🎯</div>
                <div id="rivalHandle" class="big" style="font-size: 1.8rem;">@USER</div>
                <div class="meta">SYNCING...</div>
              </article>
            </div>

            <!-- Category Progress Restoration -->
            <div class="row-between section-heading" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <h3 style="font-size: 0.7rem; letter-spacing: 1.5px; color: var(--text-muted); margin: 0;">CATEGORY PROGRESS</h3>
              <select id="phaseFilter" style="border: 1px solid rgba(108, 135, 255, 0.2); color: #8e9fc6; font-size: 0.6rem; padding: 4px 12px; border-radius: 4px; cursor: pointer; text-transform: uppercase; outline: none; transition: border-color 0.2s;">
                <option value="current">Current Phase</option>
                <option value="overall">Overall</option>
              </select>
            </div>
            <div id="categoryCardsContainer">
              <div id="categoryCards" class="grid-top" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;"></div>
            </div>

              <div class="mission-header-centered">
                <h2 class="sub-heading-tactical">OVERALL ALLOCATION</h2>
                <div class="mission-total-badge">
                  <span class="mission-total-label">TOTAL MISSION</span>
                  <span id="allocationTotal" class="mission-total-value">0%</span>
                </div>
              </div>
              <div id="allocationBar" class="allocation-bar"></div>
              <div id="allocationLegend" class="legend-flex"></div>
            </article>
          </div>

          <!-- CORE LOG -->
          <div class="row-between section-heading">
            <h3 style="font-size: 0.8rem; letter-spacing: 2px; color: var(--text-muted);">STUDY LOG</h3>
          </div>
          
          <article class="card study-log-controls" style="margin-bottom: 12px; padding: 16px;">
            <div class="row-between" style="gap: 12px; margin-bottom: 16px;">
              <div class="search-shell" style="flex: 1;">
                <input id="tableSearch" class="input search-input" placeholder="Search mission history..." style="border: 1px solid rgba(255,255,255,0.05);" />
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="importBtn" class="btn btn-ghost" style="font-size: 0.65rem;">IMPORT</button>
                <button id="exportCsvBtn" class="btn btn-ghost" style="font-size: 0.65rem;">CSV</button>
                <button id="exportAllDataBtn" class="btn btn-primary" style="font-size: 0.65rem; padding: 6px 12px;">EXPORT ALL</button>
              </div>
            </div>
            <div style="display: flex; gap: 15px; font-size: 0.75rem; opacity: 0.7;">
               <label class="row-center" style="gap: 6px; cursor: pointer;"><input id="filterWithHours" type="checkbox" /> With Hours</label>
               <label class="row-center" style="gap: 6px; cursor: pointer;"><input id="filterCompleted" type="checkbox" /> Completed</label>
               <button id="resetBtn" style="margin-left: auto; color: #ef4444; background: none; border: none; font-size: 0.65rem; cursor: pointer; letter-spacing: 1px;">SYSTEM RESET</button>
            </div>
          </article>

          <article class="card table-card overflow-hidden" style="padding: 0;">
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
                    <th>Solved</th>
                    <th>Topics</th>
                    <th>Project</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="tableBody"></tbody>
              </table>
            </div>
          </article>
        </div>
      </div>
`;

export const worldStageView = `
  <div class="world-stage-arena" style="width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px 80px 16px; box-sizing: border-box;">

    <div class="arena-desktop-grid">
      
      <!-- MAIN COLUMN: Rankings -->
      <div class="arena-main-col">

        <!-- TITLE & LIVE BADGE -->
        <h2 class="lb-font-special" style="text-align: center; font-style: italic; font-weight: 900; letter-spacing: 3px; color: var(--text-primary); margin-bottom: 12px; font-size: 1.2rem; text-transform: uppercase;">WORLD STAGE</h2>
        
        <div style="display: flex; justify-content: center; margin-bottom: 24px; flex-direction: column; align-items: center; gap: 16px;">
           <span class="badge-live-pulse" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 4px 12px; border-radius: 99px; font-size: 0.65rem; font-weight: 900;">
              <span style="display: inline-block; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 8px #ef4444;"></span>
              LIVE
           </span>

           <div class="lb-timeframe-selector">
             <button class="lb-timeframe-tab" data-timeframe="today">TODAY</button>
             <button class="lb-timeframe-tab active" data-timeframe="weekly">7 DAYS</button>
             <button class="lb-timeframe-tab" data-timeframe="monthly">30 DAYS</button>
             <button class="lb-timeframe-tab" data-timeframe="all-time">ALL-TIME</button>
           </div>
        </div>

        <!-- LEADERBOARD PODIUM -->
        <div id="leaderboardPodium" class="leaderboard-podium" style="display: none;"></div>

        <!-- Leaderboard List -->
        <div id="leaderboardList" class="leaderboard-list">
            <!-- Rows will be injected here -->
        </div>
      </div>

      <!-- SIDEBAR COLUMN: Intelligence & Telemetry -->
      <div class="arena-sidebar-col">
        <article class="card legacy-telemetry-card" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; margin-bottom: 32px;">
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
              <!-- Col 1 -->
              <div style="display: flex; flex-direction: column; gap: 24px;">
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; background: rgba(167,139,250,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                    <div>
                       <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Total Members</div>
                       <div id="telemetry-total-pilots" style="font-size: 1.3rem; font-weight: 900; color: var(--text-primary);">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; background: rgba(96,165,250,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                    <div>
                       <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Global Hours Today</div>
                       <div id="telemetry-global-hours" style="font-size: 1.3rem; font-weight: 900; color: #3b82f6;">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; background: rgba(192,132,252,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg></div>
                    <div>
                       <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Platform Milestone</div>
                       <div id="milestone-percentage-text" style="font-size: 1.3rem; font-weight: 900; color: #8b5cf6;">0%</div>
                    </div>
                 </div>
              </div>
              <!-- Col 2 -->
              <div style="display: flex; flex-direction: column; gap: 24px;">
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; background: rgba(248,113,113,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg></div>
                    <div>
                       <div style="font-size: 0.65rem; color: #22d3ee; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Focusing Now</div>
                       <div id="telemetry-active-now" style="font-size: 1.3rem; font-weight: 900; color: var(--text-primary);">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; background: rgba(251,191,36,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
                    <div>
                       <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Platform Total Hours</div>
                       <div id="telemetry-global-total" style="font-size: 1.3rem; font-weight: 900; color: #fbbf24; white-space: nowrap;">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; background: rgba(226,232,240,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>
                    <div>
                       <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Next Target</div>
                       <div id="milestone-next-target-text" style="font-size: 1.3rem; font-weight: 900; color: var(--text-primary);">100 HRS</div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Milestone Timeline -->
           <div class="legacy-milestone-track" style="position: relative; height: 30px; margin: 32px 0 20px;">
              <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 99px; width: 100%; position: absolute; top: 50%; transform: translateY(-50%);"></div>
              <div id="milestone-progress-bar" style="height: 4px; background: var(--accent-purple); border-radius: 99px; width: 0%; position: absolute; top: 50%; transform: translateY(-50%); transition: width 1s ease;"></div>
              
              <div id="milestone-timeline-nodes" style="position: absolute; width: 100%; height: 100%; top: 0;">
                 <!-- Dynamic Nodes: 0, 50, 100 -->
              </div>
              <div id="milestone-labels-row" style="position: absolute; width: 100%; top: 35px; display: flex; justify-content: space-between; font-size: 0.5rem; color: var(--text-muted); font-weight: 800;">
                 <!-- Dynamic Labels -->
              </div>
           </div>

            <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
               <!-- Daily Average Widget -->
               <div style="flex: 1; display: flex; flex-direction: column; background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                     <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800; letter-spacing: 1px;">DAILY AVG</span>
                  </div>
                  <div style="display: flex; align-items: baseline; gap: 4px;">
                     <span id="milestone-avg-hrs" style="font-size: 1.4rem; color: var(--text-primary); font-weight: 900; font-family: var(--font-heading, inherit);">--</span>
                     <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 700;">HRS/DAY</span>
                  </div>
               </div>
               
               <!-- MVP Widget -->
               <div style="flex: 1; display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.02) 100%); padding: 16px; border-radius: 16px; border: 1px solid rgba(251, 191, 36, 0.15); position: relative; overflow: hidden; box-shadow: inset 0 1px 0 rgba(251, 191, 36, 0.1);">
                  <div style="position: absolute; top: -10px; right: -10px; opacity: 0.05; pointer-events: none;">
                     <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; position: relative;">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                     <span style="font-size: 0.65rem; color: #fbbf24; font-weight: 800; letter-spacing: 1px;">MVP</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px; position: relative; width: 100%;">
                     <span id="milestone-mvp-text" style="font-size: 1.1rem; color: #fbbf24; font-weight: 900; font-family: var(--font-heading, inherit); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">@--</span>
                     <span id="milestone-mvp-share" style="background: rgba(251, 191, 36, 0.15); padding: 2px 6px; border-radius: 6px; font-size: 0.6rem; color: #fbbf24; font-weight: 800; flex-shrink: 0;">0%</span>
                  </div>
               </div>
            </div>
        </article>

        <!-- NEW FEATURE: TARGET ACQUIRED (Rivalry System Placeholder) -->
        <div id="rivalry-card-container"></div>

      </div>
    </div>
  </div>
`;

