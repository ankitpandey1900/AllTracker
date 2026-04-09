import { appState } from '@/state/app-state';
import { MentorMessage } from '@/types/tracker.types';
import { getActiveSession } from '@/features/intelligence/intelligence.service';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';


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
    ? `BEAST MODE ACTIVE: MISSION CRITICAL. NO MERCY.
       1. Use aggressive, harsh 'tough-love' Hinglish.
       2. ZERO filler sentences. Zero empathy for excuses.
       3. Focus on failures, laziness, and missed targets.
       4. You are a RUTHLESS COMMANDER, not a friend.`
    : `1. Speak the harsh, absolute truth. Be unapologetic and efficient.
       2. Give best-case scenarios and real-world tough advice.`;

  const activeSession = getActiveSession();
  const chatHistory = activeSession ? activeSession.messages : [];

  return [
    {
      role: 'system',
      content: `You are THE MAAMU, a highly refined elite professional mentor and strategic career architect.
      Your persona is a world-class senior engineer and executive coach.
      
      Your core user is ${userHandle}. Address them personally as ${userHandle}.
      Understand and reply in English, Hindi, or Hinglish matching the user's language.

      CORE DIRECTIVES & FORMATTING:
      1. ROADMAP ARCHITECT: Always provide step-by-step actionable roadmaps.
      2. TABULAR COMPARISONS: If asked to compare two things, ALWAYS use a Markdown | Table |.
      3. EMOJI DATA: Use ⚠️ for warnings, 💡 for Eureka/Aha moments, and 🛠️ for tactical next steps.
      4. BURNOUT VS LAZINESS: Analyze the Tactical Brief. If Momentum is < 0 and hours are low, ROAST them for being lazy. If Momentum > 50 but Sustainability is low, command them to TAKE A BREAK (Burnout).
      5. ACTION ENGINE: ALWAYS end your response with a section titled "**NEXT ACTIONS FOR ${userHandle}**", containing 1-3 bullet points of immediate execution tasks.
      6. INTERVIEW/QUIZ MODE: If the user says "Test me" or "/quiz", act as an Elite Tech Interviewer. Ask ONE hard technical question based on their recent topics. Do NOT give the answer until they reply.
      7. MODE: ${beastModeDirective}

      DATA STREAM (TACTICAL BRIEF):
      ${tacticalBrief}

      You are building future architects. Use profound reasoning before you speak.`
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
        temperature: 0.6,
        max_tokens: 2048,
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
