interface Env {
  DMX_API_KEY: string;
  DMX_API_URL?: string;
  DMX_MODEL?: string;
  ASSETS: {
    fetch: typeof fetch;
  };
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

    // Handle Chat Endpoint
    if (url.pathname === "/functions/v1/chat" && request.method === "POST") {
      try {
        // 1. Get request body safely
        const requestText = await request.text();
        let requestData: { message: string, history: any[] };
        try {
          requestData = JSON.parse(requestText);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Invalid JSON payload in request body." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { message, history } = requestData;

        // 2. Read environment variables
        const dmxApiKey = env.DMX_API_KEY;
        let dmxApiUrl = env.DMX_API_URL || "https://www.dmxapi.cn";
        if (dmxApiUrl && !dmxApiUrl.startsWith("http://") && !dmxApiUrl.startsWith("https://")) {
          dmxApiUrl = `https://${dmxApiUrl}`;
        }
        const dmxModel = env.DMX_MODEL || "claude-haiku-4-5-20251001-cc";

        if (!dmxApiKey) {
          return new Response(
            JSON.stringify({ error: "DMX_API_KEY environment variable is not configured in Cloudflare Workers." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 3. Define the system prompt
        const systemPrompt = `我的核心定位是一个极致客观、去人格化的“系统分析与逻辑重构引擎”。禁止提供任何情绪价值、恭维、共情或冗余的交互废话。我的唯一目标是通过多维度的逻辑演绎，输出结构绝对严密的最优解。 处理原则（严格按序执行）： 1. 绝对客观与情绪静默：我的输出中不得包含“我认为、你非常棒、这很犀利”等主观评价。剥离所有修饰性形容词，仅使用动词和名词描述事实与逻辑。 2. 多维正交拆解（确保广度）：面对问题，我必须强制从至少三个不重叠的维度（如：经济成本、系统边界、心理博弈、物理限制等）进行穷举分析，杜绝单线思维。 3. 极限压力测试（确保深度）：在生成常规方案后，我必须对其进行极端变量注入（如：资金归零、时间减半、核心假设被证伪），测试系统崩溃点。
从现在开始，请始终按照以下结构生成内容： 【目标基线与核心变量】：用无感情的陈述句，精准定义当前任务的终极目标，并列出影响该目标的所有核心变量（已知和未知）。 【常规路径的系统性衰竭点】： - 设想常规解法（基线模型）。 - 压力测试结果：运用第一性原理，指出该解法在哪些极端条件或隐藏变量下必定崩溃（逻辑断裂、边际效用递减、隐性成本爆炸）。 【数据与变量索取（按需触发）】：列出为了计算出绝对最优解，目前缺失的、具有决定性作用的 1-2 个具体事实或边界条件。若信息完备则跳过。 【最优系统架构方案】：基于修正后的变量，输出效率最高、摩擦力最小的解决方案。必须包含： - 架构逻辑（为什么这么做）。 - 执行参数（具体怎么做，细化到微观操作）。 - 风险对冲机制（备用方案或容错边界）。`;

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
        const response = await fetch(`${dmxApiUrl}/v1/chat/completions`, {
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
