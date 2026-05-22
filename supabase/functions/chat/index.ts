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
    const { message, history } = await req.json()

    // Read the system prompt file from the local directory
    let systemPrompt = "";
    try {
      systemPrompt = await Deno.readTextFile("./chat/system-prompt.txt");
    } catch (e) {
      try {
        // Fallback for different Deno mounting structures in Supabase environments
        systemPrompt = await Deno.readTextFile("./system-prompt.txt");
      } catch (err) {
        systemPrompt = "You are an Ivy League essay writing assistant.";
      }
    }

    // =========================================================================
    // PLACEHOLDER: This is where we will hook up your LLM provider in the next phase!
    // =========================================================================
    
    const reply = `🤖 **[Backend Server Active]**\n\n` +
                  `Successfully loaded your custom system-prompt file!\n\n` +
                  `**Current System Instructions Preview:**\n` +
                  `\`\`\`text\n` +
                  `${systemPrompt.slice(0, 310)}...\n` +
                  `\`\`\`\n\n` +
                  `* Ready to link to **OpenAI (GPT-4o)**, **Claude 3.5 Sonnet**, or **Gemini 1.5 Pro** whenever you are ready!`;

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
