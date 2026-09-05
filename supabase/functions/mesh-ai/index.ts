// @ts-nocheck
// Supabase Edge Function: mesh-ai
// Securely forwards AI completions to Mesh API (api.meshapi.ai) keeping API keys server-side.
// Runs on free Deno runtime inside Supabase Edge Functions.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-mesh-model, x-mesh-task',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MESH_DIRECT_URL = 'https://api.meshapi.ai/v1/chat/completions';

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

    // Default to GPT-4o Mini or user requested model
    const requestedModel = body.model || 'openai/gpt-4o-mini';

    const meshPayload = {
      model: requestedModel,
      messages: body.messages || [],
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? body.maxTokens ?? 2048,
      response_format: body.response_format || (body.jsonMode ? { type: 'json_object' } : undefined),
    };

    // 4. Forward to Mesh API
    const meshResponse = await fetch(MESH_DIRECT_URL, {
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
