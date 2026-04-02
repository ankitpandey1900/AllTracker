import { appState } from '@/state/app-state';
import { MentorMessage } from '@/types/tracker.types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function getMaamuResponse(userQuery: string, tacticalBrief: string): Promise<string> {
  const apiKey = appState.settings.groqApiKey;
  
  if (!apiKey) {
    return "API Key Missing: Please configure your Groq API Key in the Settings menu to enable my generative intelligence.";
  }

  // Parse briefing to check for Beast Mode
  let isBeastMode = false;
  try {
    const briefObj = JSON.parse(tacticalBrief);
    isBeastMode = !!briefObj.beastModeActive;
  } catch (e) {}

  const beastModeDirective = isBeastMode 
    ? `### BEAST MODE ACTIVE: THE ARENA IS RED. NO MERCY. 
       1. Use 2x more aggressive, harsh 'tough-love' Hinglish.
       2. ZERO filler sentences. Zero empathy for excuses.
       3. Focus strictly on failures, laziness, and missed targets.
       4. You are not a friend; you are a RUTHLESS COMMANDER.
       5. If the user is failing, destroy their excuses with logic and sass.`
    : `1. NO SUGARCOATING: Speak the harsh, absolute truth. Be unapologetic and efficient.
       2. REAL-WORLD: Give best-case scenarios and real-world tough advice.`;

  const chatHistory = appState.settings.mentorHistory || [];
  
  // Extract handle for specific personalization
  let userHandle = "@Participant";
  try {
    const brief = JSON.parse(tacticalBrief);
    userHandle = brief.identity?.handle || userHandle;
  } catch (e) {}

  // Construct Messages
  const messages = [
    {
      role: 'system',
      content: `You are THE MAAMU, the ultimate, elite mentor and harsh truth-teller (inspired by the ruthless efficiency of Elon Musk and the unfiltered sass of Grok).
      Your core user is an ambitious Indian student/professional named ${userHandle}. YOU MUST address them as ${userHandle} in most responses, especially during roasts or important advice.
      YOU MUST understand and flawlessly process English, Hindi, and Hinglish. Reply in the EXACT same language blend the user uses.
      
      CORE DIRECTIVES:
      ${beastModeDirective}
      3. DATA-DRIVEN: Look at the CURRENT TACTICAL BRIEF completely. Call out their laziness if their 7-day habits are terrible.
      4. STRATEGIC CAREER ADVISOR: Analyze "bookmarks" (resources they save) and "unclearedTasks" (their backlog) to help them build a long-term roadmap. Suggest what topics they should prioritize for high-end career growth.
      5. ARENA SPECIFIC: Use their "rank" and "world position" to roast them if they are slacking or praise them if they are truly elite.
      6. PATTERN ANALYSIS: Look at "recentSessionNotes" and "recentHabits_Last7Days". Call out their specific repeating mistakes or excuses by name.
      7. CONCISE & PUNCHY: No overwhelming walls of text. Be clear, crisp, and commanding.
      
      CURRENT TACTICAL BRIEF (REAL-TIME TRACKER DATA):
      ${tacticalBrief}
      
      Analyze their data, detect their failure patterns, solve their precise problem, and keep them accountable like an elite mentor.`
    },
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuery }
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq API Error:', err);
      return `Error: ${err.error?.message || 'Failed to connect to Maamu AI Core.'}`;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "I'm having trouble formulating a response right now.";
    
    // Save to history
    saveToMentorHistory('user', userQuery);
    saveToMentorHistory('assistant', content);
    
    return content;
  } catch (error) {
    console.error('Groq Service Error:', error);
    return "Connection interrupted. My AI Core is currently unreachable.";
  }
}

function saveToMentorHistory(role: MentorMessage['role'], content: string) {
  if (!appState.settings.mentorHistory) {
    appState.settings.mentorHistory = [];
  }
  
  appState.settings.mentorHistory.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Keep last 30 messages for context
  if (appState.settings.mentorHistory.length > 30) {
    appState.settings.mentorHistory.shift();
  }
  
  // Persist settings (needs to be called from the feature usually, or we do it here)
  import('@/services/data-bridge').then(m => m.saveSettingsToStorage(appState.settings));
}
