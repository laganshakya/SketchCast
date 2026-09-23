// @ts-nocheck
// Supabase Edge Function: mesh-ai
// Securely forwards AI completions and evaluations to Mesh API (api.meshapi.ai) keeping API keys server-side.
// Supports both OpenAI chat completions and TypeSafe Jev-1.13 evaluation endpoints.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-mesh-model, x-mesh-task, x-mesh-endpoint',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MESH_COMPLETIONS_URL = 'https://api.meshapi.ai/v1/chat/completions';
const MESH_EVALUATE_URL = 'https://api.meshapi.ai/v1/evaluate';

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Resolve Server-Side API Key (fallback to client-provided override if host configured their own)
    const serverApiKey = Deno.env.get('MESH_API_KEY') || Deno.env.get('VITE_MESH_API_KEY');
    
    // Check client authorization header if client passed their own key
    const authHeader = req.headers.get('Authorization') || '';
    const clientPassedKey = authHeader.replace(/^Bearer\s+/i, '').trim();

    const effectiveApiKey = serverApiKey || clientPassedKey;

    if (!effectiveApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Mesh API Key is missing on the server. Please set MESH_API_KEY secret in Supabase Edge Functions.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Parse Body
    const body = await req.json();

    const endpointHeader = req.headers.get('x-mesh-endpoint');
    const isEvaluate =
      endpointHeader === 'evaluate' ||
      (Boolean(body.questions) && !body.messages) ||
      (body.model === 'typesafe/jev-1.13' && Boolean(body.questions));

    // Route A: System One Evaluation API (TypeSafe Jev-1.13)
    if (isEvaluate) {
      const evalPayload = {
        model: body.model || 'typesafe/jev-1.13',
        state: body.state || '',
        questions: body.questions || {},
      };

      const meshResponse = await fetch(MESH_EVALUATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify(evalPayload),
      });

      const data = await meshResponse.text();
      return new Response(data, {
        status: meshResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Route B: Chat Completions API (Smart Router & Standard Models)
    let requestedModel = body.model || 'auto';
    const taskType = body.task || req.headers.get('x-mesh-task') || '';

    // Smart Router Server-Side Model Resolution
    if (requestedModel === 'auto') {
      switch (taskType) {
        case 'session_report':
          requestedModel = 'xiaomi/mimo-v2.5';
          break;
        case 'clustering':
          requestedModel = 'openai/gpt-4o-mini-2024-07-18';
          break;
        case 'quiz':
        case 'survey':
        case 'talking_points':
        case 'poll_consensus':
        default:
          requestedModel = 'deepseek/deepseek-v4-flash';
          break;
      }
    }

    // If Jev 1.13 was passed to chat completions, route generative text to DeepSeek Flash
    if (requestedModel === 'typesafe/jev-1.13') {
      requestedModel = 'deepseek/deepseek-v4-flash';
    }

    let maxTokens = body.max_tokens ?? body.maxTokens ?? 2048;
    // Provide sufficient headroom for Xiaomi MiMo reasoning tokens
    if (requestedModel.includes('mimo') && maxTokens < 800) {
      maxTokens = 800;
    }

    const meshPayload = {
      model: requestedModel,
      messages: body.messages || [],
      temperature: body.temperature ?? 0.7,
      max_tokens: maxTokens,
      response_format: body.response_format || (body.jsonMode ? { type: 'json_object' } : undefined),
    };

    const meshResponse = await fetch(MESH_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify(meshPayload),
    });

    const data = await meshResponse.text();

    return new Response(data, {
      status: meshResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: `Edge Function proxy error: ${err.message || 'Unknown error occurred'}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
