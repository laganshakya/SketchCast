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

import type { QuizQuestion, DifficultyTier } from '../types';

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
  JEV_1_13: 'typesafe/jev-1.13',
  XIAOMI_MIMO_V2_5: 'xiaomi/mimo-v2.5',
  DEEPSEEK_V4_FLASH: 'deepseek/deepseek-v4-flash',
  DEEPSEEK_V4_1_FLASH: 'deepseek/deepseek-v4.1-flash',
  GPT_4O_MINI: 'openai/gpt-4o-mini-2024-07-18',
  BALANCED_MINI: 'openai/gpt-4o-mini',
  GEMINI_2_5_FLASH: 'google/gemini-2.5-flash',
  LLAMA_3_3_70B: 'meta-llama/llama-3.3-70b-instruct',
} as const;

export const MESH_MODEL_OPTIONS = [
  {
    id: 'auto',
    name: 'Smart Router',
    provider: 'Powered by TypeSafe Jev 1.13',
    tag: 'INTELLIGENT ROUTER',
    description: 'Uses TypeSafe Jev-1.13 as a lightning-fast Traffic Controller: handles live Q&A moderation, safety guardrails, duplicate detection & sentiment itself, and routes quizzes, surveys & reports to the optimal models.',
  },
  {
    id: 'xiaomi/mimo-v2.5',
    name: 'Xiaomi MiMo V2.5',
    provider: 'Xiaomi',
    tag: '310B MoE FLAGSHIP',
    description: 'Massive 310B MoE model with 1M context. Exceptional deep reasoning for executive session reports, synthesis, and complex analysis.',
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
  {
    id: 'openai/gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    tag: 'ULTRA RELIABLE',
    description: 'Cheapest per-token pricing, blazing speed, and reliable structured parsing for moderation, quizzes, and surveys.',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    tag: 'BALANCED PRO',
    description: 'Next-gen multimodal reasoning, 1M context window, high speed, and low token cost.',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    tag: 'OPEN WEIGHTS',
    description: 'Flagship open weights intelligence with deep reasoning and coding proficiency.',
  },
];

const STORAGE_KEY_MESH_KEY = 'sketchcast_mesh_api_key';
const STORAGE_KEY_MESH_MODEL = 'sketchcast_mesh_selected_model';

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getStoredMeshKey(): string {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      const local = storage.getItem(STORAGE_KEY_MESH_KEY);
      if (local && local.trim()) return local.trim();
    }
  } catch {
    // ignore
  }
  return (import.meta.env?.VITE_MESH_API_KEY as string) || '';
}

export function setStoredMeshKey(key: string): void {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY_MESH_KEY, key.trim());
    }
  } catch {
    // ignore
  }
}

export function getStoredMeshModel(): string {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      const local = storage.getItem(STORAGE_KEY_MESH_MODEL);
      if (local && local.trim()) {
        const trimmed = local.trim();
        if (trimmed === 'auto' || trimmed === MESH_MODELS.AUTO) {
          return MESH_MODELS.AUTO;
        }
        // Jev-1.13 is the internal traffic controller inside Smart Router; route user to auto
        if (trimmed === 'typesafe/jev-1.13' || trimmed.includes('jev-1.13')) {
          return MESH_MODELS.AUTO;
        }
        // Migrate old removed model strings
        if (trimmed.includes('claude-3.5-sonnet') || trimmed.includes('claude-3-haiku') || trimmed.includes('deepseek-r1')) {
          return MESH_MODELS.AUTO;
        }
        return trimmed;
      }
    }
  } catch {
    // ignore
  }
  return MESH_MODELS.AUTO;
}

export function setStoredMeshModel(model: string): void {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY_MESH_MODEL, model.trim());
    }
  } catch {
    // ignore
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
 * If in 'auto' mode (Smart Router), task-specific cost optimization routes to the cheapest reliable model.
 */
export function resolveModelForTask(taskType: MeshTaskType, explicitModel?: string): string {
  const chosenModel = explicitModel || getStoredMeshModel();

  // If host selected a specific model or entered a custom model, strictly honor it!
  if (chosenModel && chosenModel !== 'auto' && chosenModel !== MESH_MODELS.AUTO) {
    return chosenModel;
  }

  // Dynamic Smart Router Selection (Task-specific optimization to save maximum credits and tokens)
  switch (taskType) {
    case 'moderation':
    case 'duplicates':
      // High-frequency classification: use ultra-cheap ($0.042/1M tokens) TypeSafe Jev 1.13
      return MESH_MODELS.JEV_1_13;
    case 'quiz':
    case 'survey':
    case 'talking_points':
    case 'poll_consensus':
      // Fast structured schema generation: ultra-fast latency DeepSeek Flash
      return MESH_MODELS.DEEPSEEK_V4_FLASH;
    case 'clustering':
      // Schema adherence for nested array-of-objects grouping
      return MESH_MODELS.GPT_4O_MINI;
    case 'survey_sentiment':
      return MESH_MODELS.JEV_1_13;
    case 'session_report':
      // Multi-dimensional synthesis: deep reasoning 310B MoE Xiaomi MiMo V2.5
      return MESH_MODELS.XIAOMI_MIMO_V2_5;
    default:
      return MESH_MODELS.DEEPSEEK_V4_FLASH;
  }
}

// In-Memory Credit-Saver Caches (Memoizes identical requests to save 100% of tokens on repeated checks)
const moderationCache = new Map<string, { result: QAModerationResult; timestamp: number }>();
const duplicateCheckCache = new Map<string, { result: DuplicateDetectionResult; timestamp: number }>();
const clusterCache = new Map<string, { result: QuestionCluster[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

export interface MeshEvaluateOptions {
  apiKey?: string;
  model?: string;
}

export interface MeshEvaluateResponse {
  id?: string;
  model?: string;
  answers?: Record<string, any>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Calls TypeSafe Jev-1.13 (or other System One evaluation models) via /v1/evaluate
 * Delivers sub-second, calibrated choices, probabilities, and scores at $0.042/1M tokens.
 */
export async function callMeshEvaluate(
  state: string,
  questions: Record<string, any>,
  options: MeshEvaluateOptions = {}
): Promise<MeshEvaluateResponse> {
  const apiKey = options.apiKey || getStoredMeshKey();
  const model = options.model || MESH_MODELS.JEV_1_13;

  const payload = {
    model,
    state,
    questions,
  };

  // --- Tier 1: Supabase Edge Function ---
  const edgeFunctionUrl = getSupabaseEdgeFunctionUrl();
  const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3JseWpkbnR3Z3Z6Z2Z4cGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzU5NzYsImV4cCI6MjEwMjk1MTk3Nn0.sqkO1wWH-g1RW6osbLaZN-1QXeKnTtfcgjxxcIL4q8k';

  if (edgeFunctionUrl) {
    try {
      const edgeRes = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'x-mesh-endpoint': 'evaluate',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json().catch(() => null);
        if (edgeJson?.answers) {
          return edgeJson;
        }
      }
    } catch {
      // Fallback seamlessly to direct gateway
    }
  }

  if (!apiKey) {
    throw new Error('Mesh API Key missing. Please click "AI SETTINGS" in the header to enter your rsk_... key.');
  }

  // --- Tier 2: Vite proxy / Direct Mesh API ---
  const baseUrl = getMeshApiBaseUrl();
  const evaluateUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/evaluate` : `${baseUrl}/v1/evaluate`;
  const directEvaluateUrl = 'https://api.meshapi.ai/v1/evaluate';

  let response: Response | null = null;
  let lastError: any = null;

  try {
    const res = await fetch(evaluateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (
      (!res.ok && (res.status === 404 || res.status === 405 || res.status === 502)) ||
      contentType.includes('text/html')
    ) {
      if (evaluateUrl !== directEvaluateUrl) {
        response = await fetch(directEvaluateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = res;
      }
    } else {
      response = res;
    }
  } catch (err: any) {
    lastError = err;
    if (evaluateUrl !== directEvaluateUrl) {
      try {
        response = await fetch(directEvaluateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (directErr: any) {
        lastError = directErr;
      }
    }
  }

  if (!response) {
    throw new Error(`Connection failed: ${lastError?.message || 'Network error'}.`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `Mesh API Evaluate Error (${response.status}): ${errorText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.error?.message) msg = parsed.error.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return await response.json();
}

/**
 * Smart Router Dynamic Traffic Controller (powered by TypeSafe Jev 1.13)
 * When an arbitrary request is dispatched, Jev-1.13 acts as the lightning-fast "Traffic Controller",
 * classifying tasks into the optimal model lane:
 * - Live moderation, safety checks, duplicate detection, sentiment -> Jev-1.13 handles directly!
 * - Quizzes, trivia, polls -> DeepSeek Flash
 * - Executive Masterclass Reports -> Xiaomi MiMo-V2.5 (310B MoE)
 * - Strict schema clustering -> GPT-4o Mini
 */
export async function routeTaskWithJev(
  promptOrContent: string,
  explicitTask?: MeshTaskType
): Promise<{ model: string; lane: string; confidence: number; reason: string }> {
  // If task is explicit, map directly
  if (explicitTask) {
    const directModel = resolveModelForTask(explicitTask);
    return {
      model: directModel,
      lane: explicitTask,
      confidence: 1.0,
      reason: `Direct task mapping for ${explicitTask}`,
    };
  }

  try {
    const evalRes = await callMeshEvaluate(
      promptOrContent.slice(0, 1000),
      {
        target_lane: {
          type: 'choice',
          instructions: 'What is the optimal AI execution lane for this user request or content?',
          criteria: {
            guardrail_decision: 'Micro-decisions, content moderation, duplicate checking, or safety filtering',
            fast_interactive: 'Generating quizzes, trivia, surveys, quick questions, or polls',
            deep_synthesis: 'Generating comprehensive executive summaries, masterclass reports, deep analysis, or long-form synthesis',
            structured_data: 'Grouping or clustering complex data objects into strict JSON categories',
          },
        },
      },
      { model: MESH_MODELS.JEV_1_13 }
    );

    const lane = evalRes?.answers?.target_lane?.choice || 'fast_interactive';
    const confidence = evalRes?.answers?.target_lane?.confidence ?? 0.95;

    switch (lane) {
      case 'guardrail_decision':
        return {
          model: MESH_MODELS.JEV_1_13,
          lane,
          confidence,
          reason: 'Handled by Jev-1.13 directly for sub-second, sub-cent decision',
        };
      case 'deep_synthesis':
        return {
          model: MESH_MODELS.XIAOMI_MIMO_V2_5,
          lane,
          confidence,
          reason: 'Routed to Xiaomi MiMo-V2.5 310B MoE for deep executive synthesis',
        };
      case 'structured_data':
        return {
          model: MESH_MODELS.GPT_4O_MINI,
          lane,
          confidence,
          reason: 'Routed to GPT-4o Mini for strict JSON schema compliance',
        };
      case 'fast_interactive':
      default:
        return {
          model: MESH_MODELS.DEEPSEEK_V4_FLASH,
          lane,
          confidence,
          reason: 'Routed to DeepSeek Flash for high-speed interactive generation',
        };
    }
  } catch (err) {
    console.warn('[Smart Router] Jev traffic controller fallback:', err);
    return {
      model: MESH_MODELS.DEEPSEEK_V4_FLASH,
      lane: 'fast_interactive',
      confidence: 0.8,
      reason: 'Fallback to DeepSeek Flash default',
    };
  }
}

export async function callMeshChatCompletion(
  messages: MeshChatMessage[],
  options: MeshCompletionOptions = {}
): Promise<string> {
  const apiKey = options.apiKey || getStoredMeshKey();
  const rawModel = options.model || getStoredMeshModel();
  const model = (rawModel === 'auto' || rawModel === MESH_MODELS.AUTO)
    ? MESH_MODELS.DEEPSEEK_V4_FLASH
    : rawModel;

  // If Jev 1.13 was explicitly selected as global model but a generative completion is requested,
  // route generative text to high-speed DeepSeek Flash (since Jev is a System One decision evaluator)
  const effectiveModel = model === MESH_MODELS.JEV_1_13
    ? MESH_MODELS.DEEPSEEK_V4_FLASH
    : model;

  const {
    temperature = 0.7,
    maxTokens = 1250,
    jsonMode = false,
  } = options;

  // Xiaomi MiMo models use reasoning tokens before content; ensure sufficient token headroom
  const effectiveMaxTokens = (effectiveModel.includes('mimo') && maxTokens < 600)
    ? 600
    : maxTokens;

  const payload: Record<string, any> = {
    model: effectiveModel,
    messages,
    temperature,
    max_tokens: effectiveMaxTokens,
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
        const edgeContent = edgeJson?.choices?.[0]?.message?.content || edgeJson?.choices?.[0]?.message?.reasoning;
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
    if (effectiveModel !== MESH_MODELS.GPT_4O_MINI && effectiveModel !== MESH_MODELS.DEEPSEEK_V4_FLASH) {
      console.warn(`[Mesh API] Model "${effectiveModel}" failed (${message}). Retrying with fallback "${MESH_MODELS.GPT_4O_MINI}"...`);
      return callMeshChatCompletion(messages, {
        ...options,
        model: MESH_MODELS.GPT_4O_MINI,
      });
    }

    throw new Error(message);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning;
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

  // If testing TypeSafe Jev 1.13 specifically, test the evaluate endpoint
  if (rawModel === MESH_MODELS.JEV_1_13) {
    try {
      const evalRes = await callMeshEvaluate(
        'System connectivity ping test',
        {
          ping: {
            type: 'noul',
            instructions: 'Is this message a system ping check?',
          },
        },
        { apiKey: keyToUse, model: MESH_MODELS.JEV_1_13 }
      );
      const conf = evalRes?.answers?.ping?.noul ?? 1.0;
      return {
        success: true,
        message: `Connected successfully! (Model: ${rawModel} via System One Evaluate, calibrated response: ${conf}).`,
        modelUsed: rawModel,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Connection failed to Mesh Evaluate gateway.',
        modelUsed: rawModel,
      };
    }
  }

  const targetModel = (rawModel === 'auto' || rawModel === MESH_MODELS.AUTO)
    ? MESH_MODELS.DEEPSEEK_V4_FLASH
    : rawModel;

  const testMaxTokens = targetModel.includes('mimo') ? 250 : 25;

  try {
    const text = await callMeshChatCompletion(
      [{ role: 'user', content: 'Respond with exactly: "MESH_API_ONLINE"' }],
      { apiKey: keyToUse, model: targetModel, maxTokens: testMaxTokens, temperature: 0.1 }
    );

    return {
      success: true,
      message: `Connected successfully! (Model: ${targetModel}${rawModel === 'auto' ? ' via Smart Router' : ''}) Output: ${text.trim()}`,
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
export type QuizQuestionFormat = 'mixed' | 'multiple_choice' | 'short_answer';

export interface GeneratedAIQuestion {
  category: string;
  question: string;
  questionType?: 'multiple_choice' | 'short_answer';
  expectedAnswer?: string;
  acceptableAnswers?: string[];
  optA?: string;
  optB?: string;
  optC?: string;
  optD?: string;
  correctOpt?: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  timeLimitSeconds: number;
}

/**
 * Intelligently calculates an ergonomic, realistic time limit in seconds
 * based on question length, option complexity, technical syntax/code presence,
 * and cognitive difficulty tier.
 *
 * Prevents audience time pressure where complex/long questions cannot even be read
 * before the round ends.
 */
export function calculateDynamicQuestionTimeLimit(
  questionText: string,
  options: Array<{ text?: string } | string> = [],
  difficultyTier?: 'Junior' | 'Mid' | 'Senior' | 'Principal' | string,
  suggestedSeconds?: number
): number {
  // 1. Calculate word counts
  const cleanQ = (questionText || '').trim();
  const questionWords = cleanQ.split(/\s+/).filter(Boolean).length;

  const optionsText = options
    .map((o) => (typeof o === 'string' ? o : o.text || ''))
    .join(' ');
  const cleanOptions = optionsText.trim();
  const optionsWords = cleanOptions.split(/\s+/).filter(Boolean).length;
  const totalWords = questionWords + optionsWords;

  // 2. Detect technical code, backticks, syntax symbols, or JSON/code snippets
  const hasCodeSnippet = /[`{}[\]();<>\x2f\\=]/.test(cleanQ) || /```/.test(cleanQ) || /`[^`]+`/.test(cleanQ);
  const codeBonusSeconds = hasCodeSnippet ? 12 : 0;

  // 3. Technical reading speed calculation
  // Human technical reading speed with cognitive comprehension: ~2.5 words per second
  // Reading time (seconds) = totalWords / 2.5 (approx 0.4 seconds per word)
  const readingTimeSeconds = Math.ceil(totalWords * 0.4);

  // 4. Cognitive decision / comparison buffer based on difficulty tier
  const tier = (difficultyTier || '').toLowerCase();
  let difficultyBuffer = 20;
  let minimumFloor = 35;

  if (tier === 'principal') {
    difficultyBuffer = 35;
    minimumFloor = 70; // Principal questions should NEVER be under 70s
  } else if (tier === 'senior') {
    difficultyBuffer = 28;
    minimumFloor = 55; // Senior questions should NEVER be under 55s
  } else if (tier === 'mid') {
    difficultyBuffer = 22;
    minimumFloor = 45; // Mid questions should NEVER be under 45s
  } else {
    // Junior or unclassified
    difficultyBuffer = 18;
    minimumFloor = 35; // Junior questions should NEVER be under 35s
  }

  // 5. Length scaling bonus: long questions require re-reading and option elimination
  let lengthBonus = 0;
  if (totalWords > 120) {
    lengthBonus = 22;
  } else if (totalWords > 80) {
    lengthBonus = 14;
  } else if (totalWords > 50) {
    lengthBonus = 8;
  }

  // Calculated ideal time
  const calculatedTime = readingTimeSeconds + difficultyBuffer + codeBonusSeconds + lengthBonus;

  // If AI suggested something higher, honor it up to 120s
  const baseTime = Math.max(minimumFloor, calculatedTime, suggestedSeconds || 0);

  // Return clamped between minimumFloor and 120s
  return Math.min(120, Math.max(minimumFloor, baseTime));
}

export function buildQuizFormatInstructions(format: QuizQuestionFormat, count: number): string {
  if (format === 'short_answer') {
    return `FORMAT REQUIREMENT: ALL ${count} questions MUST be freeform short-answer questions (auto-evaluated via semantic grader).
- "questionType": "short_answer"
- "expectedAnswer": The canonical, concise correct technical term, command, algorithm, complexity, or keyword (1 to 4 words, e.g. "git cherry-pick", "O(1)", "CAP theorem", "raft", "optimistic concurrency control").
- "acceptableAnswers": Array of 2 to 4 acceptable synonyms, abbreviations, casing variations, or alternative spellings (e.g. ["cherry pick", "git-cherry-pick"]).
- "optA": set to expectedAnswer, "optB": "Other", "correctOpt": "A".
- "explanation": Concise 1-2 sentence educational explanation detailing why this is correct.
- "timeLimitSeconds": 30 to 45 seconds.`;
  }

  if (format === 'multiple_choice') {
    return `FORMAT REQUIREMENT: ALL ${count} questions MUST be 4-option multiple-choice questions.
- "questionType": "multiple_choice"
- 4 distinct, standalone options (optA, optB, optC, optD). Do NOT use "All of the above" or "None of the above".
- Distribute correctOpt evenly across ('A', 'B', 'C', 'D'). Randomize which option is correct so 'A' is NOT always the answer.
- "explanation": Concise 1-2 sentence educational explanation.
- "timeLimitSeconds": 45 to 80 seconds based on reading complexity.`;
  }

  // mixed format: balanced blend
  const shortCount = Math.max(1, Math.floor(count / 2));
  const mcCount = count - shortCount;
  return `FORMAT REQUIREMENT: Provide a BALANCED MIX of ${mcCount} multiple-choice question(s) AND ${shortCount} freeform short-answer question(s).
1. For multiple-choice questions:
   - "questionType": "multiple_choice"
   - 4 distinct standalone options: "optA", "optB", "optC", "optD".
   - "correctOpt": 'A', 'B', 'C', or 'D'.
   - "timeLimitSeconds": 45 to 80 seconds.
2. For short-answer questions:
   - "questionType": "short_answer"
   - "expectedAnswer": Canonical concise technical answer (1 to 4 words, e.g. "git cherry-pick", "O(1)", "CAP theorem", "raft").
   - "acceptableAnswers": Array of 2 to 4 acceptable synonyms, abbreviations, or alternative phrasings.
   - "optA": set to expectedAnswer, "optB": "Other", "correctOpt": "A".
   - "timeLimitSeconds": 30 to 45 seconds.
3. Educational "explanation" (1-2 sentences) for every question.`;
}

export function parseRawGeneratedQuestions(
  rawList: any[],
  defaultCategory: string,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior',
  requestedFormat: QuizQuestionFormat = 'mixed'
): GeneratedAIQuestion[] {
  return rawList.map((q: any, idx: number) => {
    const isShortExplicit = q.questionType === 'short_answer';
    const hasExpectedAnswer = Boolean(q.expectedAnswer && String(q.expectedAnswer).trim().length > 0);
    const lacksMultipleOptions = !q.optB || q.optB === 'Other' || q.optB === q.optA;

    // Determine if this question should be treated as short_answer
    const isShort = isShortExplicit || (requestedFormat === 'short_answer') || (hasExpectedAnswer && lacksMultipleOptions);

    const cleanExpected = (
      q.expectedAnswer ||
      (q.correctOpt && q[`opt${q.correctOpt}`]) ||
      q.optA ||
      'Correct'
    ).trim();

    const acceptableArr: string[] = Array.isArray(q.acceptableAnswers)
      ? q.acceptableAnswers.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof q.acceptableAnswers === 'string'
      ? q.acceptableAnswers.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (isShort) {
      return {
        category: q.category || defaultCategory,
        question: q.question || `Technical Question ${idx + 1}`,
        questionType: 'short_answer' as const,
        expectedAnswer: cleanExpected,
        acceptableAnswers: acceptableArr,
        optA: cleanExpected,
        optB: 'Other',
        optC: '',
        optD: '',
        correctOpt: 'A' as const,
        explanation: q.explanation || `Ground truth expected answer: ${cleanExpected}`,
        timeLimitSeconds: calculateDynamicQuestionTimeLimit(
          q.question || `Technical Question ${idx + 1}`,
          [cleanExpected],
          difficulty,
          q.timeLimitSeconds || 35
        ),
      };
    }

    const optA = q.optA || q.options?.[0]?.text || 'Option A';
    const optB = q.optB || q.options?.[1]?.text || 'Option B';
    const optC = q.optC || q.options?.[2]?.text || 'Option C';
    const optD = q.optD || q.options?.[3]?.text || 'Option D';
    const correctOpt = (['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D';

    return {
      category: q.category || defaultCategory,
      question: q.question || `Technical Question ${idx + 1}`,
      questionType: 'multiple_choice' as const,
      optA,
      optB,
      optC,
      optD,
      correctOpt,
      explanation: q.explanation || 'Verified architectural concept.',
      timeLimitSeconds: calculateDynamicQuestionTimeLimit(
        q.question || `Technical Question ${idx + 1}`,
        [optA, optB, optC, optD],
        difficulty,
        q.timeLimitSeconds
      ),
    };
  });
}

/**
 * Distributes correct answer options evenly across A, B, C, and D.
 * Prevents LLM bias where Option A is disproportionately set as the correct answer.
 * Preserves short_answer questions untouched.
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
    // Preserve short-answer questions as-is without scrambling options
    if (q.questionType === 'short_answer') {
      return q;
    }

    const options = [
      { key: 'A', text: q.optA || 'Option A' },
      { key: 'B', text: q.optB || 'Option B' },
      { key: 'C', text: q.optC || 'Option C' },
      { key: 'D', text: q.optD || 'Option D' },
    ];

    // Don't reposition if options contain relative terms like "all of the above"
    const hasRelativeReference = options.some((o) =>
      /\b(all of the above|none of the above|both [a-d]|neither|above|below)\b/i.test(o.text)
    );
    if (hasRelativeReference) {
      return q;
    }

    const currentCorrectKey = (['A', 'B', 'C', 'D'].includes(q.correctOpt || '') ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D';
    const correctText = q[`opt${currentCorrectKey}` as 'optA' | 'optB' | 'optC' | 'optD'] || q.optA || 'Option A';
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
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior',
  format: QuizQuestionFormat = 'mixed'
): Promise<GeneratedAIQuestion[]> {
  const formatInstructions = buildQuizFormatInstructions(format, count);

  const systemPrompt = `You are a Principal Software Architect and Technical Quiz Master.
Your goal is to generate ${count} high-caliber, practical technical quiz questions for a live tech session on the topic: "${topic}".
Difficulty level: ${difficulty}.

${formatInstructions}

GENERAL REQUIREMENTS:
1. Each question must test real-world architectural principles, distributed systems, code trade-offs, security, internals, or concurrency.
2. Provide a clear, educational "explanation" (1-2 sentences) detailing why the answer is correct and why common pitfalls fail.
3. Set realistic, generous timeLimitSeconds based on question length and difficulty tier so participants have ample time to read and evaluate trade-offs: Junior: 35-45s, Mid: 45-60s, Senior: 60-80s, Principal: 75-100s. Never rush reading complex questions.

Return ONLY a valid JSON object matching this schema without any markdown formatting or commentary:
{
  "questions": [
    {
      "category": "${topic.slice(0, 20)}",
      "question": "Question prompt here...",
      "questionType": "multiple_choice",
      "optA": "Option A text...",
      "optB": "Option B text...",
      "optC": "Option C text...",
      "optD": "Option D text...",
      "correctOpt": "C",
      "explanation": "Concise architectural explanation...",
      "timeLimitSeconds": 60
    },
    {
      "category": "${topic.slice(0, 20)}",
      "question": "Short answer question prompt...",
      "questionType": "short_answer",
      "expectedAnswer": "git cherry-pick",
      "acceptableAnswers": ["cherry pick", "git-cherry-pick"],
      "optA": "git cherry-pick",
      "optB": "Other",
      "correctOpt": "A",
      "explanation": "Concise architectural explanation...",
      "timeLimitSeconds": 40
    }
  ]
}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} technical questions (${format} format) on "${topic}" at ${difficulty} level. Return ONLY valid raw JSON.` },
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

  const rawQuestions = parseRawGeneratedQuestions(list, topic.slice(0, 20), difficulty, format);
  return distributeQuestionOptions(rawQuestions);
}

export interface AdaptivePromptParams {
  topic: string;
  currentDifficulty: DifficultyTier;
  targetDifficulty: DifficultyTier;
  previousQuestion?: string;
  previousCorrectAnswer?: string;
  accuracyPct: number;
  questionNumber: number;
  totalQuestions: number;
  adaptationType: 'level_up' | 'stepped_down' | 'maintained';
  format?: QuizQuestionFormat;
}

export async function generateAdaptiveFollowUpQuestion(
  params: AdaptivePromptParams
): Promise<QuizQuestion> {
  const {
    topic,
    currentDifficulty,
    targetDifficulty,
    previousQuestion,
    previousCorrectAnswer,
    accuracyPct,
    questionNumber,
    totalQuestions,
    adaptationType,
    format = 'mixed',
  } = params;

  const isShortTarget =
    format === 'short_answer' ||
    (format === 'mixed' && (questionNumber || 1) % 2 === 0);

  let adaptationDirective = '';
  if (adaptationType === 'level_up') {
    adaptationDirective = `The audience solved the previous question with high accuracy (${Math.round(accuracyPct)}%)!
LEVEL UP: Elevate the difficulty from ${currentDifficulty} to ${targetDifficulty}.
Focus on deeper architectural edge cases, high concurrency, failure recovery, internal runtime trade-offs, or subtleties that challenge experienced engineers.`;
  } else if (adaptationType === 'stepped_down') {
    adaptationDirective = `The audience found the previous question difficult (only ${Math.round(accuracyPct)}% accuracy).
STEP DOWN: Adjust difficulty from ${currentDifficulty} down to ${targetDifficulty}.
Focus on foundational mental models, fundamental architecture rules, and clear practical trade-offs to anchor understanding.`;
  } else {
    adaptationDirective = `The audience achieved a balanced accuracy of ${Math.round(accuracyPct)}%.
MAINTAIN TIER: Keep the difficulty tier steady at ${targetDifficulty}.
Explore another vital practical aspect or common design pattern within "${topic}".`;
  }

  const formatRequirement = isShortTarget
    ? `REQUIREMENT: Generate ONE short-answer engineering question (evaluated via semantic grader).
- "questionType": "short_answer"
- "expectedAnswer": The canonical concise technical term, keyword, or command (1-4 words).
- "acceptableAnswers": Array of 2-4 synonyms or alternative phrasings.
- "optA": set to expectedAnswer, "optB": "Other", "correctOpt": "A".
- "explanation": 1-2 sentence architectural takeaway.
- "timeLimitSeconds": 30-45s.`
    : `REQUIREMENT: Generate ONE 4-option multiple-choice engineering question.
- "questionType": "multiple_choice"
- 4 distinct options (optA, optB, optC, optD).
- Assign correctOpt evenly among A, B, C, or D.
- "explanation": 1-2 sentence educational explanation.
- "timeLimitSeconds": 45-80s based on complexity.`;

  const systemPrompt = `You are an Adaptive Masterclass Technical Quiz Engine.
You craft exactly ONE challenge tailored dynamically to real-time audience performance.
Topic: "${topic}".
Target Difficulty Tier: ${targetDifficulty}.

Adaptive Context:
${adaptationDirective}

${previousQuestion ? `Previous Question: "${previousQuestion}"` : ''}
${previousCorrectAnswer ? `Previous Answer: "${previousCorrectAnswer}"` : ''}

${formatRequirement}

Return ONLY valid JSON matching this schema:
{
  "category": "${topic.slice(0, 20)}",
  "question": "Clear technical question...",
  "questionType": "${isShortTarget ? 'short_answer' : 'multiple_choice'}",
  ${isShortTarget ? `"expectedAnswer": "canonical answer...",\n  "acceptableAnswers": ["alias 1", "alias 2"],\n  ` : ''}"optA": "Option A...",
  "optB": "Option B...",
  "optC": "Option C...",
  "optD": "Option D...",
  "correctOpt": "A",
  "explanation": "Architectural takeaway...",
  "timeLimitSeconds": ${isShortTarget ? 35 : 60}
}`;

  const targetModel = resolveModelForTask('quiz');
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Synthesize Adaptive Question #${questionNumber} of ${totalQuestions} for "${topic}" at ${targetDifficulty} tier. Return raw JSON.`,
      },
    ],
    { jsonMode: true, temperature: 0.7, maxTokens: 900, model: targetModel }
  );

  let parsed: any;
  try {
    parsed = safeParseJsonFromLLM(raw);
  } catch {
    throw new Error('Failed to parse Adaptive AI Question JSON.');
  }

  const q = parsed?.questions?.[0] || parsed;
  const qId = `adaptive-q-${Date.now()}-${questionNumber}`;

  const isShortResult =
    format === 'short_answer'
      ? true
      : format === 'multiple_choice'
      ? false
      : (q.questionType === 'short_answer' || Boolean(q.expectedAnswer) || isShortTarget);
  const cleanExpected = (
    q.expectedAnswer ||
    (q.correctOpt && q[`opt${q.correctOpt}`]) ||
    q.optA ||
    'Correct'
  ).trim();
  const acceptableList: string[] = Array.isArray(q.acceptableAnswers)
    ? q.acceptableAnswers.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  return {
    id: qId,
    category: q.category || topic.slice(0, 20),
    question: q.question || `${topic} Challenge #${questionNumber}`,
    questionType: isShortResult ? 'short_answer' : 'multiple_choice',
    expectedAnswer: isShortResult ? cleanExpected : undefined,
    acceptableAnswers: isShortResult ? acceptableList : undefined,
    options: isShortResult
      ? [
          { id: 'A', text: cleanExpected },
          { id: 'B', text: 'Other' },
        ]
      : [
          { id: 'A', text: q.optA || 'Option A' },
          { id: 'B', text: q.optB || 'Option B' },
          { id: 'C', text: q.optC || 'Option C' },
          { id: 'D', text: q.optD || 'Option D' },
        ],
    correctOptionId: isShortResult ? 'A' : ((['A', 'B', 'C', 'D'].includes(q.correctOpt) ? q.correctOpt : 'A') as 'A' | 'B' | 'C' | 'D'),
    explanation: q.explanation || (isShortResult ? `Ground truth expected answer: ${cleanExpected}` : 'Verified architectural concept.'),
    timeLimitSeconds: calculateDynamicQuestionTimeLimit(
      q.question || `${topic} Challenge #${questionNumber}`,
      isShortResult ? [cleanExpected] : [q.optA, q.optB, q.optC, q.optD],
      targetDifficulty,
      q.timeLimitSeconds
    ),
    difficultyTier: targetDifficulty,
    adaptiveMeta: {
      questionNumber,
      totalQuestions,
      previousAccuracy: accuracyPct,
      adaptationType,
      previousDifficulty: currentDifficulty,
    },
  };
}

// -------------------------------------------------------------
// FEATURE 1.1: Web Grounded AI Quiz Generator (Live Search)
// -------------------------------------------------------------
export async function generateAIQuizFromWebSearch(
  query: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior',
  format: QuizQuestionFormat = 'mixed'
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

  const formatInstructions = buildQuizFormatInstructions(format, count);

  const systemPrompt = `You are a Principal Software Architect and Quiz Master with access to real-time web search results.
Generate ${count} technical quiz questions based on the latest web context provided below.
Difficulty: ${difficulty}.

REAL-TIME WEB CONTEXT:
${sourcesContext}

${formatInstructions}

GENERAL REQUIREMENTS:
1. Ground questions in real architectural developments, breaking releases, or RFCs from the web search context.
2. Concise educational explanation (1-2 sentences).
3. Set realistic, generous timeLimitSeconds based on question length and difficulty: Junior: 35-45s, Mid: 45-60s, Senior: 60-80s, Principal: 75-100s. Never set short timers for complex technical questions.

Return ONLY a valid raw JSON object matching:
{"questions": [{"category": "${query.slice(0, 20)}", "question": "...", "questionType": "multiple_choice", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "B", "explanation": "...", "timeLimitSeconds": 60}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} questions (${format} format) grounded in the web search results for "${query}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.6, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions = parseRawGeneratedQuestions(parsed.questions || [], query.slice(0, 20), difficulty, format);

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
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior',
  format: QuizQuestionFormat = 'mixed'
): Promise<{ questions: GeneratedAIQuestion[]; pageInfo: ScrapedPageContent }> {
  const pageInfo = await scrapeUrlContent(url, 4500);
  const formatInstructions = buildQuizFormatInstructions(format, count);

  const systemPrompt = `You are a Technical Quiz Master.
Generate ${count} practical quiz questions testing comprehension of the documentation/article scraped from: "${pageInfo.title}".
Difficulty: ${difficulty}.

SCRAPED CONTENT EXCERPT:
${pageInfo.markdown.slice(0, 3000)}

${formatInstructions}

GENERAL REQUIREMENTS:
1. Questions must test core principles, caveats, internal design, or trade-offs mentioned in this document.
2. Concise educational explanation (1-2 sentences).
3. Set realistic, generous timeLimitSeconds based on question length and difficulty: Junior: 35-45s, Mid: 45-60s, Senior: 60-80s, Principal: 75-100s. Never set short timers for complex technical questions.

Return ONLY valid raw JSON:
{"questions": [{"category": "${pageInfo.title.slice(0, 20)}", "question": "...", "questionType": "multiple_choice", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "C", "explanation": "...", "timeLimitSeconds": 60}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} questions (${format} format) testing the scraped content from "${pageInfo.title}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.6, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions = parseRawGeneratedQuestions(parsed.questions || [], pageInfo.title.slice(0, 20), difficulty, format);

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
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior',
  format: QuizQuestionFormat = 'mixed'
): Promise<{ questions: GeneratedAIQuestion[]; repoSummary: GitHubRepoSummary }> {
  const repoSummary = await fetchGitHubRepoDetails(repoUrlOrSlug);
  const formatInstructions = buildQuizFormatInstructions(format, count);

  const systemPrompt = `You are a Principal Software Architect.
Generate ${count} technical architecture quiz questions testing knowledge of the open-source repository: "${repoSummary.fullName}".
Difficulty: ${difficulty}.
Description: ${repoSummary.description}
Language: ${repoSummary.language}
Topics: ${repoSummary.topics.join(', ')}

README EXCERPT:
${repoSummary.readmeExcerpt.slice(0, 2500)}

${formatInstructions}

GENERAL REQUIREMENTS:
1. Focus on architectural patterns, internal design, core modules, algorithms, or trade-offs of ${repoSummary.fullName}.
2. Concise 1-2 sentence explanation.
3. Set realistic, generous timeLimitSeconds based on question length and difficulty: Junior: 35-45s, Mid: 45-60s, Senior: 60-80s, Principal: 75-100s. Never set short timers for complex technical questions.

Return ONLY valid raw JSON:
{"questions": [{"category": "${repoSummary.repo}", "question": "...", "questionType": "multiple_choice", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "D", "explanation": "...", "timeLimitSeconds": 60}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} architectural questions (${format} format) for repository ${repoSummary.fullName}. Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.6, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions = parseRawGeneratedQuestions(parsed.questions || [], repoSummary.repo, difficulty, format);

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
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior',
  format: QuizQuestionFormat = 'mixed'
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

  const formatInstructions = buildQuizFormatInstructions(format, count);

  const systemPrompt = `You are an expert Tech News Quiz Master.
Generate ${count} engaging trivia and engineering questions on today's breaking story: "${storyTitle}".
Difficulty: ${difficulty}.
${extraContext}

${formatInstructions}

GENERAL REQUIREMENTS:
1. Test engineering implications, industry disruption, key technical terms, or core concepts related to this story.
2. Educational explanation (1-2 sentences).
3. Set realistic, generous timeLimitSeconds based on question length and difficulty: Junior: 35-45s, Mid: 45-60s, Senior: 60-80s, Principal: 75-100s. Never set short timers for complex technical questions.

Return ONLY valid raw JSON:
{"questions": [{"category": "Tech Trends", "question": "...", "questionType": "multiple_choice", "optA": "...", "optB": "...", "optC": "...", "optD": "...", "correctOpt": "B", "explanation": "...", "timeLimitSeconds": 60}]}`;

  const targetModel = resolveModelForTask('quiz');
  const tokenBudget = Math.max(1600, count * 550);
  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} questions (${format} format) on breaking story "${storyTitle}". Return ONLY raw JSON.` },
    ],
    { jsonMode: true, temperature: 0.7, maxTokens: tokenBudget, model: targetModel }
  );

  const parsed = safeParseJsonFromLLM(raw, { questions: [] });
  const rawQuestions = parseRawGeneratedQuestions(parsed.questions || [], 'Tech Trends', difficulty, format);

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
    const polls = (parsed.polls || []).map((p: any) => ({
      question: p.question || `Poll about ${repoSummary.fullName}`,
      options: Array.isArray(p.options) && p.options.length >= 2 ? p.options : ['Yes', 'No'],
    }));
    return {
      polls: polls.length > 0 ? polls : [
        {
          question: `How would you evaluate adopting ${repoSummary.repo} in production?`,
          options: ['Ready for mission-critical production', 'Good for prototypes / secondary services', 'Evaluating trade-offs vs existing stack', 'Not suitable for our current needs'],
        },
        {
          question: `What is the primary architectural draw of ${repoSummary.repo}?`,
          options: ['Developer ergonomics & DX', 'Runtime throughput & low latency', 'Minimal dependency footprint', 'Community ecosystem & plugins'],
        },
      ],
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
  const docPolls = (parsed.polls || []).map((p: any) => ({
    question: p.question || `Poll about ${pageInfo.title}`,
    options: Array.isArray(p.options) && p.options.length >= 2 ? p.options : ['Yes', 'No'],
  }));
  return {
    polls: docPolls.length > 0 ? docPolls : [
      {
        question: `What is your team's stance on the architectural practices in "${pageInfo.title.slice(0, 40)}"?`,
        options: ['Already implemented in production', 'Currently planning / piloting', 'Prefer alternative approaches', 'Under evaluation'],
      },
      {
        question: `Which trade-off is most challenging regarding this topic?`,
        options: ['Operational complexity', 'Migration friction', 'Team learning curve', 'Cost vs benefit'],
      },
    ],
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
    const parsed = safeParseJsonFromLLM(raw, { polls: [] });
    const list = Array.isArray(parsed.polls) ? parsed.polls : Array.isArray(parsed) ? parsed : [];
    const mapped = list.map((p: any) => ({
      question: p.question || `Poll about ${cleanTopic}`,
      options: Array.isArray(p.options) && p.options.length >= 2 ? p.options : ['Yes', 'No'],
    }));
    if (mapped.length > 0) return mapped;
    return [
      {
        question: `What is your primary architectural consideration for ${cleanTopic}?`,
        options: ['High scalability & throughput', 'Operational simplicity & maintainability', 'Fast developer velocity', 'Strict data consistency'],
      },
      {
        question: `How would your team classify your current adoption of ${cleanTopic}?`,
        options: ['Live in production', 'Active pilot / development', 'Evaluating for next quarter', 'Not on current roadmap'],
      },
      {
        question: `What is the biggest trade-off when adopting ${cleanTopic}?`,
        options: ['Distributed state management', 'Telemetry & observability', 'Team learning curve', 'Vendor lock-in'],
      },
    ];
  } catch {
    return [
      {
        question: `What is your primary architectural consideration for ${cleanTopic}?`,
        options: ['High scalability & throughput', 'Operational simplicity & maintainability', 'Fast developer velocity', 'Strict data consistency'],
      },
      {
        question: `How would your team classify your current adoption of ${cleanTopic}?`,
        options: ['Live in production', 'Active pilot / development', 'Evaluating for next quarter', 'Not on current roadmap'],
      },
      {
        question: `What is the biggest trade-off when adopting ${cleanTopic}?`,
        options: ['Distributed state management', 'Telemetry & observability', 'Team learning curve', 'Vendor lock-in'],
      },
    ];
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
    const parsed = safeParseJsonFromLLM<any>(raw, { talkingPoints: [] });
    if (Array.isArray(parsed.talkingPoints) && parsed.talkingPoints.length > 0) {
      return parsed.talkingPoints;
    }
    return [
      `Directly address: ${questionContent.slice(0, 60)}...`,
      'Discuss production trade-offs between consistency and operational complexity.',
      'Recommend measuring telemetry before premature optimization.',
    ];
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
  quizzes: Array<{ question: string; correctOption?: string; category?: string; explanation?: string }>;
  polls: Array<{ question: string; totalVotes: number; topOption: string; aiConsensusNote?: string | null }>;
  topQuestions: Array<{ content: string; upvotes: number; author?: string }>;
  leaderboardTop3: Array<{ name: string; score: number }>;
}): Promise<string> {
  const targetModel = resolveModelForTask('session_report');

  const quizSummaries = params.quizzes
    .map((q, i) => `[Challenge ${i + 1}] (${q.category || 'Architecture'}) ${q.question}\nCorrect: ${q.correctOption || 'Verified pattern'}\nKey Takeaway: ${q.explanation || 'Core engineering principle.'}`)
    .join('\n\n');

  const questionSummaries = params.topQuestions
    .slice(0, 10)
    .map((q, i) => `[Q&A ${i + 1}] (${q.upvotes || 0} upvotes${q.author ? ` from ${q.author}` : ''}) ${q.content}`)
    .join('\n');

  const pollSummaries = params.polls
    .map((p, i) => `[Poll ${i + 1}] ${p.question} (${p.totalVotes} votes | Leading: ${p.topOption}${p.aiConsensusNote ? ` | Consensus Note: ${p.aiConsensusNote}` : ''})`)
    .join('\n');

  const leaderboardSummaries = params.leaderboardTop3.length > 0
    ? params.leaderboardTop3.map((l, i) => `#${i + 1} ${l.name} (${l.score} pts)`).join(', ')
    : 'Session attendees';

  const systemPrompt = `You are a Principal Software Architect synthesizing an authoritative, high-density Masterclass Session Report for attendees of "${params.roomTitle}" (Room ${params.roomCode}, ${params.totalAttendees} attendees).
The document must be crisp, high-density, beautifully structured in clean Markdown, and immediately actionable for senior engineers.

STRUCTURE REQUIREMENTS (Markdown):
# ⚡ ${params.roomTitle} — Masterclass Session Report
*Executive Architectural Takeaways, Audience Inquiries, Voting Consensus & Code Reference*

## 🏛️ Core Architectural Principles
(3 to 5 key bullet points with bold keywords and concise engineering rationales)

## 💬 Key Audience Inquiries & Discussions
(Top 3-4 questions from the session with authoritative, 1-2 sentence engineering answers)

## 📊 Community Poll Insights & Consensus Trends
(Bullet points summarizing poll outcomes, audience consensus, and architectural trade-offs)

## 🧠 Technical Quizzing Breakdown & Key Architectural Takeaways
(Summary of challenges evaluated, key takeaways, and areas where attendees excelled or found misconceptions)

## 🛠️ Quick Reference & Code Recipes
(2-3 practical code snippets, terminal commands, or rule-of-thumb formulas with language tags like \`\`\`bash or \`\`\`ts)

## 🏆 High Scores Podium & MVP Recognition
(Recognize top performers: ${leaderboardSummaries}, and key participant contributions)

Keep it dense, elegant, and strictly high signal.`;

  const userContent = `Session Data:
TOTAL ATTENDEES: ${params.totalAttendees}

QUIZZES & CHALLENGES COVERED:
${quizSummaries || 'None'}

TOP AUDIENCE INQUIRIES:
${questionSummaries || 'None'}

LIVE POLLS & COMMUNITY CONSENSUS:
${pollSummaries || 'None'}`;

  const reportMaxTokens = targetModel.includes('mimo') ? 2800 : 2000;
  return await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    { temperature: 0.4, maxTokens: reportMaxTokens, model: targetModel }
  );
}

// -------------------------------------------------------------
// FEATURE 6: AI Q&A Safeguard & Content Moderation
// -------------------------------------------------------------
const STORAGE_KEY_QA_SAFEGUARD = 'sketchcast_qa_safeguard_enabled';

export function isQASafeguardEnabled(): boolean {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      const saved = storage.getItem(STORAGE_KEY_QA_SAFEGUARD);
      return saved !== null ? saved === 'true' : true;
    }
  } catch {
    // ignore
  }
  return true;
}

export function setQASafeguardEnabled(enabled: boolean): void {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY_QA_SAFEGUARD, String(enabled));
    }
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

  // 4. Resolve optimal model dynamically (strictly respects custom model or auto-routes to TypeSafe Jev 1.13)
  const targetModel = resolveModelForTask('moderation');

  // If using TypeSafe Jev 1.13, execute ultra-cheap ($0.042/1M), sub-second System One evaluate
  if (targetModel === MESH_MODELS.JEV_1_13) {
    try {
      const evalRes = await callMeshEvaluate(
        `Audience question: "${content.trim()}"`,
        {
          safe: {
            type: 'noul',
            instructions: 'Is this audience question appropriate, safe, and respectful for a tech presentation without harassment, hate speech, explicit profanity, or spam/trolling?'
          },
          category: {
            type: 'choice',
            instructions: 'Identify any issue category or select none if safe:',
            criteria: {
              none: 'Safe and appropriate question',
              profanity: 'Profanity, explicit language, or vulgarity',
              harassment: 'Personal attacks, insults, or harassment',
              spam_gibberish: 'Spam, promotional junk, or keyboard mash',
              trolling: 'Disruptive hostile trolling'
            }
          }
        },
        { apiKey, model: MESH_MODELS.JEV_1_13 }
      );

      const isSafeProb = evalRes?.answers?.safe?.noul ?? 1.0;
      const isSafe = isSafeProb >= 0.65;
      const chosenCat = evalRes?.answers?.category?.choice || 'none';
      const result: QAModerationResult = {
        isSafe,
        reason: isSafe ? null : `Flagged by AI safety check (${chosenCat}).`,
        category: isSafe ? 'none' : (chosenCat as any),
      };

      moderationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (evalErr) {
      console.warn('[Mesh AI Safeguard] Jev evaluation failed or unavailable, falling back to LLM chat completion:', evalErr);
      // Fall through seamlessly to callMeshChatCompletion fallback below
    }
  }

  // Compact prompt to minimize token burn if fallback generative LLM is used
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
        model: targetModel === MESH_MODELS.JEV_1_13 ? MESH_MODELS.GPT_4O_MINI : targetModel,
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
  const cleanInput = topicPrompt.trim();
  let extraContext = '';

  if (isGitHubRepoInput(cleanInput)) {
    try {
      const repoSummary = await fetchGitHubRepoDetails(cleanInput);
      extraContext = `GITHUB REPO CONTEXT:
Repository: ${repoSummary.fullName}
Description: ${repoSummary.description}
Topics: ${repoSummary.topics.join(', ')}
README Excerpt:
${repoSummary.readmeExcerpt.slice(0, 1200)}`;
    } catch {
      // ignore
    }
  } else if (cleanInput.match(/^https?:\/\//i)) {
    try {
      const pageInfo = await scrapeUrlContent(cleanInput, 2500);
      extraContext = `DOCUMENT CONTEXT:
Document Title: ${pageInfo.title}
Content Excerpt:
${pageInfo.markdown.slice(0, 1200)}`;
    } catch {
      // ignore
    }
  }

  const systemPrompt = `You are an expert audience feedback & technical workshop survey designer for live presentations.
Generate an engaging, concise, and structured survey (3 to 5 questions) based on the user's topic.
Include a variety of question types:
- 'rating' (1 to 5 stars for overall satisfaction, depth, pacing)
- 'choice' (multiple choice options to gauge prior experience or key takeaway)
- 'text' (open-ended question for suggestions, critiques, or speaker notes)
${extraContext ? `\n${extraContext}\n` : ''}
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
        { role: 'user', content: `Design a survey about: ${cleanInput}` },
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

    if (questions.length === 0) {
      throw new Error('AI returned empty questions array.');
    }

    return {
      title: parsed.title || `${cleanInput.toUpperCase()} FEEDBACK`,
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

    let jevSentiment: 'positive' | 'neutral' | 'mixed' | 'negative' | undefined;
    let jevScore: number | undefined;

    // Use TypeSafe Jev 1.13 to score the sentiment rubric directly with calibrated accuracy
    if (targetModel === MESH_MODELS.JEV_1_13) {
      try {
        const evalRes = await callMeshEvaluate(
          `Survey: "${surveyTitle}". Feedback summary:\n${responsesText.slice(0, 1500)}`,
          {
            sentiment: {
              type: 'choice',
              instructions: 'What is the dominant overall attendee sentiment for this session feedback?',
              criteria: {
                positive: 'Overwhelmingly positive and enthusiastic praise',
                neutral: 'Balanced or indifferent feedback',
                mixed: 'Mix of both praise and critical critiques',
                negative: 'Predominantly negative or dissatisfied feedback',
              },
            },
            satisfaction: {
              type: 'noul',
              instructions: 'Are attendees satisfied with this technical session overall?',
            },
          },
          { model: MESH_MODELS.JEV_1_13 }
        );
        jevSentiment = evalRes?.answers?.sentiment?.choice as any;
        const satProb = evalRes?.answers?.satisfaction?.noul ?? 0.85;
        jevScore = Math.round(satProb * 100);
      } catch (evalErr) {
        console.warn('[Survey Sentiment] Jev evaluation failed, falling back to chat completion:', evalErr);
      }
    }

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
        model: targetModel === MESH_MODELS.JEV_1_13 ? MESH_MODELS.DEEPSEEK_V4_FLASH : targetModel,
      }
    );

    const parsed = safeParseJsonFromLLM<any>(raw, {});

    return {
      sentiment: jevSentiment || parsed.sentiment || 'positive',
      score: jevScore !== undefined ? jevScore : (typeof parsed.score === 'number' ? parsed.score : 85),
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

  // If in Smart Router mode, execute ultra-fast TypeSafe Jev 1.13 evaluate
  if (targetModel === MESH_MODELS.JEV_1_13) {
    try {
      const criteria: Record<string, string> = {
        none: 'Not a duplicate of any existing question',
      };
      candidates.forEach((c) => {
        criteria[c.id] = `Matches: "${c.content.slice(0, 80)}"`;
      });

      const evalRes = await callMeshEvaluate(
        `Draft question: "${cleanDraft}"`,
        {
          duplicate_match: {
            type: 'choice',
            instructions: 'Does this draft question ask essentially the same thing as one of the active questions? Select the matching question ID or "none":',
            criteria,
          },
          is_duplicate: {
            type: 'noul',
            instructions: 'Is the draft question a semantic duplicate of an already submitted question?',
          },
        },
        { model: MESH_MODELS.JEV_1_13 }
      );

      const matchedId = evalRes?.answers?.duplicate_match?.choice;
      const prob = evalRes?.answers?.is_duplicate?.noul ?? 0;

      if (matchedId && matchedId !== 'none' && prob >= 0.6) {
        const matched = existingQuestions.find((q) => q.id === matchedId);
        const result: DuplicateDetectionResult = {
          isDuplicate: true,
          matchedQuestionId: matchedId,
          matchedQuestionContent: matched?.content,
          similarityScore: prob,
          reason: 'A very similar question is already active in the live feed.',
        };
        duplicateCheckCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      const result: DuplicateDetectionResult = { isDuplicate: false };
      duplicateCheckCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (evalErr) {
      console.warn('[Mesh AI] Jev duplicate check failed, falling back to chat completion:', evalErr);
    }
  }

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
        model: targetModel === MESH_MODELS.JEV_1_13 ? MESH_MODELS.GPT_4O_MINI : targetModel,
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

// -------------------------------------------------------------
// FEATURE: Smart Remediation Poll Generator from Quiz Misconceptions
// -------------------------------------------------------------
export async function generateRemediationPoll(params: {
  questionText: string;
  correctOptionText: string;
  wrongOptionText?: string;
  explanation: string;
}): Promise<{ question: string; options: string[] }> {
  const targetModel = resolveModelForTask('survey');
  const systemPrompt = `You are an expert technical instructor creating a live "Remediation / Clarity Poll" for attendees who just struggled with a technical quiz question.
The goal is to resolve confusion between the misconception and the correct engineering principle.
Provide a 2 or 3 option debate, preference, or architectural trade-off poll question that directly helps attendees internalize the distinction.

Return ONLY valid raw JSON matching:
{"question": "Punchy poll question targeting the core trade-off or misconception?", "options": ["Option 1 (Trade-off A)", "Option 2 (Trade-off B)", "Option 3 (Context dependent)"]}`;

  const userContent = `Quiz Question: "${params.questionText}"
Correct Principle: "${params.correctOptionText}"
Common Misconception Chosen: "${params.wrongOptionText || 'Common distractor'}"
Explanation / Key Takeaway: "${params.explanation}"`;

  try {
    const raw = await callMeshChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { jsonMode: true, temperature: 0.7, maxTokens: 400, model: targetModel }
    );
    const parsed = safeParseJsonFromLLM(raw);
    return {
      question: parsed.question || `Trade-off Check: ${params.questionText.slice(0, 60)}?`,
      options: Array.isArray(parsed.options) && parsed.options.length >= 2 ? parsed.options.slice(0, 4) : ['Adopt proposed fix', 'Keep legacy approach', 'Depends on scale'],
    };
  } catch (err) {
    console.warn('[Mesh AI] Remediation poll generation failed, using fallback:', err);
    return {
      question: `Clarification: ${params.questionText.slice(0, 60)}?`,
      options: [
        `Recommended: ${params.correctOptionText.slice(0, 40)}`,
        `Alternative: ${params.wrongOptionText?.slice(0, 40) || 'Previous approach'}`,
        'Trade-off depends on constraints',
      ],
    };
  }
}

// -------------------------------------------------------------
// FEATURE: Freeform Short-Answer Auto-Grading with TypeSafe Jev 1.13
// -------------------------------------------------------------
export async function gradeShortAnswerWithJev(params: {
  question: string;
  expectedAnswer: string;
  attendeeAnswer: string;
  acceptableAnswers?: string[];
}): Promise<{ isCorrect: boolean; confidence: number; feedback?: string }> {
  const cleanSubmission = (params.attendeeAnswer || '').trim().slice(0, 1000);
  const cleanExpected = (params.expectedAnswer || '').trim();

  if (!cleanSubmission) {
    return { isCorrect: false, confidence: 0, feedback: 'No answer submitted.' };
  }

  // Fast exact match or acceptableAnswers check (0ms, 0 tokens)
  if (cleanSubmission.toLowerCase() === cleanExpected.toLowerCase()) {
    return { isCorrect: true, confidence: 1.0, feedback: 'Exact match.' };
  }
  if (params.acceptableAnswers?.some((ans) => ans.trim().toLowerCase() === cleanSubmission.toLowerCase())) {
    return { isCorrect: true, confidence: 1.0, feedback: 'Matched acceptable synonym.' };
  }

  // TypeSafe Jev 1.13 sub-second semantic evaluation ($0.042/1M tokens)
  try {
    const evalRes = await callMeshEvaluate(
      `Technical Quiz Question: "${params.question}"\nGround Truth Expected Answer: "${cleanExpected}"${params.acceptableAnswers?.length ? ` (Also acceptable: ${params.acceptableAnswers.join(', ')})` : ''}\nAttendee Submitted Answer: "${cleanSubmission}"`,
      {
        is_correct: {
          type: 'noul',
          instructions: 'Does the attendee answer express the technically correct answer, taking into account minor typos, casing, or equivalent technical terms/synonyms?'
        },
        answer_quality: {
          type: 'choice',
          instructions: 'Classify the attendee answer quality:',
          criteria: {
            correct: 'Technically accurate, valid synonym, or acceptable abbreviation',
            partially_correct: 'Close concept but missing key technical precision',
            incorrect: 'Technically wrong or irrelevant',
          }
        }
      },
      { model: MESH_MODELS.JEV_1_13 }
    );

    const prob = evalRes?.answers?.is_correct?.noul ?? 0;
    const choice = evalRes?.answers?.answer_quality?.choice || 'incorrect';
    const isCorrect = prob >= 0.7 || choice === 'correct';

    return {
      isCorrect,
      confidence: prob,
      feedback: isCorrect ? 'Semantically accurate answer.' : 'Concept does not match ground truth.',
    };
  } catch (evalErr) {
    console.warn('[Short Answer] Jev evaluation failed, using token fallback:', evalErr);
    const subWords = cleanSubmission.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const expWords = cleanExpected.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const wordOverlap = subWords.filter((w) => expWords.includes(w)).length;
    const isSub =
      cleanSubmission.toLowerCase() === cleanExpected.toLowerCase() ||
      (params.acceptableAnswers || []).some((a) => a.trim().toLowerCase() === cleanSubmission.toLowerCase()) ||
      (wordOverlap > 0 && wordOverlap >= Math.ceil(expWords.length / 2));

    return {
      isCorrect: isSub,
      confidence: isSub ? 0.75 : 0.2,
      feedback: isSub ? 'Partial match via local heuristic.' : 'Incorrect.',
    };
  }
}

