// Mesh API (by AI Fiesta) Client & AI Engine for SketchCast
// OpenAI-compatible unified gateway supporting 1,000+ models

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

// In browser, use Vite proxy `/api/mesh/v1` to eliminate CORS preflight/blocking
export function getMeshApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // If running in development with Vite proxy or same-origin backend
    return '/api/mesh/v1';
  }
  return MESH_DIRECT_URL;
}

export const MESH_MODELS = {
  BALANCED_MINI: 'openai/gpt-4o-mini',
  FAST_CHAT: 'deepseek/deepseek-chat',
  ADVANCED_FLAGSHIP: 'openai/gpt-4o',
  FAST_HAIKU: 'anthropic/claude-3-haiku',
  REASONING_R1: 'deepseek/deepseek-r1',
} as const;

export const MESH_MODEL_OPTIONS = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (Recommended)',
    provider: 'OpenAI',
    tag: 'FAST & RELIABLE',
    description: 'Sub-second latency, flawless JSON schema formatting for live quizzing.',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'DeepSeek',
    tag: 'BALANCED',
    description: 'Highly intelligent open architecture reasoning and quick response times.',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o Flagship',
    provider: 'OpenAI',
    tag: 'DEEP TECH',
    description: 'Maximum precision for staff-level architecture proofs and deep-dives.',
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    tag: 'FAST STREAM',
    description: 'Rapid concise bullet points for speaker talking points & consensus summaries.',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Reasoning)',
    provider: 'DeepSeek',
    tag: 'CHAIN-OF-THOUGHT',
    description: 'Deep mathematical and system concurrency proofs with step-by-step reasoning.',
  },
];

const STORAGE_KEY_MESH_KEY = 'sketchcast_mesh_api_key';
const STORAGE_KEY_MESH_MODEL = 'sketchcast_mesh_selected_model';

export function getStoredMeshKey(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEY_MESH_KEY);
    if (local && local.trim()) return local.trim();
  }
  return (import.meta.env.VITE_MESH_API_KEY as string) || '';
}

export function setStoredMeshKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MESH_KEY, key.trim());
  }
}

export function getStoredMeshModel(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEY_MESH_MODEL);
    if (local && local.trim()) {
      // Migrate old or unsupported model strings to verified default
      if (local.includes('gemini') || local.includes('claude-3.5-sonnet')) {
        setStoredMeshModel(MESH_MODELS.BALANCED_MINI);
        return MESH_MODELS.BALANCED_MINI;
      }
      return local.trim();
    }
  }
  return MESH_MODELS.BALANCED_MINI;
}

export function setStoredMeshModel(model: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MESH_MODEL, model.trim());
  }
}

export async function callMeshChatCompletion(
  messages: MeshChatMessage[],
  options: MeshCompletionOptions = {}
): Promise<string> {
  const apiKey = options.apiKey || getStoredMeshKey();
  if (!apiKey) {
    throw new Error('Mesh API Key missing. Please click "AI SETTINGS" in the header to enter your rsk_... key.');
  }

  const {
    model = getStoredMeshModel(),
    temperature = 0.7,
    maxTokens = 2500,
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

  // Attempt proxy endpoint first (avoids browser CORS in local dev)
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

    // If a custom or deprecated model was used and failed, automatically retry with verified default model
    if (model !== MESH_MODELS.BALANCED_MINI) {
      console.warn(`[Mesh API] Model "${model}" failed (${message}). Retrying with default "${MESH_MODELS.BALANCED_MINI}"...`);
      setStoredMeshModel(MESH_MODELS.BALANCED_MINI);
      return callMeshChatCompletion(messages, {
        ...options,
        model: MESH_MODELS.BALANCED_MINI,
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

  const targetModel = model || getStoredMeshModel() || MESH_MODELS.BALANCED_MINI;

  try {
    const text = await callMeshChatCompletion(
      [{ role: 'user', content: 'Respond with exactly: "MESH_API_ONLINE"' }],
      { apiKey: keyToUse, model: targetModel, maxTokens: 25, temperature: 0.1 }
    );

    return {
      success: true,
      message: `Connected successfully! (Model: ${targetModel}) Output: ${text.trim()}`,
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

export async function generateAIQuizQuestions(
  topic: string,
  count: number = 3,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal' = 'Senior'
): Promise<GeneratedAIQuestion[]> {
  const systemPrompt = `You are a Principal Software Architect and Technical Quiz Master.
Your goal is to generate ${count} high-caliber, practical multiple-choice quiz questions for a live tech session on the topic: "${topic}".
Difficulty level: ${difficulty}.

REQUIREMENTS:
1. Each question must test real-world architectural principles, distributed systems, code trade-offs, security, or concurrency (NOT trivia or syntax memorization).
2. Exactly 4 distinct options (A, B, C, D).
3. Designate the correct option key ('A', 'B', 'C', or 'D').
4. Provide a clear, educational "explanation" that details why the chosen option is correct and why common pitfalls fail in production.
5. Set appropriate timeLimitSeconds between 15 and 45.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "category": "e.g. System Design / Cloud / Concurrency",
      "question": "Question prompt here...",
      "optA": "First option...",
      "optB": "Second option...",
      "optC": "Third option...",
      "optD": "Fourth option...",
      "correctOpt": "A",
      "explanation": "Architectural breakdown...",
      "timeLimitSeconds": 25
    }
  ]
}`;

  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} technical questions on "${topic}" at ${difficulty} level.` },
    ],
    { jsonMode: true, temperature: 0.7 }
  );

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    const list: any[] = Array.isArray(parsed.questions)
      ? parsed.questions
      : Array.isArray(parsed)
      ? parsed
      : [];

    return list.map((q, idx) => ({
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
  } catch {
    throw new Error('Failed to parse AI Quiz JSON response. Please try again.');
  }
}



// -------------------------------------------------------------
// FEATURE 3: AI Polls Generator & Consensus Analyzer
// -------------------------------------------------------------
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
   - If the user asks for ratings/feedback/reviews (e.g. "Rate this app", "Event feedback"), provide satisfaction levels, favorite features, and areas of improvement.
   - If the user gives a technology comparison (e.g. "PostgreSQL vs MongoDB", "React vs Svelte"), explore genuine real-world trade-offs and team preferences.
   - If the user provides a business, team, cultural, or fun topic (e.g. "Remote Work vs RTO", "Favorite Sci-Fi Movie"), provide lively, highly pertinent questions and choices.
   - NEVER default to generic software architecture questions (like monolith vs microservices or REST vs gRPC) unless the topic explicitly requests it.

Return ONLY a valid JSON object matching this schema:
{
  "polls": [
    {
      "question": "Clear, engaging question specific to ${cleanTopic}?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
  ]
}`;

  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate 3 interactive live audience polls specifically about: "${cleanTopic}". Ensure all 3 polls are distinct and directly tailored to this exact subject.` },
    ],
    { jsonMode: true, temperature: 0.85 }
  );

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
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

  return await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Poll Question: "${question}"\nTotal Votes: ${totalVotes}\nResults: ${votesSummary}`,
      },
    ],
    { temperature: 0.6, maxTokens: 200 }
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

  const raw = await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Audience Question from ${authorName}: "${questionContent}"` },
    ],
    { jsonMode: true, temperature: 0.5, maxTokens: 400 }
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

  return await callMeshChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Session Details:\n${JSON.stringify(params, null, 2)}`,
      },
    ],
    { temperature: 0.5, maxTokens: 1500 }
  );
}
