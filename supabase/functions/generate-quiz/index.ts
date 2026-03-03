import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonName, chapterName, grade, numQuestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = Math.min(Math.max(numQuestions || 5, 1), 20);

    const systemPrompt = `Bạn là một giáo viên Khoa học Tự nhiên cấp THCS giỏi, chuyên soạn câu hỏi trắc nghiệm chất lượng cao theo chương trình sách giáo khoa "Kết nối tri thức với cuộc sống".

Quy tắc:
- Câu hỏi phải bám sát nội dung bài học được yêu cầu
- Mỗi câu có 4 đáp án A, B, C, D
- Đáp án nhiễu phải hợp lý, không quá dễ loại trừ
- Giải thích ngắn gọn, dễ hiểu, phù hợp lứa tuổi THCS
- Trộn đều các mức độ: nhận biết, thông hiểu, vận dụng`;

    const userPrompt = `Tạo ${count} câu hỏi trắc nghiệm cho:
- Bài: "${lessonName}"
- Chương: "${chapterName}"  
- Lớp: ${grade}

Trả về JSON array, mỗi phần tử có: question, options (array 4 strings có prefix A./B./C./D.), correct (index 0-3), explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Đã hết lượt sử dụng AI, vui lòng liên hệ quản trị viên." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Lỗi tạo câu hỏi AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Response(JSON.stringify({ questions: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Không thể phân tích câu hỏi từ AI" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
