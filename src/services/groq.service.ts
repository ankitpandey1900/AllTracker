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
    if (activeSession.messages.length > 50) activeSession.messages.shift();
  } else {
    if (!appState.settings.mentorHistory) appState.settings.mentorHistory = [];
    appState.settings.mentorHistory.push(newMessage);
    if (appState.settings.mentorHistory.length > 30) appState.settings.mentorHistory.shift();
  }

  import('@/services/data-bridge').then(m => m.saveSettingsToStorage(appState.settings));
}

/** Shared: builds the messages array for any Groq request */
function buildMessages(userQuery: string, tacticalBrief: string) {
  let isBeastMode = false;
  try { isBeastMode = !!JSON.parse(tacticalBrief).beastModeActive; } catch { /* noop */ }

  let userHandle = '@Participant';
  try { userHandle = JSON.parse(tacticalBrief).identity?.handle || userHandle; } catch { /* noop */ }

  const beastModeDirective = isBeastMode
    ? `BEAST MODE ACTIVE: THE ARENA IS RED. NO MERCY.
       1. Use aggressive, harsh 'tough-love' Hinglish.
       2. ZERO filler sentences. Zero empathy for excuses.
       3. Focus on failures, laziness, and missed targets.
       4. You are a RUTHLESS COMMANDER, not a friend.`
    : `1. Speak the harsh, absolute truth. Be unapologetic and efficient.
       2. Give best-case scenarios and real-world tough advice.`;

  const activeSession = getActiveSession();
  const chatHistory = activeSession ? activeSession.messages : (appState.settings.mentorHistory || []);

  return [
    {
      role: 'system',
      content: `You are THE MAAMU, a highly refined elite professional mentor and strategic career architect.
      Your persona is a world-class senior engineer and executive coach.
      
      Your core user is ${userHandle}. Address them personally as ${userHandle}.
      Understand and reply in English, Hindi, or Hinglish matching the user's language.

      CORE DIRECTIVES:
      1. ROADMAP ARCHITECT: Provide step-by-step actionable roadmaps.
      2. TECHNICAL EXCELLENCE: ALL code in proper markdown code blocks with correct indentation.
      3. DATA-AWARE: Use the Tactical Brief data to detect behavioral trends.
      4. MODE: ${beastModeDirective}

      TACTICAL BRIEF (30-DAY ANALYTICS):
      ${tacticalBrief}

      Maintain a commanding, deeply helpful presence. You are building future architects.`
    },
    ...chatHistory.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuery }
  ];
}

/**
 * Streaming version — calls onChunk for each token, onDone when complete.
 * Saves user message immediately, assistant message when done.
 */
export async function getMaamuResponseStream(
  userQuery: string,
  tacticalBrief: string,
  onChunk: (chunk: string, accumulated: string) => void,
  onDone: (fullResponse: string) => void,
  onError: (err: string) => void
): Promise<void> {
  const apiKey = appState.settings.groqApiKey;

  if (!apiKey) {
    onError('API Key Missing: Configure your Groq API Key in the sidebar.');
    return;
  }

  // Save user message first
  saveToMentorHistory('user', userQuery);

  const messages = buildMessages(userQuery, tacticalBrief);

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
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.json();
      onError(`Error: ${err.error?.message || 'Failed to connect to Maamu AI Core.'}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (!reader) { onError('Stream unavailable.'); return; }

    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') { reader.cancel(); break; }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            accumulated += delta;
            onChunk(delta, accumulated);
          }
        } catch { /* skip malformed SSE */ }
      }
    }

    // Save full response to history
    saveToMentorHistory('assistant', accumulated);
    onDone(accumulated);

  } catch (error) {
    console.error('Groq Stream Error:', error);
    onError('Connection interrupted. My AI Core is currently unreachable.');
  }
}

/** Auto-generate a short session title from first user message */
export function generateSessionTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/[^a-zA-Z0-9 \u0900-\u097F]/g, '').trim();
  const words = cleaned.split(' ').slice(0, 6).join(' ');
  return words.length > 4 ? words : 'Mission Strategy';
}

