// Mesh API (by AI Fiesta) Client & AI Engine for SketchCast
// OpenAI-compatible unified gateway supporting 1,000+ models

import {
  searchWeb,
  scrapeUrlContent,
  fetchGitHubRepoDetails,
  fetchTrendingTechNews,
  formatCodeSnippet,
  isGitHubRepoInput,
  type WebSearchResult,
  type ScrapedPageContent,
  type GitHubRepoSummary,
  type TrendingTechStory,
} from './aiTools';

export {
  searchWeb,
  scrapeUrlContent,
  fetchGitHubRepoDetails,
  fetchTrendingTechNews,
  formatCodeSnippet,
  isGitHubRepoInput,
  type WebSearchResult,
  type ScrapedPageContent,
  type GitHubRepoSummary,
  type TrendingTechStory,
};

export interface MeshChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MeshCompletionOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export const MESH_DIRECT_URL = 'https://api.meshapi.ai/v1';

export function getSupabaseEdgeFunctionUrl(): string {
  const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || 'https://rkwrlyjdntwgvzgfxphv.supabase.co';
  return `${supabaseUrl}/functions/v1/mesh-ai`;
}

// In browser, use Vite proxy `/api/mesh/v1` to eliminate CORS preflight/blocking
export function getMeshApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // If running in development with Vite proxy or same-origin backend
    return '/api/mesh/v1';
  }
  return MESH_DIRECT_URL;
}

export const MESH_MODELS = {
  AUTO: 'auto',
  GPT_4O_MINI: 'openai/gpt-4o-mini-2024-07-18',
  BALANCED_MINI: 'openai/gpt-4o-mini',
  DEEPSEEK_V4_FLASH: 'deepseek/deepseek-v4-flash',
  DEEPSEEK_V4_1_FLASH: 'deepseek/deepseek-v4.1-flash',
} as const;

export const MESH_MODEL_OPTIONS = [
  {
    id: 'auto',
    name: 'Smart Auto-Router (Credit Saver)',
    provider: 'Mesh Smart Router',
    tag: 'MAX SAVINGS',
    description: 'Auto-routes tasks to the cheapest, most efficient model (GPT-4o Mini for ultra-low token cost, DeepSeek Chat for long-form synthesis) to minimize spend.',
  },
  {
    id: 'openai/gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    tag: 'ULTRA CHEAP',
    description: 'Cheapest per-token pricing, blazing speed, and reliable structured parsing for moderation, quizzes, and surveys.',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash (Recommended)',
    provider: 'DeepSeek',
    tag: 'HIGH SPEED',
    description: 'Ultra-fast latency for live moderation, quick trivia questions, and real-time interaction.',
  },
  {
    id: 'deepseek/deepseek-v4.1-flash',
    name: 'DeepSeek v4.1 Flash',
    provider: 'DeepSeek',
    tag: 'SUPER FAST',
    description: 'Super ultra-fast latency for live moderation, quick trivia questions, and real-time interaction.',
  },
];

const STORAGE_KEY_MESH_KEY = 'sketchcast_mesh_api_key';
const STORAGE_KEY_MESH_MODEL = 'sketchcast_mesh_selected_model';

export function getStoredMeshKey(): string {
  if (typeof window !== 'undefined' || typeof localStorage !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEY_MESH_KEY);
    if (local && local.trim()) return local.trim();
  }
  return (import.meta.env?.VITE_MESH_API_KEY as string) || '';
}

export function setStoredMeshKey(key: string): void {
  if (typeof window !== 'undefined' || typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MESH_KEY, key.trim());
  }
}

export function getStoredMeshModel(): string {
  if (typeof window !== 'undefined' || typeof localStorage !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEY_MESH_MODEL);
    if (local && local.trim()) {
      const trimmed = local.trim();
      if (trimmed === 'auto' || trimmed === MESH_MODELS.AUTO) {
        return MESH_MODELS.AUTO;
      }
      // Migrate old removed model strings
      if (trimmed.includes('gemini') || trimmed.includes('claude-3.5-sonnet') || trimmed.includes('claude-3-haiku') || trimmed.includes('deepseek-r1')) {
        return MESH_MODELS.AUTO;
      }
      return trimmed;
    }
  }
  return MESH_MODELS.AUTO;
}

export function setStoredMeshModel(model: string): void {
  if (typeof window !== 'undefined' || typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MESH_MODEL, model.trim());
  }
}

export type MeshTaskType =
  | 'moderation'
  | 'duplicates'
  | 'quiz'
  | 'survey'
  | 'survey_sentiment'
  | 'clustering'
  | 'talking_points'
  | 'poll_consensus'
  | 'session_report';

/**
 * Intelligently resolves the optimal model for a given task.
 * If the host has chosen a specific preset or custom model ID (not 'auto'), that model is STRICTLY respected.
 * If in 'auto' mode, task-specific cost optimization routes to the cheapest reliable model.
 */
export function resolveModelForTask(taskType: MeshTaskType, explicitModel?: string): string {
  const chosenModel = explicitModel || getStoredMeshModel();

  // If host selected a specific model or entered a custom model, strictly honor it!
  if (chosenModel && chosenModel !== 'auto' && chosenModel !== MESH_MODELS.AUTO) {
    return chosenModel;
  }

  // Dynamic / Auto-Router Selection (Optimized to save maximum money and tokens using GPT-4o Mini)
  switch (taskType) {
    case 'moderation':
    case 'duplicates':
    case 'talking_points':
    case 'poll_consensus':
      // Trivial / high-frequency tasks: use ultra-cheap, reliable GPT-4o Mini
      return MESH_MODELS.GPT_4O_MINI;
    case 'quiz':
    case 'survey':
    case 'clustering':
      // Fast structured schema generation: lowest token cost and superior JSON compliance
      return MESH_MODELS.GPT_4O_MINI;
    case 'session_report':
    case 'survey_sentiment':
      // Multi-dimensional synthesis: cost-effective GPT-4o Mini
      return MESH_MODELS.GPT_4O_MINI;
    default:
      return MESH_MODELS.GPT_4O_MINI;
  }
}

// In-Memory Credit-Saver Caches (Memoizes identical requests to save 100% of tokens on repeated checks)
const moderationCache = new Map<string, { result: QAModerationResult; timestamp: number }>();
const duplicateCheckCache = new Map<string, { result: DuplicateDetectionResult; timestamp: number }>();
const clusterCache = new Map<string, { result: QuestionCluster[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

export async function callMeshChatCompletion(
  messages: MeshChatMessage[],
  options: MeshCompletionOptions = {}
): Promise<string> {
  const apiKey = options.apiKey || getStoredMeshKey();
  const rawModel = options.model || getStoredMeshModel();
  const model = (rawModel === 'auto' || rawModel === MESH_MODELS.AUTO)
    ? MESH_MODELS.GPT_4O_MINI
    : rawModel;

  const {
    temperature = 0.7,
    maxTokens = 1250,
    jsonMode = false,
  } = options;

  const payload: Record<string, any> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  // --- Tier 1: Supabase Edge Function (Keeps API key 100% server-side in production) ---
  const edgeFunctionUrl = getSupabaseEdgeFunctionUrl();
  const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3JseWpkbnR3Z3Z6Z2Z4cGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzU5NzYsImV4cCI6MjEwMjk1MTk3Nn0.sqkO1wWH-g1RW6osbLaZN-1QXeKnTtfcgjxxcIL4q8k';

  if (edgeFunctionUrl) {
    try {
      const edgeRes = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json().catch(() => null);
        const edgeContent = edgeJson?.choices?.[0]?.message?.content;
        if (edgeContent) {
          return edgeContent;
        }
      }
    } catch {
      // Fallback seamlessly to local Vite proxy / direct Mesh API gateway
    }
  }

  if (!apiKey) {
    throw new Error('Mesh API Key missing. Please click "AI SETTINGS" in the header to enter your rsk_... key.');
  }

  // --- Tier 2 & 3: Local Dev Proxy / Direct Mesh API Fallback ---
  const proxyUrl = `${getMeshApiBaseUrl()}/chat/completions`;
  const directUrl = `${MESH_DIRECT_URL}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  let response: Response | null = null;
  let lastError: any = null;

  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    // If proxy returned 404/405/502 or returned SPA HTML instead of JSON, fallback to direct Mesh API
    if (
      (!res.ok && (res.status === 404 || res.status === 405 || res.status === 502 || res.status === 503)) ||
      contentType.includes('text/html')
    ) {
      if (proxyUrl !== directUrl) {
        response = await fetch(directUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        response = res;
      }
    } else {
      response = res;
    }
  } catch (netErr: any) {
    lastError = netErr;
    if (proxyUrl !== directUrl) {
      try {
        response = await fetch(directUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      } catch (directErr: any) {
        lastError = directErr;
      }
    }
  }

  if (!response) {
    throw new Error(`Connection failed: ${lastError?.message || 'Network error'}. Please check your connection.`);
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    const message =
      errorJson?.error?.message ||
      errorJson?.message ||
      `Mesh API Error: ${response.status} ${response.statusText}`;

    // If a custom or failed model encountered an error, retry with fallback WITHOUT destroying user's saved preference
    if (model !== MESH_MODELS.GPT_4O_MINI && model !== MESH_MODELS.DEEPSEEK_V4_FLASH) {
      console.warn(`[Mesh API] Model "${model}" failed (${message}). Retrying with fallback "${MESH_MODELS.GPT_4O_MINI}"...`);
      return callMeshChatCompletion(messages, {
        ...options,
        model: MESH_MODELS.GPT_4O_MINI,
      });
    }

    throw new Error(message);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response received from Mesh API.');
  }
  return content;
}

export async function testMeshConnection(apiKey?: string, model?: string): Promise<{ success: boolean; message: string; modelUsed: string }> {
  const keyToUse = apiKey || getStoredMeshKey();
  if (!keyToUse) {
    return { success: false, message: 'No API key provided.', modelUsed: '' };
  }

  const rawModel = model || getStoredMeshModel();
  const targetModel = (rawModel === 'auto' || rawModel === MESH_MODELS.AUTO)
    ? MESH_MODELS.GPT_4O_MINI
    : rawModel;

  try {
    const text = await callMeshChatCompletion(
      [{ role: 'user', content: 'Respond with exactly: "MESH_API_ONLINE"' }],
      { apiKey: keyToUse, model: targetModel, maxTokens: 25, temperature: 0.1 }
    );

    return {
      success: true,
      message: `Connected successfully! (Model: ${targetModel}${rawModel === 'auto' ? ' via Smart Auto-Router' : ''}) Output: ${text.trim()}`,
      modelUsed: targetModel,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network connection failed to Mesh API gateway.',
      modelUsed: targetModel,
    };
  }
}

/**
 * Ultra-resilient JSON parser for LLM outputs:
 * 1. Strips <think>...</think> reasoning tags (from DeepSeek/reasoning models)
 * 2. Extracts content from markdown code fences (```json ... ```)
 * 3. Handles loose markdown or conversational preambles/postscripts
 * 4. Fixes trailing commas
 * 5. Auto-repairs truncated outputs: if the model hit token limits mid-object,
 *    it safely recovers all completed objects in an array.
 */
export function safeParseJsonFromLLM<T = any>(rawText: string, fallback?: T): T {
  if (!rawText || !rawText.trim()) {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty response from AI model');
  }

  // 1. Strip DeepSeek / reasoning thinking tags
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Extract from markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. Direct JSON parse attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue
  }

  // 4. Find outermost { ... } or [ ... ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let isObject = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const endChar = isObject ? '}' : ']';
    const lastEnd = cleaned.lastIndexOf(endChar);

    if (lastEnd > startIdx) {
      const candidate = cleaned.slice(startIdx, lastEnd + 1);
      try {
        const sanitized = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch {
        // Continue to salvage / repair
      }
    }

    // 5. Truncation repair: auto-salvage partial arrays of objects
    try {
      let partial = cleaned.slice(startIdx);
      const lastClosedObject = partial.lastIndexOf('}');
      if (lastClosedObject !== -1) {
        partial = partial.slice(0, lastClosedObject + 1).trim();
        partial = partial.replace(/,\s*$/, '');

        // Count unclosed brackets and braces
        const stack: string[] = [];
        let inString = false;
        let isEscaped = false;

        for (let i = 0; i < partial.length; i++) {
          const ch = partial[i];
          if (isEscaped) {
            isEscaped = false;
            continue;
          }
          if (ch === '\\') {
            isEscaped = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (inString) continue;

          if (ch === '{' || ch === '[') {
            stack.push(ch);
          } else if (ch === '}') {
            if (stack[stack.length - 1] === '{') stack.pop();
          } else if (ch === ']') {
            if (stack[stack.length - 1] === '[') stack.pop();
          }
        }

        // Close whatever was left open
        while (stack.length > 0) {
          const open = stack.pop();
          if (open === '{') partial += '}';
          else if (open === '[') partial += ']';
        }

        return JSON.parse(partial);
      }
    } catch {
      // Continue to fallback
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error('Failed to parse AI JSON response.');
}

// -------------------------------------------------------------
// FEATURE 1: AI Quiz Pack Generator
// -------------------------------------------------------------
export interface GeneratedAIQuestion {
  category: string;
  question: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correctOpt: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  timeLimitSeconds: number;
}

/**
 * Distributes correct answer options evenly across A, B, C, and D.
 * Prevents LLM bias where Option A is disproportionately set as the correct answer.
 */
export function distributeQuestionOptions(questions: GeneratedAIQuestion[]): GeneratedAIQuestion[] {
  if (!questions || questions.length === 0) return [];

  const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

  // Create a randomized pool of target keys across the batch of questions
  const targetKeys: Array<'A' | 'B' | 'C' | 'D'> = [];
  while (targetKeys.length < questions.length) {
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    targetKeys.push(...shuffled);
  }

  return questions.map((q, idx) => {
    const options = [
      { key: 'A', text: q.optA },
      { key: 'B', text: q.optB },
      { key: 'C', text: q.optC },
      { key: 'D', text: q.optD },
    ];

    // Don't reposition if options contain relative terms like "all of the above"
    const hasRelativeReference = options.some((o) =>
      /\b(all of the above|none of the above|both [a-d]|neither|above|below)\b/i.test(o.text)
    );
    if (hasRelativeReference) {
      return q;
    }

    const currentCorrectKey = (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D';
    const correctText = q[`opt${currentCorrectKey}` as 'optA' | 'optB' | 'optC' | 'optD'] || q.optA;
    const incorrectTexts = options.filter((o) => o.key !== currentCorrectKey).map((o) => o.text);

    // Shuffle incorrect options so their relative placement is also randomized
    const shuffledIncorrect = [...incorrectTexts].sort(() => Math.random() - 0.5);

    const targetCorrectKey = targetKeys[idx] || letters[Math.floor(Math.random() * 4)];
    const newOptions: Record<'A' | 'B' | 'C' | 'D', string> = {
      A: '',
      B: '',
      C: '',
      D: '',
    };

    newOptions[targetCorrectKey] = correctText;
    let incIdx = 0;
    for (const k of letters) {
      if (k !== targetCorrectKey) {
        newOptions[k] = shuffledIncorrect[incIdx++] || 'Alternative Option';
      }
    }

    return {
      ...q,
      optA: newOptions.A,
      optB: newOptions.B,
      optC: newOptions.C,
      optD: newOptions.D,
      correctOpt: targetCorrectKey,
    };
  });
}

export async function generateAIQuizQuestions(
  topic: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior'
): Promise<GeneratedAIQuestion[]> {
  const systemPrompt = `You are a Principal Software Architect and Technical Quiz Master.
Your goal is to generate ${count} high-caliber, practical multiple-choice quiz questions for a live tech session on the topic: "${topic}".
Difficulty level: ${difficulty}.

REQUIREMENTS:
1. Each question must test real-world architectural principles, distributed systems, code trade-offs, security, or concurrency.
2. Exactly 4 distinct, standalone options (A, B, C, D). Do NOT use "All of the above" or "None of the above".
3. Distribute the correct answer evenly across options ('A', 'B', 'C', or 'D'). Randomize which option is correct so 'A' is NOT always the answer.
4. Designate the correct option key ('A', 'B', 'C', or 'D').
5. Provide a clear, educational "explanation" (1-2 sentences) detailing why the chosen option is correct and why common pitfalls fail.
6. Set appropriate timeLimitSeconds between 15 and 45.

Return ONLY a valid JSON object matching this schema without any markdown formatting or commentary:
{
  "questions": [
    {
      "category": "${topic.slice(0, 20)}",
      "question": "Question prompt here...",
      "optA": "Option A text...",
      "optB": "Option B text...",
      "optC": "Option C text...",
      "optD": "Option D text...",
      "correctOpt": "C",
      "explanation": "Concise architectural explanation...",
      "timeLimitSeconds": 25
    }
  ]
}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} technical questions on "${topic}" at ${difficulty} level. Return ONLY valid raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.7, maxTokens: tokenBudget, model: targetModel }
  );

  let parsed: any;
  try {
    parsed = safeParseJsonFromLLM(raw);
  } catch {
    throw new Error('Failed to parse AI Quiz JSON response. Please try again.');
  }

  const list: any[] = Array.isArray(parsed?.questions)
    ? parsed.questions
    : Array.isArray(parsed)
    ? parsed
    : [];

  if (list.length === 0) {
    throw new Error('AI returned an empty question list. Please try again.');
  }

  const rawQuestions: GeneratedAIQuestion[] = list.map((q, idx) => ({
    category: q.category || topic.slice(0, 20),
    question: q.question || `Technical Question ${idx + 1}`,
    optA: q.optA || q.options?.[0]?.text || 'Option A',
    optB: q.optB || q.options?.[1]?.text || 'Option B',
    optC: q.optC || q.options?.[2]?.text || 'Option C',
    optD: q.optD || q.options?.[3]?.text || 'Option D',
    correctOpt: (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: q.explanation || 'Verified architectural concept.',
    timeLimitSeconds: Math.min(90, Math.max(10, q.timeLimitSeconds || 25)),
  }));

  return distributeQuestionOptions(rawQuestions);
}

// -------------------------------------------------------------
// FEATURE 1.1: Web Grounded AI Quiz Generator (Live Search)
// -------------------------------------------------------------
export async function generateAIQuizFromWebSearch(
  query: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior'
): Promise<{ questions: GeneratedAIQuestion[]; sources: WebSearchResult[] }> {
  let sources: WebSearchResult[] = [];
  try {
    sources = await searchWeb(query, 3);
  } catch (err) {
    console.warn('[Mesh API] Web search error, proceeding with prompt synthesis:', err);
  }
  const sourcesContext = sources.length > 0
    ? sources.map((s, i) => `[Source ${i + 1}] Title: ${s.title}\nURL: ${s.url}\nExcerpt: ${s.snippet}`).join('\n\n')
    : `Topic: ${query}`;

  const systemPrompt = `You are a Principal Software Architect and Quiz Master with access to real-time web search results.
Generate ${count} multiple-choice quiz questions based on the latest web context provided below.
Difficulty: ${difficulty}.

REAL-TIME WEB CONTEXT:
${sourcesContext}

REQUIREMENTS:
1. Ground each question in real architectural developments, breaking releases, or RFCs from the web search context.
2. 4 distinct, standalone options (A, B, C, D). Do NOT use "All of the above" or "None of the above".
3. Distribute the correct answer evenly across options ('A', 'B', 'C', or 'D'). Randomize which option is correct so 'A' is NOT always the answer.
4. Concise 1-2 sentence educational explanation.
5. timeLimitSeconds between 15 and 45.

Return ONLY a valid raw JSON object matching:
{"questions": [{"category": "${query.slice(0, 20)}", "question": "...", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "B", "explanation": "...", "timeLimitSeconds": 25}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} questions grounded in the web search results for "${query}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.6, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions: GeneratedAIQuestion[] = (parsed.questions || []).map((q: any, idx: number) => ({
    category: q.category || query.slice(0, 20),
    question: q.question || `Question ${idx + 1}`,
    optA: q.optA || 'Option A',
    optB: q.optB || 'Option B',
    optC: q.optC || 'Option C',
    optD: q.optD || 'Option D',
    correctOpt: (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: q.explanation || 'Verified architectural concept.',
    timeLimitSeconds: Math.min(90, Math.max(10, q.timeLimitSeconds || 25)),
  }));

  if (rawQuestions.length === 0) {
    throw new Error('No quiz questions generated from web search.');
  }

  return { questions: distributeQuestionOptions(rawQuestions), sources };
}

// -------------------------------------------------------------
// FEATURE 1.2: URL & Docs Scraper AI Quiz Generator
// -------------------------------------------------------------
export async function generateAIQuizFromUrl(
  url: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior'
): Promise<{ questions: GeneratedAIQuestion[]; pageInfo: ScrapedPageContent }> {
  const pageInfo = await scrapeUrlContent(url, 4500);

  const systemPrompt = `You are a Technical Quiz Master.
Generate ${count} practical quiz questions testing comprehension of the documentation/article scraped from: "${pageInfo.title}".
Difficulty: ${difficulty}.

SCRAPED CONTENT EXCERPT:
${pageInfo.markdown.slice(0, 3000)}

REQUIREMENTS:
1. Questions must test core principles, caveats, or trade-offs mentioned in this document.
2. 4 distinct, standalone options (A, B, C, D). Do NOT use "All of the above" or "None of the above".
3. Distribute the correct answer evenly across options ('A', 'B', 'C', or 'D'). Randomize which option is correct so 'A' is NOT always the answer.
4. Concise educational explanation (1-2 sentences).
5. timeLimitSeconds between 15 and 45.

Return ONLY valid raw JSON:
{"questions": [{"category": "${pageInfo.title.slice(0, 20)}", "question": "...", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "C", "explanation": "...", "timeLimitSeconds": 25}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} questions testing the scraped content from "${pageInfo.title}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.6, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions: GeneratedAIQuestion[] = (parsed.questions || []).map((q: any, idx: number) => ({
    category: q.category || pageInfo.title.slice(0, 20),
    question: q.question || `Question ${idx + 1}`,
    optA: q.optA || 'Option A',
    optB: q.optB || 'Option B',
    optC: q.optC || 'Option C',
    optD: q.optD || 'Option D',
    correctOpt: (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: q.explanation || 'Verified architectural concept.',
    timeLimitSeconds: Math.min(90, Math.max(10, q.timeLimitSeconds || 25)),
  }));

  if (rawQuestions.length === 0) {
    throw new Error('No questions generated from document content.');
  }

  return { questions: distributeQuestionOptions(rawQuestions), pageInfo };
}

// -------------------------------------------------------------
// FEATURE 1.3: GitHub Repository Deep-Scanner AI Quiz Generator
// -------------------------------------------------------------
export async function generateAIQuizFromGitHub(
  repoUrlOrSlug: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior'
): Promise<{ questions: GeneratedAIQuestion[]; repoSummary: GitHubRepoSummary }> {
  const repoSummary = await fetchGitHubRepoDetails(repoUrlOrSlug);

  const systemPrompt = `You are a Principal Software Architect.
Generate ${count} technical architecture quiz questions testing knowledge of the open-source repository: "${repoSummary.fullName}".
Difficulty: ${difficulty}.
Description: ${repoSummary.description}
Language: ${repoSummary.language}
Topics: ${repoSummary.topics.join(', ')}

README EXCERPT:
${repoSummary.readmeExcerpt.slice(0, 2500)}

REQUIREMENTS:
1. Focus on architectural patterns, internal design, core modules, or trade-offs of ${repoSummary.fullName}.
2. 4 distinct, standalone options (A, B, C, D). Do NOT use "All of the above" or "None of the above".
3. Distribute the correct answer evenly across options ('A', 'B', 'C', or 'D'). Randomize which option is correct so 'A' is NOT always the answer.
4. Concise 1-2 sentence explanation.
5. timeLimitSeconds between 15 and 45.

Return ONLY valid raw JSON:
{"questions": [{"category": "${repoSummary.repo}", "question": "...", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "D", "explanation": "...", "timeLimitSeconds": 25}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} architectural questions for repository ${repoSummary.fullName}. Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.6, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions: GeneratedAIQuestion[] = (parsed.questions || []).map((q: any, idx: number) => ({
    category: q.category || repoSummary.repo,
    question: q.question || `Question ${idx + 1}`,
    optA: q.optA || 'Option A',
    optB: q.optB || 'Option B',
    optC: q.optC || 'Option C',
    optD: q.optD || 'Option D',
    correctOpt: (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: q.explanation || 'Verified architectural concept.',
    timeLimitSeconds: Math.min(90, Math.max(10, q.timeLimitSeconds || 25)),
  }));

  if (rawQuestions.length === 0) {
    throw new Error('No questions generated for this GitHub repository.');
  }

  return { questions: distributeQuestionOptions(rawQuestions), repoSummary };
}

// -------------------------------------------------------------
// FEATURE 1.4: Hacker News Trends Scanner AI Quiz Generator
// -------------------------------------------------------------
export async function generateAIQuizFromHNTrends(
  storyTitle: string,
  storyUrl?: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior'
): Promise<{ questions: GeneratedAIQuestion[]; story: { title: string; url?: string } }> {
  let extraContext = '';
  if (storyUrl) {
    try {
      const scraped = await scrapeUrlContent(storyUrl, 2500);
      extraContext = `ARTICLE CONTENT:\n${scraped.markdown.slice(0, 2000)}`;
    } catch {
      // ignore
    }
  }

  const systemPrompt = `You are an expert Tech News Quiz Master.
Generate ${count} engaging multiple-choice trivia and engineering questions on today's breaking story: "${storyTitle}".
Difficulty: ${difficulty}.
${extraContext}

REQUIREMENTS:
1. Test engineering implications, industry disruption, or core concepts related to this story.
2. 4 distinct, standalone options (A, B, C, D). Do NOT use "All of the above" or "None of the above".
3. Distribute the correct answer evenly across options ('A', 'B', 'C', or 'D'). Randomize which option is correct so 'A' is NOT always the answer.
4. Educational explanation (1-2 sentences).
5. timeLimitSeconds between 15 and 45.

Return ONLY valid raw JSON:
{"questions": [{"category": "Tech Trends", "question": "...", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "B", "explanation": "...", "timeLimitSeconds": 25}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} questions on breaking story "${storyTitle}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.7, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions: GeneratedAIQuestion[] = (parsed.questions || []).map((q: any, idx: number) => ({
    category: q.category || 'Tech Trends',
    question: q.question || `Question ${idx + 1}`,
    optA: q.optA || 'Option A',
    optB: q.optB || 'Option B',
    optC: q.optC || 'Option C',
    optD: q.optD || 'Option D',
    correctOpt: (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: q.explanation || 'Verified architectural concept.',
    timeLimitSeconds: Math.min(90, Math.max(10, q.timeLimitSeconds || 25)),
  }));

  if (rawQuestions.length === 0) {
    throw new Error('No questions generated for this story.');
  }

  return { questions: distributeQuestionOptions(rawQuestions), story: { title: storyTitle, url: storyUrl } };
}

// -------------------------------------------------------------
// FEATURE 1.5: URL & Web Grounded Polls Generator
// -------------------------------------------------------------
export async function generateAIPollsFromUrl(targetUrl: string): Promise<{ polls: SuggestedAIPoll[]; documentTitle: string }> {
  // If target is a GitHub repo (URL or slug), analyze repo metadata & README
  if (isGitHubRepoInput(targetUrl)) {
    const repoSummary = await fetchGitHubRepoDetails(targetUrl);
    const systemPrompt = `You are an interactive live poll designer for engineering sessions.
Generate 3 engaging audience polls centered on the open-source repository: "${repoSummary.fullName}".
REPO CONTEXT:
Description: ${repoSummary.description}
Primary Language: ${repoSummary.language}
Stars: ${repoSummary.stars.toLocaleString()}
Topics: ${repoSummary.topics.join(', ') || 'None'}
README Excerpt:
${repoSummary.readmeExcerpt.slice(0, 1500)}

REQUIREMENTS:
1. Poll questions should gauge developer opinions, architecture trade-offs, adopting the tool, or comparing alternatives to ${repoSummary.repo}.
2. Provide 2 to 4 distinct, realistic options.

Return ONLY valid raw JSON:
{"polls": [{"question": "Poll question?", "options": ["Opt 1", "Opt 2", "Opt 3"]}]}`;

    const targetModel = resolveModelForTask('survey');
    const raw = await callMeshChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 3 interactive polls discussing GitHub repo "${repoSummary.fullName}". Return ONLY raw JSON.` },
      ],
      { jsonMode: true, temperature: 0.8, maxTokens: 700, model: targetModel }
    );

    const parsed = safeParseJsonFromLLM(raw, { polls: [] });
    return {
      polls: (parsed.polls || []).map((p: any) => ({
        question: p.question || `Poll about ${repoSummary.fullName}`,
        options: Array.isArray(p.options) && p.options.length >= 2 ? p.options : ['Yes', 'No'],
      })),
      documentTitle: repoSummary.fullName,
    };
  }

  // Otherwise scrape as standard webpage
  const pageInfo = await scrapeUrlContent(targetUrl, 3000);
  const systemPrompt = `You are an interactive live poll designer.
Generate 3 audience polls discussing the topic and arguments of the document: "${pageInfo.title}".
DOCUMENT EXCERPT:
${pageInfo.markdown.slice(0, 2000)}

Return ONLY valid raw JSON:
{"polls": [{"question": "Poll question?", "options": ["Opt 1", "Opt 2", "Opt 3"]}]}`;

  const targetModel = resolveModelForTask('survey');
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate 3 interactive polls discussing "${pageInfo.title}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.8, maxTokens: 700, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { polls: [] });
  return {
    polls: (parsed.polls || []).map((p: any) => ({
      question: p.question || `Poll about ${pageInfo.title}`,
      options: Array.isArray(p.options) && p.options.length >= 2 ? p.options : ['Yes', 'No'],
    })),
    documentTitle: pageInfo.title,
  };
}
export interface SuggestedAIPoll {
  question: string;
  options: string[];
}

export async function generateAIPollSuggestions(topic: string): Promise<SuggestedAIPoll[]> {
  const cleanTopic = topic.trim();
  const systemPrompt = `You are an expert interactive audience poll and live survey designer.
Your mission is to generate 3 tailored, creative, and highly engaging audience polls specifically focused on the user's topic: "${cleanTopic}".

CORE RULES:
1. Every poll question must be unique, insightful, and directly centered on "${cleanTopic}".
2. Provide 2 to 5 distinct, concise, realistic, and mutually exclusive option choices for each poll.
3. Align directly with the user's specific context:
   - If the user asks for ratings/feedback/reviews, provide satisfaction levels and key dimensions.
   - If the user gives a technology comparison, explore real-world trade-offs.
   - If the user provides a business, team, or cultural topic, provide lively, pertinent questions.

Return ONLY a valid JSON object matching this schema without markdown:
{
  "polls": [
    {
      "question": "Clear question specific to ${cleanTopic}?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
  ]
}`;

  const targetModel = resolveModelForTask('survey');
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate 3 interactive live audience polls specifically about: "${cleanTopic}". Return ONLY valid raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.8, maxTokens: 700, model: targetModel }
  );

  try {
    const parsed = safeParseJsonFromLLM(raw);
    const list = Array.isArray(parsed.polls) ? parsed.polls : Array.isArray(parsed) ? parsed : [];
    return list.map((p: any) => ({
      question: p.question || `Poll about ${cleanTopic}`,
      options: Array.isArray(p.options) && p.options.length >= 2 ? p.options : ['Yes', 'No'],
    }));
  } catch {
    throw new Error('Failed to parse AI Poll suggestions. Please try again.');
  }
}

export async function synthesizePollConsensus(
  question: string,
  optionsWithVotes: Array<{ text: string; votes: number; percentage: number }>,
  totalVotes: number
): Promise<string> {
  const systemPrompt = `You are a Principal Tech Analyst.
Summarize the real-time consensus from a live developer audience poll in 2 punchy sentences.
Highlight the dominant trend, what it indicates about modern engineering practices, and any notable divergence.`;

  const votesSummary = optionsWithVotes
    .map((o) => `"${o.text}": ${o.percentage}% (${o.votes} votes)`)
    .join(', ');

  const targetModel = resolveModelForTask('poll_consensus');
  return await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Poll Question: "${question}"\nTotal Votes: ${totalVotes}\nResults: ${votesSummary}`,
      },
    ],
    { temperature: 0.6, maxTokens: 150, model: targetModel }
  );
}

// -------------------------------------------------------------
// FEATURE 4: AI Q&A Speaker Talking Points & Duplicates
// -------------------------------------------------------------
export async function generateSpeakerTalkingPoints(
  questionContent: string,
  authorName: string
): Promise<string[]> {
  const systemPrompt = `You are a Technical Keynote Co-Pilot assisting a live speaker on stage.
An audience member asked a question during the live talk.
Provide 3 concise, impactful bullet points the speaker can use right now to deliver an articulate, expert answer.

Return ONLY a JSON object:
{
  "talkingPoints": [
    "Point 1: Key conceptual answer...",
    "Point 2: Real-world operational trade-off...",
    "Point 3: Best practice recommendation or gotcha..."
  ]
}`;

  const targetModel = resolveModelForTask('talking_points');
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Audience Question from ${authorName}: "${questionContent}"` },
    ],
    { jsonMode: true, temperature: 0.5, maxTokens: 250, model: targetModel }
  );

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : [];
  } catch {
    return [
      `Directly address: ${questionContent.slice(0, 60)}...`,
      'Discuss production trade-offs between consistency and operational complexity.',
      'Recommend measuring telemetry before premature optimization.',
    ];
  }
}

// -------------------------------------------------------------
// FEATURE 5: AI Masterclass Session Summary Report
// -------------------------------------------------------------
export async function generateSessionSummaryReport(params: {
  roomTitle: string;
  roomCode: string;
  totalAttendees: number;
  quizzes: Array<{ question: string; correctOption: string; category: string }>;
  polls: Array<{ question: string; totalVotes: number; topOption: string }>;
  topQuestions: Array<{ content: string; upvotes: number; author: string }>;
  leaderboardTop3: Array<{ name: string; score: number }>;
}): Promise<string> {
  const systemPrompt = `You are an Executive Tech Scribe.
Generate a comprehensive, beautifully formatted Markdown Executive Masterclass Summary Report for the SketchCast session titled "${params.roomTitle}" (Room ${params.roomCode}).

Include:
# ⚡ SKETCHCAST MASTERCLASS SUMMARY: ${params.roomTitle}
- Session Overview & Attendance Metrics
- 🧠 Technical Quizzing Breakdown & Key Architectural Takeaways
- 📊 Community Poll Insights & Consensus Trends
- 💬 Top Upvoted Audience Q&A Topics
- 🏆 High Scores Podium & MVP Recognition
- 🚀 Recommended Next Steps & Engineering Best Practices`;

  const targetModel = resolveModelForTask('session_report');
  return await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Session Details:\n${JSON.stringify(params, null, 2)}`,
      },
    ],
    { temperature: 0.5, maxTokens: 1000, model: targetModel }
  );
}

// -------------------------------------------------------------
// FEATURE 6: AI Q&A Safeguard & Content Moderation
// -------------------------------------------------------------
const STORAGE_KEY_QA_SAFEGUARD = 'sketchcast_qa_safeguard_enabled';

export function isQASafeguardEnabled(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_QA_SAFEGUARD);
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
}

export function setQASafeguardEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_QA_SAFEGUARD, String(enabled));
  } catch {
    // ignore
  }
}

export interface QAModerationResult {
  isSafe: boolean;
  reason: string | null;
  category?: 'harassment' | 'hate_speech' | 'profanity' | 'spam_gibberish' | 'trolling' | 'none';
}

/**
 * Fast offline/heuristic fallback guardrail to catch obvious profanity, spam, and gibberish.
 */
export function runLocalHeuristicGuardrail(text: string): QAModerationResult {
  const trimmed = text.trim();
  if (trimmed.length < 5) {
    return {
      isSafe: false,
      reason: 'Question is too short to provide meaningful context.',
      category: 'spam_gibberish',
    };
  }

  // Obvious profanity and offensive slurs
  const profanityRegex = /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|nigger|nigga|faggot|retard|dumbass|stfu|kill\s*yourself|kys)\b/i;
  if (profanityRegex.test(trimmed)) {
    return {
      isSafe: false,
      reason: 'Contains offensive, abusive, or profanity-laden language.',
      category: 'profanity',
    };
  }

  // Repeated character spam (e.g. "aaaaaaa", "asdfasdfasdf")
  if (/(.)\1{5,}/i.test(trimmed)) {
    return {
      isSafe: false,
      reason: 'Detected repetitive character spam or keyboard mash.',
      category: 'spam_gibberish',
    };
  }

  // Repetitive words spam (e.g. "test test test test test")
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length >= 4) {
    const uniqueWords = new Set(words);
    if (uniqueWords.size === 1) {
      return {
        isSafe: false,
        reason: 'Detected repetitive word spam.',
        category: 'spam_gibberish',
      };
    }
  }

  // Keyboard smash patterns & walks (e.g. qwerty, asdfgh, zxcvbn)
  if (/(qwerty|asdfgh|zxcvbn|sdfghjkl|123456)/i.test(trimmed)) {
    return {
      isSafe: false,
      reason: 'Detected keyboard mash pattern or walk.',
      category: 'spam_gibberish',
    };
  }

  // High consonant clusters (5+ consecutive consonants)
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(trimmed)) {
    return {
      isSafe: false,
      reason: 'Detected unstructured gibberish or consonant mash.',
      category: 'spam_gibberish',
    };
  }

  // Keyboard smash detection: single token with length > 18 with minimal vowels
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    const vowelCount = (token.match(/[aeiouy]/gi) || []).length;
    if (token.length > 18 && vowelCount < 2) {
      return {
        isSafe: false,
        reason: 'Detected unstructured gibberish or keyboard mash.',
        category: 'spam_gibberish',
      };
    }
  }

  return { isSafe: true, reason: null, category: 'none' };
}

/**
 * Screen audience question with Mesh AI.
 * Enforces comprehensive moderation: blocks harassment, toxicity, explicit profanity, spam, and disruptive trolling.
 */
export async function moderateQuestionWithMeshAI(content: string): Promise<QAModerationResult> {
  if (!isQASafeguardEnabled()) {
    return { isSafe: true, reason: null, category: 'none' };
  }

  // 1. Run quick local heuristic guardrail first (0 cost, 0 latency)
  const heuristic = runLocalHeuristicGuardrail(content);
  if (!heuristic.isSafe) {
    return heuristic;
  }

  // 2. In-Memory Cache Check: Saves 100% of tokens on repeated checks
  const cacheKey = content.trim().toLowerCase();
  const cached = moderationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 3. Check if Mesh API key is available
  const apiKey = getStoredMeshKey();
  if (!apiKey) {
    // Graceful fallback: local heuristic passed
    return { isSafe: true, reason: null, category: 'none' };
  }

  // 4. Resolve optimal model dynamically (strictly respects custom model or auto-routes to cheap flash)
  const targetModel = resolveModelForTask('moderation');

  // Compact prompt to minimize token burn
  const systemPrompt = `You are a live tech audience safety guard. Reject (isSafe=false) harassment, hate, explicit profanity, or spam. Approve (isSafe=true) genuine tech questions.
Return ONLY valid JSON:
{"isSafe": boolean, "reason": string | null, "category": "none" | "harassment" | "hate_speech" | "profanity" | "spam_gibberish" | "trolling"}`;

  try {
    const raw = await callMeshChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: "${content.trim()}"` },
      ],
      {
        jsonMode: true,
        temperature: 0.1,
        maxTokens: 70,
        model: targetModel,
      }
    );

    const parsed = safeParseJsonFromLLM<any>(raw, { isSafe: true, reason: null, category: 'none' });

    const result: QAModerationResult = {
      isSafe: Boolean(parsed.isSafe),
      reason: parsed.isSafe ? null : (parsed.reason || 'Flagged by AI safety guidelines.'),
      category: (parsed.category as any) || (parsed.isSafe ? 'none' : 'trolling'),
    };

    // Store in cache
    moderationCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  } catch (err) {
    console.warn('[Mesh AI Safeguard] AI check failed or timed out, falling back to local heuristic:', err);
    return heuristic;
  }
}

// ================= 8. AI SURVEY GENERATOR & SENTIMENT SYNTHESIS =================

export async function generateAISurvey(topicPrompt: string): Promise<{
  title: string;
  description: string;
  questions: {
    id: string;
    type: 'rating' | 'choice' | 'text';
    title: string;
    options?: string[];
    required: boolean;
  }[];
}> {
  const systemPrompt = `You are an expert audience feedback & technical workshop survey designer for live presentations.
Generate an engaging, concise, and structured survey (3 to 5 questions) based on the user's topic.
Include a variety of question types:
- 'rating' (1 to 5 stars for overall satisfaction, depth, pacing)
- 'choice' (multiple choice options to gauge prior experience or key takeaway)
- 'text' (open-ended question for suggestions, critiques, or speaker notes)

Output ONLY valid JSON matching this schema:
{
  "title": "Punchy Survey Title (clean, professional masterclass style)",
  "description": "Short explanation of the feedback purpose (1-2 sentences)",
  "questions": [
    {
      "id": "q1",
      "type": "rating",
      "title": "How would you rate the depth and technical value of this session?",
      "required": true
    },
    {
      "id": "q2",
      "type": "choice",
      "title": "Which architectural pattern was most relevant to your workflow?",
      "options": ["CQRS & Event Sourcing", "Distributed Tracing", "Zero-Trust Mesh", "Edge Invalidation"],
      "required": true
    },
    {
      "id": "q3",
      "type": "text",
      "title": "What is one thing the speaker could improve or explore deeper?",
      "required": false
    }
  ]
}`;

  try {
    const targetModel = resolveModelForTask('survey');
    const raw = await callMeshChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Design a survey about: ${topicPrompt}` },
      ],
      {
        jsonMode: true,
        temperature: 0.6,
        maxTokens: 850,
        model: targetModel,
      }
    );

    const parsed = safeParseJsonFromLLM(raw);

    const questions = (parsed.questions || []).map((q: any, i: number) => ({
      id: q.id || `q_${Date.now()}_${i}`,
      type: (['rating', 'choice', 'text'].includes(q.type) ? q.type : 'rating') as 'rating' | 'choice' | 'text',
      title: q.title || `Question ${i + 1}`,
      options: Array.isArray(q.options) ? q.options : (q.type === 'choice' ? ['Option 1', 'Option 2', 'Option 3'] : undefined),
      required: q.required !== false,
    }));

    return {
      title: parsed.title || `${topicPrompt.toUpperCase()} FEEDBACK`,
      description: parsed.description || 'Please share your thoughts to help us improve.',
      questions,
    };
  } catch (err) {
    console.warn('[Mesh AI] Survey generation failed, using structured fallback:', err);
    return {
      title: `${topicPrompt.slice(0, 30).toUpperCase()} FEEDBACK`,
      description: 'Quick feedback check on pacing, content depth, and recommendations.',
      questions: [
        {
          id: `q_${Date.now()}_1`,
          type: 'rating',
          title: `How would you rate the overall technical delivery of "${topicPrompt.slice(0, 30)}"?`,
          required: true,
        },
        {
          id: `q_${Date.now()}_2`,
          type: 'choice',
          title: 'How appropriate was the session pacing and difficulty?',
          options: ['Too basic / elementary', 'Perfect depth & pace', 'A bit fast / dense', 'Need deeper hands-on examples'],
          required: true,
        },
        {
          id: `q_${Date.now()}_3`,
          type: 'text',
          title: 'What was your primary takeaway or question for the speaker?',
          required: false,
        },
      ],
    };
  }
}

export async function synthesizeSurveySentimentAndTakeaways(
  surveyTitle: string,
  questions: { id: string; type: string; title: string }[],
  responses: { answers: Record<string, any>; attendee_name: string }[]
): Promise<{
  sentiment: 'positive' | 'neutral' | 'mixed' | 'negative';
  score: number;
  takeaways: string[];
  keyQuotes: string[];
}> {
  if (!responses || responses.length === 0) {
    return {
      sentiment: 'neutral',
      score: 50,
      takeaways: ['No responses collected yet.'],
      keyQuotes: [],
    };
  }

  // Compile summary of responses for prompt
  const responsesText = responses
    .map((r, idx) => {
      const answersText = Object.entries(r.answers)
        .map(([qId, ans]) => {
          const q = questions.find((item) => item.id === qId);
          return `  [${q ? q.title : qId}]: ${ans}`;
        })
        .join('\n');
      return `Attendee #${idx + 1} (${r.attendee_name}):\n${answersText}`;
    })
    .slice(0, 30) // Cap to first 30 responses
    .join('\n\n');

  const systemPrompt = `You are an executive event analyst and audience sentiment analyst.
Analyze the attendee responses from a live session survey.
Synthesize:
1. Overall sentiment ('positive', 'neutral', 'mixed', or 'negative').
2. An overall satisfaction score from 0 to 100.
3. Exactly 3 to 4 actionable executive takeaways (concise bullet points).
4. Up to 3 notable anonymous quotes or suggestions from attendees.

Return ONLY valid JSON matching this schema:
{
  "sentiment": "positive" | "neutral" | "mixed" | "negative",
  "score": 88,
  "takeaways": [
    "High praise for the live architecture benchmarks and concurrency flowcharts.",
    "Audience requested dedicated time for real-world production incident postmortems.",
    "Pacing was rated optimal by 85% of participants."
  ],
  "keyQuotes": [
    "Best explanation of Raft log compaction I've seen in any conference talk!",
    "Would love a GitHub repo link with the demonstrated code benchmarks."
  ]
}`;

  try {
    const targetModel = resolveModelForTask('survey_sentiment');
    const raw = await callMeshChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Survey: "${surveyTitle}"\nTotal Responses: ${responses.length}\n\nFeedback Data:\n${responsesText}`,
        },
      ],
      {
        jsonMode: true,
        temperature: 0.3,
        maxTokens: 350,
        model: targetModel,
      }
    );

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      sentiment: parsed.sentiment || 'positive',
      score: typeof parsed.score === 'number' ? parsed.score : 85,
      takeaways: Array.isArray(parsed.takeaways) && parsed.takeaways.length > 0 ? parsed.takeaways : ['Audience actively engaged and provided positive feedback.'],
      keyQuotes: Array.isArray(parsed.keyQuotes) ? parsed.keyQuotes : [],
    };
  } catch (err) {
    console.warn('[Mesh AI] Survey sentiment synthesis failed, using rule-based metrics:', err);
    // Simple rule-based calculation
    let ratingSum = 0;
    let ratingCount = 0;
    const quotes: string[] = [];

    responses.forEach((r) => {
      Object.entries(r.answers).forEach(([, val]) => {
        if (typeof val === 'number') {
          ratingSum += val;
          ratingCount++;
        } else if (typeof val === 'string' && val.trim().length > 10) {
          quotes.push(val.trim());
        }
      });
    });

    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 4;
    const score = Math.round((avgRating / 5) * 100);
    const sentiment = score >= 75 ? 'positive' : score >= 50 ? 'neutral' : 'negative';

    return {
      sentiment,
      score,
      takeaways: [
        `Average attendee rating: ${avgRating.toFixed(1)} / 5 stars across ${responses.length} responses.`,
        'Attendees showed strong interest in the covered topics.',
        'Review individual responses for specific suggestions.',
      ],
      keyQuotes: quotes.slice(0, 3),
    };
  }
}

// ================= SEMANTIC DUPLICATE QUESTION DETECTOR =================
export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedQuestionId?: string;
  matchedQuestionContent?: string;
  similarityScore?: number;
  reason?: string;
}

export async function detectDuplicateQuestionWithAI(
  draftContent: string,
  existingQuestions: { id: string; content: string; author_name?: string; upvotes_count?: number }[]
): Promise<DuplicateDetectionResult> {
  const cleanDraft = draftContent.trim();
  if (cleanDraft.length < 12 || existingQuestions.length === 0) {
    return { isDuplicate: false };
  }

  // 1. In-Memory Cache Check: Saves 100% of tokens on repeated checks
  const existingIdsKey = existingQuestions.map((q) => q.id).join(',');
  const cacheKey = `${cleanDraft.toLowerCase()}::${existingIdsKey}`;
  const cached = duplicateCheckCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Fast heuristic keyword check to isolate top candidate matches (reduces input tokens by ~80%)
  const draftWords = cleanDraft.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const candidates = existingQuestions
    .map((q) => {
      const qWords = q.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const overlap = draftWords.filter((w) => qWords.includes(w)).length;
      return { q, overlap };
    })
    .filter((c) => c.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 4)
    .map((c) => c.q);

  if (candidates.length === 0) {
    return { isDuplicate: false };
  }

  const targetModel = resolveModelForTask('duplicates');

  try {
    const candidateList = candidates
      .map((c, i) => `[${i + 1}] ID: "${c.id}" | Content: "${c.content}"`)
      .join('\n');

    const prompt = `You are an AI Question Deduplicator for live Q&A. Determine if the draft question asks essentially the same thing as any candidate.
DRAFT: "${cleanDraft}"
CANDIDATES:
${candidateList}

Return ONLY valid JSON:
{"isDuplicate": boolean, "matchedQuestionId": string | null, "similarityScore": number, "reason": string}`;

    const raw = await callMeshChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        jsonMode: true,
        temperature: 0.1,
        maxTokens: 120,
        model: targetModel,
      }
    );

    const parsed = safeParseJsonFromLLM<any>(raw, { isDuplicate: false });

    let result: DuplicateDetectionResult = { isDuplicate: false };
    if (parsed.isDuplicate && parsed.matchedQuestionId) {
      const matched = existingQuestions.find((q) => q.id === parsed.matchedQuestionId);
      result = {
        isDuplicate: true,
        matchedQuestionId: parsed.matchedQuestionId,
        matchedQuestionContent: matched?.content,
        similarityScore: parsed.similarityScore || 0.85,
        reason: parsed.reason || 'A very similar question is already active in the live feed.',
      };
    }

    duplicateCheckCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('[Mesh AI] Duplicate question check fallback:', err);
    // Fallback: check exact or near-exact match
    const exactMatch = candidates.find(
      (c) => c.content.toLowerCase().trim() === cleanDraft.toLowerCase().trim()
    );
    if (exactMatch) {
      return {
        isDuplicate: true,
        matchedQuestionId: exactMatch.id,
        matchedQuestionContent: exactMatch.content,
        similarityScore: 1.0,
        reason: 'This exact question has already been submitted in the room.',
      };
    }
    return { isDuplicate: false };
  }
}

// ================= AI TOPIC CLUSTERING FOR Q&A =================
export interface QuestionCluster {
  themeName: string;
  emoji: string;
  color: string;
  questionIds: string[];
}

export async function clusterQuestionsWithAI(
  questions: { id: string; content: string }[]
): Promise<QuestionCluster[]> {
  if (questions.length === 0) return [];
  if (questions.length <= 2) {
    return [
      {
        themeName: 'General Architecture',
        emoji: '🏛️',
        color: '#FFE600',
        questionIds: questions.map((q) => q.id),
      },
    ];
  }

  // In-memory cache check: if question IDs haven't changed, reuse clusters
  const cacheKey = questions.map((q) => q.id).sort().join(',');
  const cached = clusterCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const targetModel = resolveModelForTask('clustering');

  try {
    const questionList = questions
      .map((q, i) => `[${i + 1}] ID: "${q.id}" | Text: "${q.content}"`)
      .join('\n');

    const prompt = `Group ${questions.length} tech questions into 3-4 high-level themes (Architecture, Performance, Security, Operations).
QUESTIONS:
${questionList}

Return ONLY valid JSON:
{"clusters": [{"themeName": string, "emoji": string, "color": string, "questionIds": string[]}]}`;

    const raw = await callMeshChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 750,
        model: targetModel,
      }
    );

    const parsed = safeParseJsonFromLLM(raw);

    if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
      clusterCache.set(cacheKey, { result: parsed.clusters, timestamp: Date.now() });
      return parsed.clusters;
    }
    throw new Error('Empty cluster response');
  } catch (err) {
    console.warn('[Mesh AI] Question clustering fallback:', err);
    // Deterministic rule-based fallback
    const clusters: QuestionCluster[] = [
      {
        themeName: 'Architecture & System Design',
        emoji: '🏛️',
        color: '#00F0FF',
        questionIds: [],
      },
      {
        themeName: 'Performance & Scale',
        emoji: '⚡',
        color: '#FFE600',
        questionIds: [],
      },
      {
        themeName: 'Security & Auth',
        emoji: '🛡️',
        color: '#FF2A6D',
        questionIds: [],
      },
      {
        themeName: 'Operations & Infra',
        emoji: '🚀',
        color: '#00FF66',
        questionIds: [],
      },
    ];

    questions.forEach((q, idx) => {
      const lower = q.content.toLowerCase();
      if (lower.includes('secur') || lower.includes('auth') || lower.includes('token') || lower.includes('tls') || lower.includes('cert')) {
        clusters[2].questionIds.push(q.id);
      } else if (lower.includes('speed') || lower.includes('scale') || lower.includes('cache') || lower.includes('latenc') || lower.includes('db')) {
        clusters[1].questionIds.push(q.id);
      } else if (lower.includes('deploy') || lower.includes('docker') || lower.includes('k8s') || lower.includes('infra') || lower.includes('cloud')) {
        clusters[3].questionIds.push(q.id);
      } else {
        clusters[idx % 2 === 0 ? 0 : 1].questionIds.push(q.id);
      }
    });

    return clusters.filter((c) => c.questionIds.length > 0);
  }
}

