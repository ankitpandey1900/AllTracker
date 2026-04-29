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
          <article class="hero card" style="border: 1px solid rgba(99, 102, 241, 0.15); margin-bottom: 24px;">
            <div class="row-between hero-top" style="margin-bottom: 20px;">
              <h1 id="heroStatusTitle" style="font-family: 'Outfit'; font-size: 0.9rem; letter-spacing: 2px; color: #818cf8; font-weight: 800; text-transform: uppercase;">MISSION STATUS</h1>
              <div style="display: flex; gap: 12px; align-items: center;">
                <button id="shareQuoteBtn" class="btn-icon" title="Share Wisdom">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button id="shareStatsBtn" class="btn-icon" title="Share Performance">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </button>
                <div class="hero-day-chip" style="background: rgba(129, 140, 248, 0.1); padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(129, 140, 248, 0.2);">
                  <span id="currentDay" style="font-weight: 800; font-size: 0.8rem; color: #818cf8;">DAY 0</span>
                </div>
              </div>
            </div>
            
            <div id="quoteDisplayArea" style="margin-bottom: 32px;">
               <h2 id="currentQuoteText" style="font-family: 'Tektur'; font-size: clamp(1.8rem, 3.5vw, 2.8rem); line-height: 1.1; margin-bottom: 12px; text-transform: uppercase; font-weight: 900; color: #fff;">READY FOR DEPLOYMENT</h2>
               <p class="hero-subtitle" style="color: #94a3b8; font-size: 1rem; opacity: 0.8;">
                 Every hour logged is a step toward dominance.
                 <span id="heroDayMirror" style="display: none;">0</span>
               </p>
            </div>

            <div class="hero-primary-actions" style="display: flex; gap: 16px; margin-bottom: 32px;">
              <button id="mainMissionStartBtn" class="btn btn-primary" style="height: 52px; padding: 0 32px; font-size: 1rem; letter-spacing: 1px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                INITIATE MISSION
              </button>
              <button id="jumpToTodayBtn" class="btn" style="height: 52px; padding: 0 24px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center;">
                GO TO TODAY
              </button>
            </div>

            <div class="hero-level-row" style="opacity: 0.9;">
              <div class="row-between" style="margin-bottom: 6px;">
                <span id="levelBadge" style="font-size: 0.7rem; font-weight: 800; color: #6366f1; letter-spacing: 1px;">XP RANK PROGRESSION</span>
                <span id="heroStartDateMirror" style="font-size: 0.7rem; opacity: 0.5;">Started --</span>
              </div>
              <div class="xp-track" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; flex: 1;">
                <div id="xpFill" class="xp-fill" style="height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); width: 0%;"></div>
              </div>
            </div>
          </article>

          <!-- UTILITY ACTION BAR -->
          <div class="card utility-bar" style="display: flex; gap: 8px; overflow-x: auto; padding: 10px; margin-bottom: 24px; background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.03);">
            <button id="historyBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">HISTORY</button>
            <button id="heatmapViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">HEATMAP</button>
            <button id="analyticsViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">ANALYTICS</button>
            <button id="badgesViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">BADGES</button>
            <button id="weeklyViewBtn" class="btn btn-ghost" style="font-size: 0.75rem; flex: 1;">WEEKLY</button>
          </div>

          <!-- KPI & CATEGORY DISCLOSURE -->
          <div class="row-between section-heading" style="margin-bottom: 16px;">
            <h3 style="font-size: 0.75rem; letter-spacing: 2px; color: #64748b;">MISSION TELEMETRY</h3>
            <button class="btn btn-ghost" id="toggleKpiBtn" style="padding: 4px 12px; font-size: 0.7rem; color: #818cf8; font-weight: 700;">SHOW DETAILS</button>
          </div>
          
          <div id="kpiContainer" class="mobile-collapsible" style="display: none; margin-bottom: 24px;">
            <div class="kpi-metrics-grid items-stretch" style="margin-bottom: 24px;">
              <!-- ROW 1 -->
              <article class="card">
                <div class="label" style="color: #60a5fa;">RANK MOMENTUM</div>
                <div id="rankScoreDisplay" class="big" style="color: #60a5fa;">0</div>
                <div class="meta">VERIFIED OPERATIVE</div>
              </article>
              <article class="card">
                <div class="label" style="color: #22c55e;">SUSTAINABILITY</div>
                <div id="sustainabilityLabel" class="big" style="color: #22c55e;">OPTIMAL</div>
                <div class="meta" id="sustainabilityDesc">Safe pace.</div>
              </article>
              <article class="card">
                <div class="label">ESTIMATED FINISH</div>
                <div class="big" id="estimatedFinishDate">-</div>
                <div class="meta" id="estimatedStartDate">INCEPTION: --</div>
              </article>
              <article class="card">
                <div class="label" style="color: #6366f1;">DAILY INTENSITY</div>
                <div id="avgHoursPerDay" class="big" style="color: #6366f1;">0.0h</div>
                <div class="meta">AVG HOURS / DAY</div>
              </article>
              
              <!-- ROW 2 -->
              <article class="card">
                <div class="label" style="color: #f59e0b;">COMPLETION</div>
                <div id="completionPercent" class="big" style="color: #f59e0b;">0%</div>
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
                <div class="label" style="color: #f59e0b;">ACTIVE STREAK</div>
                <div id="currentStreak" class="big" style="color: #f59e0b;">0</div>
                <div class="meta">DAYS 🔥</div>
                <span id="currentStreakStat" style="display: none;">0</span>
              </article>
              <article class="card">
                <div class="label" style="color: #94a3b8;">ELITE STREAK</div>
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
            <div class="row-between section-heading" style="margin-bottom: 12px;">
              <h3 style="font-size: 0.7rem; letter-spacing: 1.5px; color: #64748b;">CATEGORY PROGRESS</h3>
            </div>
            <div id="categoryCardsContainer">
              <div id="categoryCards" class="grid-top" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;"></div>
            </div>

            <article class="card" style="margin-top: 24px; padding: 20px;">
              <div class="row-between section-heading" style="margin-bottom: 10px;">
                <h3 style="font-size: 0.75rem;">OVERALL ALLOCATION</h3>
                <span id="completionPercentMirror" style="font-size: 0.75rem; color: #818cf8; font-weight: 800;">0%</span>
              </div>
              <div id="allocationBar" class="allocation-bar" style="height: 12px; background: rgba(255,255,255,0.03); border-radius: 0px; overflow: hidden; display: flex;"></div>
              <div id="allocationLegend" class="legend" style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;"></div>
            </article>
          </div>

          <!-- CORE LOG -->
          <div class="row-between section-heading">
            <h3 style="font-size: 0.8rem; letter-spacing: 2px; color: #64748b;">STUDY LOG</h3>
          </div>
          
          <article class="card study-log-controls" style="margin-bottom: 12px; padding: 16px;">
            <div class="row-between" style="gap: 12px; margin-bottom: 16px;">
              <div class="search-shell" style="flex: 1;">
                <input id="tableSearch" class="input search-input" placeholder="Search mission history..." style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);" />
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
        <h2 style="text-align: center; font-family: 'Tektur'; font-style: italic; font-weight: 900; letter-spacing: 3px; color: #fff; margin-bottom: 12px; font-size: 1.2rem; text-transform: uppercase;">WORLD STAGE</h2>
        
        <div style="display: flex; justify-content: center; margin-bottom: 24px;">
           <span class="badge-live-pulse" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 4px 12px; border-radius: 99px; font-size: 0.65rem; font-weight: 900;">
              <span style="display: inline-block; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 8px #ef4444;"></span>
              LIVE
           </span>
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
        <article class="card legacy-telemetry-card" style="background: rgba(13, 17, 23, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; margin-bottom: 32px;">
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
              <!-- Col 1 -->
              <div style="display: flex; flex-direction: column; gap: 24px;">
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; font-size: 1.2rem; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center;">👥</div>
                    <div>
                       <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Total Members</div>
                       <div id="telemetry-total-pilots" style="font-size: 1.3rem; font-weight: 900; color: #fff;">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; font-size: 1.2rem; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center;">⚡</div>
                    <div>
                       <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Global Hours Today</div>
                       <div id="telemetry-global-hours" style="font-size: 1.3rem; font-weight: 900; color: #3b82f6;">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; font-size: 1.2rem; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center;">🛰️</div>
                    <div>
                       <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Platform Milestone</div>
                       <div id="milestone-percentage-text" style="font-size: 1.3rem; font-weight: 900; color: #10b981;">0%</div>
                    </div>
                 </div>
              </div>
              <!-- Col 2 -->
              <div style="display: flex; flex-direction: column; gap: 24px;">
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; font-size: 1.2rem; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center;">🔥</div>
                    <div>
                       <div style="font-size: 0.65rem; color: #22d3ee; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Focusing Now</div>
                       <div id="telemetry-active-now" style="font-size: 1.3rem; font-weight: 900; color: #fff;">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; font-size: 1.2rem; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center;">🏆</div>
                    <div>
                       <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Platform Total Hours</div>
                       <div id="telemetry-global-total" style="font-size: 1.3rem; font-weight: 900; color: #fbbf24;">--</div>
                    </div>
                 </div>
                 <div class="tele-item" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; font-size: 1.2rem; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center;">🏁</div>
                    <div>
                       <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Next Target</div>
                       <div id="milestone-next-target-text" style="font-size: 1.3rem; font-weight: 900; color: #fff;">100 HRS</div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Milestone Timeline -->
           <div class="legacy-milestone-track" style="position: relative; height: 30px; margin: 32px 0 20px;">
              <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 99px; width: 100%; position: absolute; top: 50%; transform: translateY(-50%);"></div>
              <div id="milestone-progress-bar" style="height: 4px; background: linear-gradient(90deg, #10b981, #22d3ee); border-radius: 99px; width: 0%; position: absolute; top: 50%; transform: translateY(-50%); transition: width 1s ease;"></div>
              
              <div id="milestone-timeline-nodes" style="position: absolute; width: 100%; height: 100%; top: 0;">
                 <!-- Dynamic Nodes: 0, 50, 100 -->
              </div>
              <div id="milestone-labels-row" style="position: absolute; width: 100%; top: 35px; display: flex; justify-content: space-between; font-size: 0.5rem; color: #64748b; font-weight: 800;">
                 <!-- Dynamic Labels -->
              </div>
           </div>

           <div style="display: flex; justify-content: space-around; margin-top: 40px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
              <div style="background: rgba(255,255,255,0.03); padding: 4px 16px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.05);">
                 <span style="font-size: 0.6rem; color: #64748b; font-weight: 800; letter-spacing: 1px;">GLOBAL AVG</span>
                 <span id="milestone-avg-hrs" style="font-size: 0.7rem; color: #fff; font-weight: 900; margin-left: 6px;">--</span>
                 <span style="font-size: 0.55rem; color: #64748b; margin-left: 2px;">HRS</span>
              </div>
              <div style="background: rgba(251, 191, 36, 0.05); padding: 4px 16px; border-radius: 99px; border: 1px solid rgba(251, 191, 36, 0.1);">
                 <span style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">MVP</span>
                 <span id="milestone-mvp-text" style="font-size: 0.7rem; color: #fbbf24; font-weight: 900; margin-left: 6px;">@--</span>
                 <span id="milestone-mvp-share" style="font-size: 0.55rem; color: #94a3b8; margin-left: 2px;">(0%)</span>
              </div>
           </div>
        </article>

        <!-- NEW FEATURE: TARGET ACQUIRED (Rivalry System Placeholder) -->
        <div id="rivalry-card-container"></div>

      </div>
    </div>
  </div>
`;

