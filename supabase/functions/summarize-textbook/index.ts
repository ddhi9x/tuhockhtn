import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, lessonName, chapterName, grade } = await req.json();
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

    if (!content || !lessonName) {
      return new Response(JSON.stringify({ error: "Missing content or lessonName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Bạn là một giáo viên Khoa học tự nhiên cấp THCS giàu kinh nghiệm. Nhiệm vụ của bạn là tóm tắt nội dung sách giáo khoa thành bản tóm tắt dễ hiểu cho học sinh.

Trả về JSON (không markdown code block):
{
  "summary": "Bản tóm tắt chi tiết內容",
  "key_points": ["Điểm chính 1", "Điểm chính 2", "..."]
}`;

    const userPrompt = `Lớp ${grade} - ${chapterName || ''} - ${lessonName}\n\nNội dung SGK:\n${content.substring(0, 15000)}`;

    if (GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        }),
      });

      if (!response.ok) {
        throw new Error("Lỗi gọi Gemini API trực tiếp");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      return new Response(text, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Hết credits AI, vui lòng nạp thêm." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let parsed;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
    } catch {
      parsed = { summary: aiContent, key_points: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
