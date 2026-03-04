import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonName, chapterName, grade } = await req.json();
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

    const systemPrompt = `Bạn là một giáo viên Khoa học tự nhiên cấp THCS giàu kinh nghiệm, dạy theo bộ sách "Kết nối tri thức với cuộc sống".

Nhiệm vụ: Viết nội dung lý thuyết chi tiết, chính xác cho bài học được yêu cầu. Nội dung phải bám sát chương trình SGK KHTN "Kết nối tri thức với cuộc sống".

Yêu cầu:
- Viết đầy đủ, chi tiết (800-1500 từ), dùng ngôn ngữ dễ hiểu cho học sinh THCS
- Chia thành các mục rõ ràng với tiêu đề (dùng ## và ###)
- Có ví dụ minh họa cụ thể
- Giải thích các khái niệm quan trọng
- Liên hệ thực tế khi có thể

Trả về JSON (không markdown code block):
{
  "content": "Nội dung lý thuyết chi tiết",
  "summary": "Tóm tắt ngắn gọn",
  "key_points": ["Điểm chính 1", "Điểm chính 2", "..."]
}`;

    const userPrompt = `Lớp ${grade} - ${chapterName || ''} - ${lessonName}. Viết lý thuyết chi tiết.`;

    if (GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7 }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Gemini Theory error:", err);
        throw new Error(`Gemini API Error: ${err}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let parsedData = { content: "", summary: "", key_points: [] };
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Lỗi parse regex JSON theory:", e);
        }
      } else {
        try {
          parsedData = JSON.parse(text);
        } catch (e) {
          console.error("Lỗi parse text thuần JSON theory:", e);
        }
      }

      return new Response(JSON.stringify(parsedData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!LOVABLE_API_KEY) throw new Error("Chưa cấu hình GEMINI_API_KEY");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: corsHeaders });
      const t = await response.text();
      console.error("Gateway Theory error:", t);
      throw new Error("Gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
    } catch {
      parsed = { content: aiContent, summary: "", key_points: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-theory error:", e);
    return new Response(JSON.stringify({ error: `Lỗi Backend: ${e.message}`, stack: e.stack }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
