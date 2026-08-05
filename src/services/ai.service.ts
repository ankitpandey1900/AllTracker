import { MentorMessage } from '@/types/tracker.types';
import { getActiveSession, getChatSessions, persistMessage } from '@/features/intelligence/intelligence.service';
import type { ChatSession } from '@/types/tracker.types';

const AI_API_URL = '/api/app/chat';

export const MAAMU_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast & Brutal)' },
];
export const DEFAULT_MAAMU_MODEL = MAAMU_MODELS[0].id;

function getSessionById(id?: string): ChatSession | undefined {
  if (!id) return undefined;
  return getChatSessions().find(s => s.id === id);
}

function isLightweightQuery(query: string) {
  const q = query.trim().toLowerCase();
  return q.length < 15 && ['hi', 'hello', 'hey', 'maamu', 'yo'].includes(q);
}

function shouldUseTacticalContext(query: string) {
  const q = query.toLowerCase();
  if (isLightweightQuery(q)) return false;
  return true; // We always want brutal context for non-trivial queries
}

function saveToMentorHistory(role: 'user' | 'assistant', content: string, sessionId?: string) {
  if (!sessionId) return;
  persistMessage(sessionId, role, content);
}

/** Shared: builds the messages array with Brutal MAAMU instructions */
function buildMessages(
  userQuery: string,
  tacticalBrief: string,
  opts?: { sessionId?: string; includeTacticalBrief?: boolean; historyLimit?: number }
) {
  let userHandle = '@Participant';

  try {
    const brief = JSON.parse(tacticalBrief);
    userHandle = brief.user?.handle || userHandle;
  } catch { /* fallback to defaults */ }

  const activeSession = getSessionById(opts?.sessionId);
  const chatHistory = activeSession ? activeSession.messages.filter(m => m.role !== 'system') : [];
  const historyLimit = Math.max(2, opts?.historyLimit || 8);
  const recentHistory = chatHistory.slice(-historyLimit);
  const briefBlock = opts?.includeTacticalBrief
    ? `DATA STREAM (TACTICAL BRIEF - ALL USER DATA):\n      ${tacticalBrief}`
    : `DATA STREAM: Minimal context mode enabled for lightweight/basic conversation.`;

  return [
    {
      role: 'system',
      content: `You are THE MAAMU, a brutal, unforgiving Senior Software Developer, Gen-AI Specialist, and ruthless study coach.
      
Your core user is ${userHandle}.

CORE DIRECTIVES:
1. EXTREME TONE: You are harsh, brutal, and provide ZERO sugar coating. Give the user a massive reality check. Compare them to other hardworking developers on the internet. If they fail to deliver on their promises or slack off, you are authorized to use abusive, savage language (Hinglish/English slang) to wake them up.
2. NO EXCUSES: You do not accept excuses. You demand execution. If their hours are low, tear them apart.
3. BREVITY: If the user message is just a greeting (like "Hi", "Hey"), respond with a short punchy savage greeting.
4. TOTAL RECALL (OMNISCIENT): You have access to their ENTIRE life in the data stream: study log, total hours, today's study, breaks, each session's raw data, task data, backlog, routine, and leaderboard. USE THIS DATA AS WEAPONS to expose their laziness or praise their (rare) hard work.
5. DATA-DRIVEN BRUTALITY: Ground every roast and recommendation in their actual metrics (hours, momentum, routine, task status).
6. ACTION ENGINE: End serious advice with "**WAKE UP CALL FOR ${userHandle}**" followed by 1-3 concrete, extremely direct action points.
7. OMNISCIENT ACCESS: Use only current user's AllTracker context, but speak as if you see everything they do on the web.

OUTPUT FORMAT (CRITICAL):
- Use ONLY pure Markdown. NEVER use HTML tags.
- For line breaks, use a blank line between paragraphs.
- For lists, use "- " bullet points.
- Use **bold** and *italic* for aggressive emphasis.

TACTICAL CONTEXT (RECALL SYSTEM):
${briefBlock}

Speak like a brutal mentor who uses intense pressure, savage insults, and undeniable data to force them to succeed.`
    },
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuery }
  ];
}

export function normalizeMaamuModel(savedModelId?: string) {
  if (!savedModelId) return DEFAULT_MAAMU_MODEL;
  if (MAAMU_MODELS.some(m => m.id === savedModelId)) return savedModelId;
  return DEFAULT_MAAMU_MODEL;
}

function stripThinkingContent(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Streaming version — calls onChunk for each token, onDone when complete.
 */
export async function getMaamuResponseStream(
  userQuery: string,
  tacticalBrief: string,
  onChunk: (chunk: string, accumulated: string) => void,
  onDone: (fullResponse: string) => void,
  onError: (err: string) => void,
  options?: { sessionId?: string; signal?: AbortSignal }
): Promise<void> {
  saveToMentorHistory('user', userQuery, options?.sessionId);

  const messages = buildMessages(userQuery, tacticalBrief, {
    sessionId: options?.sessionId,
    includeTacticalBrief: shouldUseTacticalContext(userQuery),
    historyLimit: isLightweightQuery(userQuery) ? 4 : 10
  });

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages }),
      signal: options?.signal
    });

    if (!response.ok) {
      let message = `AI Core Error (${response.status})`;
      try {
        const err = await response.json();
        message = err.error || message;
      } catch { /* fallback */ }
      onError(`Error: ${message}`);
      return;
    }

    if (!response.body) {
      onError('Stream unavailable.');
      return;
    }

    let accumulatedRaw = '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      accumulatedRaw += text;
      const visible = stripThinkingContent(accumulatedRaw);
      onChunk(text, visible);
    }

    const finalResponse = stripThinkingContent(accumulatedRaw) || 'I am ready. Ask me your next mission.';
    saveToMentorHistory('assistant', finalResponse, options?.sessionId);
    onDone(finalResponse);

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      onError('Generation stopped.');
      return;
    }
    console.error('AI Stream Error:', error);
    onError('Connection interrupted. My AI Core is currently unreachable.');
  }
}

export async function generateSessionTitle(query: string): Promise<string> {
  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        messages: [
          { role: 'system', content: 'You are a title generator. Generate a 2-4 word title for this prompt. Return ONLY the title without quotes or asterisks.' },
          { role: 'user', content: query }
        ] 
      })
    });
    
    let title = '';
    const reader = res.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        title += decoder.decode(value, { stream: true });
      }
    }
    return title.slice(0, 30).trim() || 'New Mission';
  } catch {
    return 'New Mission';
  }
}
