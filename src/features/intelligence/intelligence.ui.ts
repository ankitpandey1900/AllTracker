import { getTacticalBriefing, getTacticalBriefingString } from './intelligence.service';
import { getMaamuResponse } from '@/services/groq.service';
import { appState } from '@/state/app-state';
import { MentorMessage } from '@/types/tracker.types';
import { saveSettingsToStorage } from '@/services/data-bridge';

/** Micro-markdown parser for chat rendering */
function formatMaamuText(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^(\s*)[*-]\s+(.*)$/gm, '<li style="margin-left: 1.5rem; list-style-type: disc;">$2</li>');
  
  html = html.replace(/\n/g, '<br/>');
  return html;
}

/**
 * Renders the Phase 3 'MAAMU' Mentor Interface.
 * Focus: Professional Minimalism (Gemini/Claude style) with integrated guide and config.
 */
export function renderIntelligenceBriefing(): void {
  const container = document.getElementById('intelligencePane');
  if (!container) return;

  const briefing = getTacticalBriefing();

  container.innerHTML = `
    <div class="mentor-v3-container">
      <!-- Minimalist Header -->
      <div class="mentor-v2-header">
        <div class="mentor-status-pulse ${briefing.taskHealth.status.toLowerCase()}"></div>
        <div class="mentor-title-group">
          <h1 class="mentor-display-name">THE MAAMU <span class="persona-tag">${briefing.mentorPersona}</span></h1>
          <p class="mentor-subtitle">High-Fidelity Guidance & Continuity Monitoring</p>
        </div>
      </div>

      <div class="mentor-v3-content-grid">
        <!-- Left Column: Metrics & Missions -->
        <div class="mentor-stats-sidebar">
          <div class="sidebar-section">
            <div class="sidebar-header">CRITICAL METRICS</div>
            <div class="mentor-metrics-list">
              <div class="mini-metric">
                <label>SUSTAINABILITY</label>
                <div class="val">${briefing.sustainabilityScore}%</div>
                <div class="bar-bg"><div class="bar-fill" style="width: ${briefing.sustainabilityScore}%; background: ${getScoreColor(briefing.sustainabilityScore)}"></div></div>
              </div>
              <div class="mini-metric">
                <label>DISCIPLINE TREND</label>
                <div class="val">${briefing.disciplineTrend}%</div>
                <div class="bar-bg"><div class="bar-fill" style="width: ${briefing.disciplineTrend}%; background: ${getScoreColor(briefing.disciplineTrend)}"></div></div>
              </div>
              <div class="mini-metric">
                <label>TASK INTEGRITY</label>
                <div class="val">${Math.max(0, 100 - briefing.taskHealth.debtScore)}%</div>
                <div class="bar-bg"><div class="bar-fill" style="width: ${Math.max(0, 100 - briefing.taskHealth.debtScore)}%; background: ${getScoreColor(100 - briefing.taskHealth.debtScore)}"></div></div>
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-header">PRIORITY MISSIONS</div>
            <div class="mission-list">
              ${briefing.actionPlan.map(action => `
                <div class="mission-card ${action.priority.toLowerCase()}">
                  <div class="mission-pri">${action.priority}</div>
                  <div class="mission-content">
                    <div class="mission-task">${action.task}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="vulnerability-card">
              <label>WEAKNESS DETECTED</label>
              <p>Performance drops on <strong>${briefing.vulnerableDay}s</strong>.</p>
          </div>
        </div>

        <!-- Middle Column: Chat -->
        <div class="mentor-main-chat" id="mentorMainChat">
          <div class="chat-header">
            <span>MAAMU DIALOGUE</span>
            <div class="beast-mode-header-toggle">
              <span class="beast-label">BEAST MODE</span>
              <label class="tactical-switch">
                <input type="checkbox" id="beastModeToggle" ${appState.settings.beastMode ? 'checked' : ''}>
                <span class="tactical-slider"></span>
              </label>
            </div>
          </div>
          <div id="mentorChatOutput" class="chat-history">
            <!-- History will be injected here -->
          </div>
          <div class="chat-input-wrap">
            <input type="text" id="mentorQueryInput" placeholder="Enter tactical inquiry (Hinglish supported)..." spellcheck="false" autocomplete="off">
            <button id="sendMentorQuery">SEND</button>
          </div>
        </div>

        <!-- Right Column: Guide & Config -->
        <div class="mentor-config-sidebar">
          <div class="sidebar-section">
             <div class="sidebar-header">AI CONFIGURATION</div>
             <div class="config-card">
                <p class="config-hint">Get your key from <a href="https://console.groq.com" target="_blank">console.groq.com</a></p>
                <div class="input-group">
                   <label>GROQ API KEY</label>
                   <input type="password" id="maamuApiKeyInput" value="${appState.settings.groqApiKey || ''}" placeholder="gsk_...">
                   <button id="saveMaamuApiKey" class="btn-micro">SAVE KEY</button>
                </div>
             </div>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-header">MAAMU GUIDE</div>
            <div class="guide-scroll">
              <div class="guide-item">
                <div class="guide-title">1. THE COMMANDER TONE</div>
                <p>Maamu speaks Hindi, English, and Hinglish. It is brutally honest—if you are lazy, it will tell you. No sugarcoating.</p>
              </div>
              <div class="guide-item">
                <div class="guide-title">2. ELITE PROMPTING</div>
                <ul class="prompt-list">
                  <li>"Ajj mera padhne ka mann nahi kar raha, reality check de."</li>
                  <li>"Analyze my sleep sustainability data."</li>
                  <li>"Based on my tasks, what should I ignore today?"</li>
                </ul>
              </div>
              <div class="guide-item">
                <div class="guide-title">3. SYNCED INTELLIGENCE</div>
                <p>Maamu sees your actual tracking data from the last 7 days. You don't need to explain your stats—it already knows.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render History
  renderChatHistory();
  setupMentorListeners();
}

function getScoreColor(score: number): string {
  if (score > 80) return '#10b981'; // Green
  if (score > 50) return '#fbbf24'; // Yellow
  return '#ef4444'; // Red
}

function renderChatHistory(): void {
  const chatOutput = document.getElementById('mentorChatOutput');
  if (!chatOutput) return;

  const history = appState.settings.mentorHistory || [];
  
  if (history.length === 0) {
    chatOutput.innerHTML = `
      <div class="chat-line system">Initial sync complete. Tactical core online.</div>
      <div class="chat-line mentor">Welcome to the Arena. I am THE MAAMU. I see all your metrics. What constitutes your struggle today? (English/Hindi/Hinglish sub.)</div>
    `;
    return;
  }

  chatOutput.innerHTML = history.map(msg => `
    <div class="chat-line ${msg.role === 'user' ? 'user' : 'mentor'}">${formatMaamuText(msg.content)}</div>
  `).join('');
  
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function setupMentorListeners(): void {
  const input = document.getElementById('mentorQueryInput') as HTMLInputElement;
  const btn = document.getElementById('sendMentorQuery');
  const chatOutput = document.getElementById('mentorChatOutput');
  const apiKeyInput = document.getElementById('maamuApiKeyInput') as HTMLInputElement;
  const saveApiKeyBtn = document.getElementById('saveMaamuApiKey');

  if (!input || !btn || !chatOutput || !apiKeyInput || !saveApiKeyBtn) return;

  // Save API Key
  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    appState.settings.groqApiKey = key;
    saveSettingsToStorage(appState.settings);
    alert('Maamu API Key Saved. Core intelligence synchronized.');
  });

  const handleQuery = async () => {
    const query = input.value.trim();
    if (!query) return;

    // Add user query to UI
    const userLine = document.createElement('div');
    userLine.className = 'chat-line user';
    userLine.innerHTML = formatMaamuText(query);
    chatOutput.appendChild(userLine);
    input.value = '';
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // Add Thinking...
    const loadingLine = document.createElement('div');
    loadingLine.className = 'chat-line system thinking';
    loadingLine.textContent = 'Processing neural patterns...';
    chatOutput.appendChild(loadingLine);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // Get real AI response
    try {
        const tacticalBrief = getTacticalBriefingString();
        const response = await getMaamuResponse(query, tacticalBrief);

        // Remove thinking, add response
        loadingLine.remove();
        const responseLine = document.createElement('div');
        responseLine.className = 'chat-line mentor';
        responseLine.innerHTML = formatMaamuText(response);
        chatOutput.appendChild(responseLine);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    } catch (err) {
        loadingLine.textContent = "Error communicating with Maamu AI Core. Verify API Key.";
        loadingLine.classList.remove('thinking');
    }
  };

  btn.addEventListener('click', handleQuery);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuery();
  });

  // Beast Mode Toggle
  const beastToggle = document.getElementById('beastModeToggle') as HTMLInputElement;
  const chatContainer = document.getElementById('mentorMainChat');
  
  if (beastToggle) {
    // Initial class set
    if (appState.settings.beastMode) chatContainer?.classList.add('beast-mode-active');

    beastToggle.addEventListener('change', async () => {
      const isActive = beastToggle.checked;
      appState.settings.beastMode = isActive;
      
      // Visual feedback
      if (isActive) {
        chatContainer?.classList.add('beast-mode-active');
        injectSystemMessage("CORE ENGAGED: BEAST MODE ACTIVE. NO MERCY.");
      } else {
        chatContainer?.classList.remove('beast-mode-active');
        injectSystemMessage("SYSTEM: Beast Mode de-activated. Normalizing core.");
      }

      // Persist
      const { saveSettingsToStorage } = await import('@/services/data-bridge');
      saveSettingsToStorage(appState.settings);
    });
  }
}

function injectSystemMessage(content: string): void {
  if (!appState.settings.mentorHistory) appState.settings.mentorHistory = [];
  
  appState.settings.mentorHistory.push({
    role: 'system',
    content,
    timestamp: Date.now()
  });
  
  renderChatHistory();
}
