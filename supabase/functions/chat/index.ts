import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    let { messages, message, mode, systemPrompt: customSystemPrompt, stream = true } = body;

    // Hỗ trợ truyền 'message' (chuỗi đơn) hoặc 'messages' (mảng)
    if (!messages || messages.length === 0) {
      if (message) {
        messages = [{ role: 'user', content: message }];
      } else {
        throw new Error("Missing 'messages' or 'message' field in request body");
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Thử lấy từ database nếu có thể
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: settings, error: settingsError } = await supabase.from('app_settings').select('gemini_api_key').limit(1).maybeSingle();
        if (!settingsError && settings?.gemini_api_key) {
          GEMINI_API_KEY = settings.gemini_api_key;
        }
      }
    } catch (dbErr) {
      console.error("Lỗi khi truy cập app_settings, dùng fallback Secret:", dbErr);
    }

    const systemPrompt = customSystemPrompt || (mode === 'exercise'
      ? 'Bạn là một gia sư KHTN cấp THCS chuyên ra bài tập trắc nghiệm. Khi học sinh yêu cầu, hãy ra câu hỏi trắc nghiệm 4 đáp án A, B, C, D. Sau khi học sinh trả lời, hãy giải thích đáp án đúng. Sử dụng emoji phù hợp. Trả lời bằng tiếng Việt.'
      : 'Bạn là một gia sư Khoa học Tự nhiên cấp THCS (Vật lý, Hóa học, Sinh học). Hãy giải đáp thắc mắc của học sinh một cách dễ hiểu, chi tiết, có ví dụ minh họa. Sử dụng emoji phù hợp. Trả lời bằng tiếng Việt.');

    if (GEMINI_API_KEY) {
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Nếu không yêu cầu stream (như lúc tạo mô phỏng)
      if (!stream) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.7 }
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return new Response(JSON.stringify({ reply: text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Nếu yêu cầu stream
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7 }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
      }

      // Transform Gemini stream to OpenAI format
      const { readable, writable } = new TransformStream({
        transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (content) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
                }
              } catch (e) { /* ignore parse errors */ }
            }
          }
        }
      });

      response.body?.pipeTo(writable);
      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Lovable fallback (OpenAI-compatible)
    if (!LOVABLE_API_KEY) throw new Error("Chưa cấu hình GEMINI_API_KEY");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: stream,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Lovable API Error: ${response.status} - ${errText}`);
    }

    if (!stream) {
      const data = await response.json();
      return new Response(JSON.stringify({ reply: data.choices?.[0]?.message?.content || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
