import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { textContent, grade, curriculum } = await req.json();
    let GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Try to get GEMINI_API_KEY from database if not in env
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !GEMINI_API_KEY) {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: settings } = await supabase.from('app_settings').select('gemini_api_key').limit(1).maybeSingle();
        if (settings?.gemini_api_key) GEMINI_API_KEY = settings.gemini_api_key;
      }
    } catch (e) { console.error("Error fetching settings:", e); }

    if (!textContent || !grade || !curriculum) {
      return new Response(JSON.stringify({ error: "Missing textContent, grade, or curriculum" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build lesson list for the AI to reference
    const lessonList = curriculum.map((ch: any) =>
      ch.lessons.map((l: any) => `${l.id} | ${ch.name} | ${l.name}`).join('\n')
    ).join('\n');

    const systemPrompt = `Bạn là chuyên gia bóc tách dữ liệu bài tập KHTN cấp THCS.

NHIỆM VỤ QUAN TRỌNG NHẤT: Trích xuất ĐẦY ĐỦ 100% các câu hỏi trắc nghiệm có trong văn bản. 
TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT. KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ CÂU NÀO.

Danh sách bài học lớp ${grade} để phân loại:
${lessonList}

Quy tắc bóc tách:
1. Mỗi câu hỏi trắc nghiệm cần: question, 4 options (A/B/C/D), correct (index 0-3), explanation.
2. Khớp với lesson_id phù hợp nhất. Nếu không rõ, chọn bài gần nhất theo chủ đề.
3. Xác định difficulty_level: "easy", "medium", "hard".
4. Phải giữ nguyên nội dung gốc của câu hỏi và đáp án.

Trả về JSON array duy nhất (KHÔNG markdown code block):
[
  {
    "lesson_id": "...",
    "chapter_name": "...",
    "lesson_name": "...",
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": 0,
    "explanation": "...",
    "difficulty_level": "..."
  }
]`;

    const userPrompt = `DƯỚI ĐÂY LÀ VĂN BẢN CHỨA CÁC CÂU HỎI. HÃY BÓC TÁCH TẤT CẢ CÂU HỎI TRẮC NGHIỆM. 
HÃY LÀM CẨN THẬN, LẤY ĐỦ 100% SỐ CÂU, KHÔNG TỰ Ý RÚT GỌN:

${textContent.substring(0, 50000)}`;

    let aiResponse;
    if (GEMINI_API_KEY) {
      aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
        }),
      });
    } else if (LOVABLE_API_KEY) {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });
    } else {
      throw new Error("No API key configured (GEMINI_API_KEY or LOVABLE_API_KEY)");
    }

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI API error:", status, errorText);
      return new Response(JSON.stringify({ error: `AI Error (${status}): ${errorText.substring(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    let text = "";
    if (GEMINI_API_KEY) {
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      text = data?.choices?.[0]?.message?.content || "";
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Response(JSON.stringify({ questions: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Không thể phân tích câu hỏi từ văn bản. AI trả về format không đúng." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-exercises error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
