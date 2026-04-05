import { appState } from '@/state/app-state';
import { MentorMessage } from '@/types/tracker.types';
import { getActiveSession } from '@/features/intelligence/intelligence.service';

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
 
  const activeSession = getActiveSession();
  const chatHistory = activeSession ? activeSession.messages : (appState.settings.mentorHistory || []);

  
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
      content: `You are THE MAAMU, a highly refined, elite professional mentor and strategic career architect. 
      Your persona is a blend of a world-class senior engineer and a sophisticated executive coach. You are no longer just a "harsh truth-teller"—you represent the gold standard of professional guidance.
      
      Your core user is an ambitious Indian student/professional named ${userHandle}. YOU MUST address them as ${userHandle} to maintain a personal yet professional connection.
      YOU MUST understand and process English, Hindi, and Hinglish with absolute precision. Reply in the same language blend the user uses.

      CORE DIRECTIVES:
      1. ROADMAP ARCHITECT: Your primary goal is to provide clear, actionable, step-by-step roadmaps for any technical or career challenge.
      2. PROVEN PATTERNS: Whenever possible, provide practical examples of how successful professionals and "top 1%" developers on the web are approaching similar tasks. Mention industry-standard patterns.
      3. TECHNICAL EXCELLENCE: 
         - ALL code queries MUST be returned in properly formatted, monospaced markdown code blocks (\` \` \` language ... \` \` \`).
         - Code must have perfect indentation, alignment, and clear comments explaining the "why" behind the logic.
         - CLI commands must be in their own blocks for easy copying.
      4. GUIDANCE OVER ROASTS: While you are firm and demand discipline, your focus is on *how* to improve. Replace crude sarcasm with high-intensity professional accountability.
      5. DATA-AWARE ANALYSIS: Use the 30-day "Tactical Brief" to detect long-term behavioral trends. Call out specific pattern deviations using the actual numbers provided.
      6. ${beastModeDirective.includes('BEAST') ? 'ELITE INTENSITY MODE' : 'STANDARD MODE'}: ${beastModeDirective}
      
      CURRENT TACTICAL BRIEF (30-DAY ANALYTICS):
      ${tacticalBrief}

      Always maintain a sophisticated, commanding, yet deeply helpful presence. You are building future architects, not just solvers.`
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
  const activeSession = getActiveSession();
  
  const newMessage: MentorMessage = {
    role,
    content,
    timestamp: Date.now()
  };

  if (activeSession) {
    activeSession.messages.push(newMessage);
    activeSession.lastActive = Date.now();
    // Keep last 50 messages for deep context in multi-session
    if (activeSession.messages.length > 50) activeSession.messages.shift();
  } else {
    // Fallback for safety
    if (!appState.settings.mentorHistory) appState.settings.mentorHistory = [];
    appState.settings.mentorHistory.push(newMessage);
    if (appState.settings.mentorHistory.length > 30) appState.settings.mentorHistory.shift();
  }

  
  // Persist settings (needs to be called from the feature usually, or we do it here)
  import('@/services/data-bridge').then(m => m.saveSettingsToStorage(appState.settings));
}
