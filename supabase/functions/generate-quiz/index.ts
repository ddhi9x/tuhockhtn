import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonName, chapterName, grade, numQuestions } = await req.json();
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


    const count = Math.min(Math.max(numQuestions || 5, 1), 20);

    const systemPrompt = `Bạn là một giáo viên Khoa học Tự nhiên cấp THCS giỏi, chuyên soạn câu hỏi trắc nghiệm chất lượng cao theo chương trình sách giáo khoa "Kết nối tri thức với cuộc sống".

Quy tắc:
- Câu hỏi phải bám sát nội dung bài học được yêu cầu
- Mỗi câu có 4 đáp án A, B, C, D
- Đáp án nhiễu phải hợp lý, không quá dễ loại trừ
- Giải thích ngắn gọn, dễ hiểu, phù hợp lứa tuổi THCS
- Trộn đều các mức độ: nhận biết, thông hiểu, vận dụng

Trả về JSON array, mỗi phần tử có: question, options (array 4 strings có prefix A./B./C./D.), correct (index 0-3), explanation.`;

    const userPrompt = `Tạo ${count} câu hỏi trắc nghiệm lớp ${grade} cho bài "${lessonName}" (Chương ${chapterName}).`;

    if (GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Gemini Quiz error:", err);
        throw new Error("Lỗi gọi Gemini API cho bài tập");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      return new Response(JSON.stringify({ questions: JSON.parse(text) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!LOVABLE_API_KEY) throw new Error("Chưa cấu hình GEMINI_API_KEY");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Hệ thống đang bận" }), { status: 429, headers: corsHeaders });
      const t = await response.text();
      console.error("Gateway Quiz error:", t);
      throw new Error("Gateway error");
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({ questions: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Không thể phân tích câu hỏi");
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
