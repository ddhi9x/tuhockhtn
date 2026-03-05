import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { textContent, grade, curriculum } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!textContent || !grade || !curriculum) {
      return new Response(JSON.stringify({ error: "Missing textContent, grade, or curriculum" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build lesson list for the AI to reference
    const lessonList = curriculum.map((ch: any) =>
      ch.lessons.map((l: any) => `${l.id} | ${ch.name} | ${l.name}`).join('\n')
    ).join('\n');

    const systemPrompt = `Bạn là chuyên gia phân tích đề thi/bài tập KHTN cấp THCS theo sách "Kết nối tri thức với cuộc sống".

Nhiệm vụ: Phân tích văn bản chứa câu hỏi trắc nghiệm, trích xuất từng câu và phân loại vào đúng bài học.

Danh sách bài học lớp ${grade}:
${lessonList}

Quy tắc:
1. Mỗi câu hỏi trắc nghiệm cần có: question, 4 options (A/B/C/D), correct (index 0-3), explanation
2. Dựa vào nội dung câu hỏi, khớp với bài học phù hợp nhất trong danh sách trên
3. Nếu không rõ bài nào, chọn bài gần nhất dựa theo chủ đề
4. Xác định difficulty_level: "easy" (nhận biết), "medium" (thông hiểu), "hard" (vận dụng)
5. Options phải có prefix A./B./C./D.
6. Nếu đáp án đúng được chỉ rõ trong text, dùng đó. Nếu không, hãy xác định đáp án đúng

Trả về JSON array (không markdown code block):
[
  {
    "lesson_id": "g6-c1-l1",
    "chapter_name": "Chương I: ...",
    "lesson_name": "Bài 1: ...",
    "question": "Nội dung câu hỏi",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": 0,
    "explanation": "Giải thích ngắn",
    "difficulty_level": "medium"
  }
]`;

    const userPrompt = `Phân tích và trích xuất tất cả câu hỏi trắc nghiệm từ văn bản sau. Phân loại mỗi câu vào đúng bài học lớp ${grade}:

${textContent.substring(0, 30000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Đã hết lượt sử dụng AI." }), {
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
    const text = data?.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Response(JSON.stringify({ questions: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Không thể phân tích câu hỏi từ văn bản." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-exercises error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
