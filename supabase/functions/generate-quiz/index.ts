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
      console.error("Lỗi khi truy cập app_settings:", dbErr);
    }

    const count = Math.min(Math.max(numQuestions || 5, 1), 50);

    const systemPrompt = `Bạn là giáo viên KHTN cấp THCS giỏi. Tạo bài tập ĐA DẠNG theo SGK "Kết nối tri thức".

QUAN TRỌNG: Trả về JSON array. Mỗi phần tử PHẢI có trường "type" để phân loại dạng câu hỏi.

Phân bố dạng câu hỏi:
- ~50% type="mcq" (Trắc nghiệm 4 đáp án)
- ~10% type="true_false" (Đúng/Sai)
- ~15% type="fill_blank" (Điền khuyết)
- ~15% type="matching" (Ghép nối)
- ~10% type="ordering" (Sắp xếp thứ tự)

CẤU TRÚC JSON CHO TỪNG DẠNG:

1. MCQ (Trắc nghiệm):
{
  "type": "mcq",
  "question": "Câu hỏi?",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": 0,
  "explanation": "Giải thích"
}

2. TRUE_FALSE (Đúng/Sai):
{
  "type": "true_false",
  "question": "Nhận định cần xác định đúng/sai",
  "correct_answer": true,
  "explanation": "Giải thích"
}

3. FILL_BLANK (Điền khuyết):
{
  "type": "fill_blank",
  "question": "Câu có chỗ trống dùng dấu ____. VD: Đơn vị đo cường độ dòng điện là ____.",
  "answers": ["Ampe", "A"],
  "explanation": "Giải thích"
}

4. MATCHING (Ghép nối):
{
  "type": "matching",
  "question": "Ghép các khái niệm ở cột trái với mô tả ở cột phải",
  "left": ["Proton", "Electron", "Neutron"],
  "right": ["Mang điện dương", "Mang điện âm", "Không mang điện"],
  "correct_pairs": [0, 1, 2],
  "explanation": "Giải thích"
}
Trong đó correct_pairs[i] = index của phần tử bên right ghép với left[i]. VD: left[0]="Proton" ghép với right[0]="Mang điện dương".

5. ORDERING (Sắp xếp):
{
  "type": "ordering",
  "question": "Sắp xếp các bước sau theo đúng thứ tự",
  "items": ["Bước 2 (sai vị trí)", "Bước 1 (sai vị trí)", "Bước 3 (sai vị trí)"],
  "correct_order": [1, 0, 2],
  "explanation": "Giải thích"
}
Trong đó correct_order = mảng chỉ số đúng. VD: items[correct_order[0]] là bước đầu tiên.

Quy tắc chung:
- Bám sát nội dung bài học KHTN.
- Trộn đều mức độ: nhận biết, thông hiểu, vận dụng.
- Giải thích ngắn gọn, dễ hiểu, phù hợp THCS.
- Dạng matching: tối đa 4-5 cặp. Dạng ordering: tối đa 4-5 mục.
- CHỈ trả về JSON array, không có text nào khác.`;

    const userPrompt = `Tạo ${count} câu hỏi đa dạng lớp ${grade} cho bài "${lessonName}" (Chương ${chapterName}).`;

    if (GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Gemini Quiz error:", err);
        throw new Error(`Gemini API Error: ${err}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

      let parsedQuestions = [];
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { parsedQuestions = JSON.parse(jsonMatch[0]); } catch (e) { console.error("Lỗi parse JSON:", e); }
      } else {
        try { parsedQuestions = JSON.parse(text); } catch (e) { console.error("Lỗi parse text JSON:", e); }
      }

      return new Response(JSON.stringify({ questions: parsedQuestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!LOVABLE_API_KEY) throw new Error("Chưa cấu hình GEMINI_API_KEY");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-1.5-pro",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Hệ thống đang bận" }), { status: 429, headers: corsHeaders });
      throw new Error("Gateway error");
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return new Response(JSON.stringify({ questions: JSON.parse(jsonMatch[0]) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Không thể phân tích câu hỏi");
  } catch (e: any) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: `Lỗi Backend: ${e.message}`, stack: e.stack }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
