import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, lessonName, chapterName, grade } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!content || !lessonName) {
      return new Response(JSON.stringify({ error: "Missing content or lessonName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Bạn là một giáo viên Khoa học tự nhiên cấp THCS giàu kinh nghiệm. Nhiệm vụ của bạn là tóm tắt nội dung sách giáo khoa thành bản tóm tắt dễ hiểu cho học sinh.

Hãy trả lời theo ĐÚNG format JSON sau (không markdown, không code block):
{
  "summary": "Bản tóm tắt chi tiết nội dung bài học (500-1000 từ), có chia thành các phần rõ ràng với tiêu đề. Sử dụng ngôn ngữ đơn giản, dễ hiểu. Có thể dùng markdown formatting.",
  "key_points": ["Điểm chính 1", "Điểm chính 2", "Điểm chính 3", "...tối đa 8 điểm"]
}`;

    const userPrompt = `Lớp ${grade} - ${chapterName || ''} - ${lessonName}

Nội dung SGK:
${content.substring(0, 15000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
