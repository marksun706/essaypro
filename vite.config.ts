import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load local environment variables from .env
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'local-chat-backend',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/functions/v1/chat' && req.method === 'POST') {
              try {
                // 1. Read the raw request body
                let body = '';
                for await (const chunk of req) {
                  body += chunk;
                }
                const { message, history } = JSON.parse(body);

                // 2. Fetch configured env variables
                const dmxApiKey = env.DMX_API_KEY;
                const dmxApiUrl = env.DMX_API_URL || "https://api.dmxapi.cn";
                const dmxModel = env.DMX_MODEL || "claude-haiku-4-5-20251001-cc";

                if (!dmxApiKey) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: "DMX_API_KEY is not configured in your .env file." }));
                  return;
                }

                // 3. Load the system prompt from supabase edge function folder
                let systemPrompt = "";
                try {
                  const promptPath = path.resolve(process.cwd(), 'supabase/functions/chat/system-prompt.txt');
                  systemPrompt = fs.readFileSync(promptPath, 'utf8');
                } catch (e) {
                  systemPrompt = "You are a professional Ivy League admissions consultant and personal essay editor.";
                }

                // 4. Construct message history in Chat completions format
                const messages = [
                  { role: "system", content: systemPrompt },
                  ...(history || []).map((h: any) => ({
                    role: h.role === "ai" ? "assistant" : "user",
                    content: h.content
                  })),
                  { role: "user", content: message }
                ];

                // 5. Query the DMXAPI endpoint
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

                const responseText = await response.text();
                let responseData: any;
                try {
                  responseData = JSON.parse(responseText);
                } catch (e) {
                  throw new Error(`DMXAPI returned invalid response (Status ${response.status}): ${responseText.slice(0, 200)}`);
                }

                if (!response.ok) {
                  throw new Error(responseData.error?.message || responseData.error || `DMXAPI error: ${response.status}`);
                }

                // 6. Support both OpenAI choices and Anthropic response styles
                let reply = "";
                if (responseData.choices && responseData.choices[0]?.message?.content) {
                  reply = responseData.choices[0].message.content;
                } else if (responseData.content && responseData.content[0]?.text) {
                  reply = responseData.content[0].text;
                } else {
                  throw new Error("Unsupported API response format from gateway.");
                }

                // 7. Send back the response
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ reply }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
  };
});

