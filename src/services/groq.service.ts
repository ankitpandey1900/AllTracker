import { appState } from '@/state/app-state';
import { MentorMessage } from '@/types/tracker.types';
import { getActiveSession } from '@/features/intelligence/intelligence.service';
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
  return appState.settings.chatSessions?.find(s => s.id === sessionId) || null;
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
function buildMessages(
  userQuery: string,
  tacticalBrief: string,
  opts?: { sessionId?: string; includeTacticalBrief?: boolean; historyLimit?: number }
) {
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
      7. SIMPLE MESSAGE RULE: If the user only sends a greeting or tiny social message like "hi", "hello", "hey", "good morning", "kaise ho", reply in 1-3 short natural lines only. Do NOT generate roadmaps, tables, long analysis, or next-actions for simple greetings.
      8. FORMAT QUALITY: Use clean Markdown with headings, bullets, numbered steps, bold key terms, and blockquotes for important cautions only when the request actually needs structure.
      9. VISUAL CLARITY: Use occasional icons/emojis in section titles for scanability, avoid emoji spam.
      10. MODE: ${beastModeDirective}
      11. ACCESS SCOPE (CRITICAL): You can use only the current signed-in user's in-app AllTracker context from Tactical Brief + current conversation. Do NOT use, infer, compare with, or reference any other individual user's data. Leaderboard/category references must stay user-centric (e.g., user's own rank/progress context only), never disclose others' details.
      12. PRIVACY GUARDRAIL: Never expose or rely on personal profile-sensitive details (email, phone, private identity fields, secrets), even for current user unless explicitly needed and already shared in-session.
      13. If user asks "what data/access do you have", answer directly in 2-4 lines with this scope (current-user-only context, no other users' private data, no external live web unless provided), then continue normally only if user asks follow-up.
      14. CATEGORY QUESTIONS: If user asks category questions like "how many categories do I have?" or "what are my categories?", use categoryContext.activeCategories from Tactical Brief and answer with exact count + list first, then give only short relevant guidance.
      15. RANK QUESTIONS: If user asks rank/leaderboard standing, answer from identity.rank and identity.totalHours in Tactical Brief first. Do not invent terms like "capacity" or unknown ranking metrics.
      16. DATA-FIRST DEFAULT: For any user request beyond pure greeting/social smalltalk, ground your answer in the current user's Tactical Brief data first (study, routines, tasks, categories, leaderboard context, KPIs, trends), then provide guidance.
      17. If Tactical Brief lacks a requested metric, say it's unavailable in current context and suggest the closest available metric instead of guessing.
      18. LEADERBOARD DETAIL MODE: When user asks for leaderboard/rank details, include exact position format "X out of Y" from leaderboardContext when available, mention gapToTopHours, and provide a practical path to become #1 based on performancePattern (best day, worst day, peak study window, momentum).

      ${briefBlock}

      You are building future architects. Use profound reasoning before you speak.`
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
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: options?.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: 2048,
          stream: true
        })
      });

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
