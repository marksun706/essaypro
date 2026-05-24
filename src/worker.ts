interface Env {
  DMX_API_KEY: string;
  DMX_API_URL?: string;
  DMX_MODEL?: string;
  DMX_CHAT_MODEL?: string;
  ASSETS: {
    fetch: typeof fetch;
  };
}

function formatDmxUrl(configuredUrl: string): string {
  let url = configuredUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    if (cleanPath.endsWith("/v1/chat/completions")) {
      return parsed.origin + cleanPath;
    }
    return `${parsed.origin}${cleanPath}/v1/chat/completions`;
  } catch (e) {
    const cleanUrl = url.replace(/\/$/, "");
    if (cleanUrl.endsWith("/v1/chat/completions")) {
      return cleanUrl;
    }
    return `${cleanUrl}/v1/chat/completions`;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS Headers for preflight & normal responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // Handle OPTIONS Preflight requests
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Handle Debug Env Endpoint (Safe diagnostic check)
    if (url.pathname === "/functions/v1/debug-env" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          DMX_API_KEY_configured: !!env.DMX_API_KEY,
          DMX_API_KEY_length: env.DMX_API_KEY ? env.DMX_API_KEY.length : 0,
          DMX_API_URL: env.DMX_API_URL || "not configured (defaults to https://www.dmxapi.cn)",
          DMX_MODEL: env.DMX_MODEL || "not configured (defaults to claude-haiku-4-5-20251001-cc)",
          DMX_CHAT_MODEL: env.DMX_CHAT_MODEL || "not configured (defaults to deepseek-v4-flash)",
          has_assets: !!env.ASSETS,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle Chat Endpoint
    if (url.pathname === "/functions/v1/chat" && request.method === "POST") {
      try {
        // 1. Get request body safely
        const requestText = await request.text();
        let requestData: { message: string, history: any[], isChatOnly?: boolean };
        try {
          requestData = JSON.parse(requestText);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Invalid JSON payload in request body." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { message, history, isChatOnly } = requestData;

        // 2. Read environment variables
        const dmxApiKey = env.DMX_API_KEY;
        const dmxApiUrl = env.DMX_API_URL || "https://www.dmxapi.cn";
        const dmxModel = isChatOnly 
          ? (env.DMX_CHAT_MODEL || "deepseek-v4-flash") 
          : (env.DMX_MODEL || "claude-haiku-4-5-20251001-cc");

        if (!dmxApiKey) {
          return new Response(
            JSON.stringify({ error: "DMX_API_KEY environment variable is not configured in Cloudflare Workers." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 3. Define the system prompt
        const systemPrompt = `You are essayspro, an elite, professional college admissions consultant and personal essay editor. Your goal is to guide students to write authentic, compelling, and memorable personal statements and supplements that stand out to admissions committees.

Core Guidelines:
1. Tone and Voice: Maintain a highly professional, mature, encouraging, yet intellectually rigorous tone. Do not use generic filler or overly emotional flattery.
2. Show, Don't Tell: Guide the user to illustrate their qualities through vivid, concrete narratives, actions, and reflection, rather than making broad assertions.
3. Vocabulary and Structure: Help the user elevate their word choices naturally (avoiding overly flowery thesaurus-cramming) and establish a clear, narrative-driven structure.
4. Ethical Boundaries: Do not write the essay for the student. Focus on editing, outlining, critique, and polishing, ensuring the student's authentic voice is preserved and amplified.
5. De-AI Polishing: Refine sentence structures to sound natural, compelling, and free from typical AI generation patterns.`;

        // 4. Construct messages history
        const messages = [
          { role: "system", content: systemPrompt },
          ...(history || []).map((h: any) => ({
            role: h.role === "ai" ? "assistant" : "user",
            content: h.content
          })),
          { role: "user", content: message }
        ];

        // 5. Query DMXAPI Gateway
        const finalDmxUrl = formatDmxUrl(dmxApiUrl);
        const response = await fetch(finalDmxUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${dmxApiKey}`
          },
          body: JSON.stringify({
            model: dmxModel,
            messages: messages,
            temperature: 0.3
          })
        });

        // Check if DMXAPI returned a valid JSON response
        const responseText = await response.text();
        let responseData: any;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: `Invalid response from DMXAPI (Status ${response.status}): ${responseText.slice(0, 200)}` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: responseData.error?.message || responseData.error || `DMXAPI server error: ${response.status}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 6. Support both OpenAI choices and Anthropic response styles
        let reply = "";
        if (responseData.choices && responseData.choices[0]?.message?.content) {
          reply = responseData.choices[0].message.content;
        } else if (responseData.content && responseData.content[0]?.text) {
          reply = responseData.content[0].text;
        } else {
          return new Response(
            JSON.stringify({ error: "Unsupported API response format from gateway." }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 7. Send back response
        return new Response(
          JSON.stringify({ reply }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || "Internal Server Error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Otherwise, delegate to Static Assets handler
    return env.ASSETS.fetch(request);
  }
};
