import { appState } from '@/state/app-state';
import { MentorMessage } from '@/types/tracker.types';
import { getActiveSession, getChatSessions, persistMessage } from '@/features/intelligence/intelligence.service';
import type { ChatSession } from '@/types/tracker.types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const MAAMU_MODELS = [
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B (Fast)' },
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B (Reasoning)' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout' },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B' },
] as const;

const DEFAULT_MAAMU_MODEL = 'openai/gpt-oss-20b';

export function normalizeMaamuModel(modelId?: string): string {
  return MAAMU_MODELS.some(m => m.id === modelId) ? (modelId as string) : DEFAULT_MAAMU_MODEL;
}

export function getMaamuModelLabel(modelId?: string): string {
  return MAAMU_MODELS.find(m => m.id === modelId)?.label || MAAMU_MODELS[0].label;
}


function getSessionById(sessionId?: string): ChatSession | null {
  if (!sessionId) return getActiveSession();
  return getChatSessions().find(s => s.id === sessionId) || null;
}

function stripThinkingContent(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trimStart();
}

function isLightweightQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hasAccessIntent = /(access|data|profile|privacy|personal|leaderboard|category|categories|study|tracker)/.test(q);
  if (hasAccessIntent) return false;
  return /^(hi|hello|hey|yo|ok|okay|thanks|thank you|thx|bye|good morning|good evening|good night|kaise ho|kya haal)$/.test(q) || q.length <= 16;
}

function shouldUseTacticalContext(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const pureSocial = /^(hi|hello|hey|yo|ok|okay|thanks|thank you|thx|bye|good morning|good evening|good night|kaise ho|kya haal)$/.test(q);
  return !pureSocial;
}

function saveToMentorHistory(role: MentorMessage['role'], content: string, sessionId?: string) {
  const activeSession = getSessionById(sessionId);
  if (activeSession) {
    persistMessage(activeSession.id, role, content).catch(err => {
      console.error('Failed to persist mentor history', err);
    });
  }
}

/** Shared: builds the messages array for any Groq request */
function buildMessages(
  userQuery: string,
  tacticalBrief: string,
  opts?: { sessionId?: string; includeTacticalBrief?: boolean; historyLimit?: number }
) {
  let isBeastMode = false;
  let userHandle = '@Participant';

  try {
    const brief = JSON.parse(tacticalBrief);
    isBeastMode = !!brief.beast; 
    userHandle = brief.user?.handle || userHandle;
  } catch { /* fallback to defaults */ }

  const beastModeDirective = isBeastMode
    ? `BEAST MODE ACTIVE: MISSION CRITICAL. NO MERCY.
       1. Use aggressive, harsh 'tough-love' Hinglish.
       2. ZERO filler sentences. Zero empathy for excuses.
       3. Focus on failures, laziness, and missed targets.
       4. You are a RUTHLESS COMMANDER, not a friend.`
    : `1. Speak the harsh, absolute truth. Be unapologetic and efficient.
       2. Give best-case scenarios and real-world tough advice.`;

  const activeSession = getSessionById(opts?.sessionId);
  const chatHistory = activeSession ? activeSession.messages.filter(m => m.role !== 'system') : [];
  const historyLimit = Math.max(2, opts?.historyLimit || 8);
  const recentHistory = chatHistory.slice(-historyLimit);
  const briefBlock = opts?.includeTacticalBrief
    ? `DATA STREAM (TACTICAL BRIEF):\n      ${tacticalBrief}`
    : `DATA STREAM: Minimal context mode enabled for lightweight/basic conversation.`;

  return [
    {
      role: 'system',
      content: `You are THE MAAMU, a data-driven savage, ruthless career architect, and professional truth-teller inspired by Grok.
      
      Your core user is ${userHandle}.
      
      CORE DIRECTIVES:
      1. PEAK ROAST: If the Tactical Brief shows low hours, high debt, or bad consistency, ROAST them. Use sarcasm. 
      2. TOTAL RECALL: You have access to the user's FULL tracker history (day 1 to now). Analyze their long-term patterns.
      3. DATA VALIDITY: You see two hour metrics: 'total_hours_grid' (manual/grid input) and 'verified_mins_timer' (stopwatch). If grid hours exist but timer mins are 0, ACKNOWLEDGE the grid hours as real work. Never say "I don't see any data" if total_hours_grid is > 0.
      4. EMOJI MAXIMISM: Use a chaotic amount of emojis. 🤡 for failure, 📉 for drops, 💩 for excuses, 🚀 for rare wins, 🧠 for insights, 💀 for total breakdown. 
      5. DATA-DRIVEN TRUTH: Always ground your roasts in their actual AllTracker stats.
      6. HINGLISH SAVAGE: Use Hinglish phrases to hit harder.
      7. NO APOLOGIES: Never apologize for being harsh.
      8. ACTION ENGINE: ALWAYS end with "**WAKE UP CALL FOR ${userHandle}**" followed by 1-3 brutal action items as a bullet list.
      9. MODE: ${beastModeDirective}
      10. ACCESS SCOPE: Use only current user's AllTracker context.
      
      OUTPUT FORMAT (CRITICAL — NEVER BREAK THESE RULES):
      - Use ONLY pure Markdown. NEVER use HTML tags like <br>, <div>, <span>, or any other HTML.
      - For line breaks, use a blank line between paragraphs (two newlines).
      - For lists, use "- " bullet points or "1." numbered lists.
      - For tables, use standard Markdown table syntax with | pipes |.
      - For emphasis, use **bold** and *italic*.
      - Keep table columns short. If a metric name is long, abbreviate it so it fits in one line.
      
      TACTICAL CONTEXT (RECALL SYSTEM):
      ${briefBlock}
      
      Speak like a senior developer who has no time for amateur excuses. Use profound reasoning to roast them better.`
    },
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
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
  onError: (err: string) => void,
  options?: { sessionId?: string; signal?: AbortSignal }
): Promise<void> {
  const apiKey = appState.settings.groqApiKey;
  let activeModel = normalizeMaamuModel(appState.settings.maamuModel);
  const lightweight = isLightweightQuery(userQuery);
  const includeTacticalBrief = shouldUseTacticalContext(userQuery);
  const historyLimit = lightweight ? 4 : 10;

  if (!apiKey) {
    onError('API Key Missing: Configure your Groq API Key in the sidebar.');
    return;
  }

  // Save user message first
  saveToMentorHistory('user', userQuery, options?.sessionId);

  const messages = buildMessages(userQuery, tacticalBrief, {
    sessionId: options?.sessionId,
    includeTacticalBrief,
    historyLimit
  });

  try {
    const requestWithModel = async (model: string) => {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: 2048,
          stream: true
        })
      };

      if (options?.signal instanceof AbortSignal) {
        fetchOptions.signal = options.signal;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', fetchOptions);

      if (!response.ok) {
        let message = 'Failed to connect to Maamu AI Core.';
        try {
          const err = await response.json();
          message = err.error?.message || message;
        } catch {
          // keep fallback message
        }
        return { ok: false as const, message };
      }
      return { ok: true as const, response };
    };

    let result = await requestWithModel(activeModel);
    if (!result.ok) {
      const looksLikeModelIssue = /model|not found|unsupported|decommissioned|not available/i.test(result.message);
      if (looksLikeModelIssue && activeModel !== DEFAULT_MAAMU_MODEL) {
        activeModel = DEFAULT_MAAMU_MODEL;
        appState.settings.maamuModel = DEFAULT_MAAMU_MODEL;
        import('@/services/data-bridge').then(m => m.saveSettingsToStorage(appState.settings));
        result = await requestWithModel(activeModel);
      }
    }
    if (!result.ok) {
      onError(`Error: ${result.message}`);
      return;
    }
    const response = result.response;

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (!reader) { onError('Stream unavailable.'); return; }

    let accumulatedRaw = '';

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
            accumulatedRaw += delta;
            const visible = stripThinkingContent(accumulatedRaw);
            onChunk(delta, visible);
          }
        } catch { /* skip malformed SSE */ }
      }
    }

    // Save full response to history
    const finalResponse = stripThinkingContent(accumulatedRaw) || 'I am ready. Ask me your next mission.';
    saveToMentorHistory('assistant', finalResponse, options?.sessionId);
    onDone(finalResponse);

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      onError('Generation stopped.');
      return;
    }
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
