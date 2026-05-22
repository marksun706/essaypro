import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight OPTIONS requests for cross-origin security
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse payload from React frontend
    const { message, history } = await req.json()

    // 2. Read environmental variables
    const dmxApiKey = Deno.env.get("DMX_API_KEY")
    let dmxApiUrl = Deno.env.get("DMX_API_URL") || "https://www.dmxapi.com"
    if (dmxApiUrl && !dmxApiUrl.startsWith("http://") && !dmxApiUrl.startsWith("https://")) {
      dmxApiUrl = `https://${dmxApiUrl}`;
    }
    const dmxModel = Deno.env.get("DMX_MODEL") || "claude-haiku-4-5-20251001-cc"

    if (!dmxApiKey) {
      throw new Error("DMX_API_KEY environment variable is not configured. Please set your DMXAPI token in your .env file or Supabase dashboard.")
    }

    // 3. Read custom system prompt from local file
    let systemPrompt = "";
    try {
      systemPrompt = await Deno.readTextFile("./chat/system-prompt.txt");
    } catch (e) {
      try {
        systemPrompt = await Deno.readTextFile("./system-prompt.txt");
      } catch (err) {
        systemPrompt = "You are a professional Ivy League admissions consultant and personal essay editor.";
      }
    }

    // 4. Compile messages payload in standard format
    // Aggregators usually map Claude models using standard chat/completions (OpenAI format)
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.role === "ai" ? "assistant" : "user",
        content: h.content
      })),
      { role: "user", content: message }
    ]

    // 5. Query DMXAPI Gateway
    const response = await fetch(`${dmxApiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dmxApiKey}`
      },
      body: JSON.stringify({
        model: dmxModel,
        messages: messages,
        temperature: 0.3 // Low temperature keeps the model strictly locked to your writing guidelines
      })
    })

    const responseText = await response.text()
    let responseData: any;
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`DMXAPI returned invalid response (Status ${response.status}): ${responseText.slice(0, 200)}`)
    }

    if (!response.ok) {
      throw new Error(responseData.error?.message || responseData.error || `DMXAPI server error: ${response.status}`)
    }

    // 6. Multi-protocol response parsing (OpenAI-compatible vs Anthropic native)
    let reply = ""
    if (responseData.choices && responseData.choices[0]?.message?.content) {
      // OpenAI Chat format
      reply = responseData.choices[0].message.content
    } else if (responseData.content && responseData.content[0]?.text) {
      // Anthropic Message format
      reply = responseData.content[0].text
    } else {
      throw new Error("Unsupported API response format from aggregator gateway.")
    }

    // 7. Return reply to client
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
