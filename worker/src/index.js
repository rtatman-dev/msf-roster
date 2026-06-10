// msf-ai-proxy — hardened Claude API proxy for the MSF Roster app.
//
// Security model:
//  - Only requests with an Origin in ALLOWED_ORIGINS are served (browser CORS +
//    server-side check). Non-browser clients without a matching Origin get 403.
//  - The model, token limit, tool list, and message-count cap are pinned here;
//    the client may only supply `system` and `messages`.
//  - Optional per-IP rate limiting via a Workers rate-limit binding (RATE_LIMITER).
//
// Deploy:   cd worker && npx wrangler deploy
// API key:  npx wrangler secret put ANTHROPIC_API_KEY   (persists across deploys)

const ALLOWED_ORIGINS = new Set([
  "https://msf-roster.pages.dev",
]);

const MODEL          = "claude-opus-4-8";
const MAX_TOKENS     = 8192;     // hard output cap per request
const MAX_MESSAGES   = 40;       // chat history depth forwarded upstream
const MAX_BODY_BYTES = 800_000;  // roster context is large but bounded

// web_search runs server-side at Anthropic; max_uses caps cost per request
const TOOLS = [
  { type: "web_search_20260209", name: "web_search", max_uses: 3 },
];

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(origin ? corsHeaders(origin) : {}) },
  });
}

export default {
  async fetch(request, env) {
    const origin  = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.has(origin);

    if (request.method === "OPTIONS") {
      return allowed
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : new Response(null, { status: 403 });
    }

    if (!allowed) return json(403, { error: "forbidden origin" }, null);
    if (request.method !== "POST") return json(405, { error: "method not allowed" }, origin);

    if (!env.ANTHROPIC_API_KEY) {
      return json(500, { error: "worker missing ANTHROPIC_API_KEY secret" }, origin);
    }

    // Optional per-IP rate limit (RATE_LIMITER binding in wrangler.toml)
    if (env.RATE_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return json(429, { error: "rate limited — try again in a minute" }, origin);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "request too large" }, origin);

    let body;
    try { body = JSON.parse(raw); } catch (e) { return json(400, { error: "invalid JSON" }, origin); }

    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : null;
    if (!messages || !messages.length) return json(400, { error: "messages required" }, origin);

    // Everything except system + messages is pinned server-side
    const payload = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      system: typeof body.system === "string" ? body.system : undefined,
      tools: TOOLS,
      messages,
    };

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
