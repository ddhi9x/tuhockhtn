import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonName, chapterName, grade } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!lessonName) {
      return new Response(JSON.stringify({ error: "Missing lessonName" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
  "content": "Nội dung lý thuyết đầy đủ (dùng markdown formatting: ##, ###, -, **bold**)",
  "summary": "Tóm tắt ngắn gọn 100-200 từ",
  "key_points": ["Điểm chính 1", "Điểm chính 2", "...", "tối đa 8 điểm"]
}`;

    const userPrompt = `Lớp ${grade} - ${chapterName || ''} - ${lessonName}

Hãy viết nội dung lý thuyết đầy đủ cho bài học này theo chương trình SGK KHTN "Kết nối tri thức với cuộc sống".`;

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
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
  } catch (e) {
    console.error("generate-theory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
