import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const { sectionTitle, lessonName, chapterName, grade, lessonId, description } = await req.json();

    if (!sectionTitle || !lessonId) {
      return new Response(JSON.stringify({ error: "Missing sectionTitle or lessonId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating SVG illustration for:", sectionTitle);

    const systemPrompt = `You are a professional educational illustrator for Vietnamese Middle School Science (KHTN).
Your task is to create a scientifically accurate, clear, and beautiful SVG illustration for the topic: "${sectionTitle}".

Requirements:
- Output ONLY a valid SVG code.
- Style: Clean, modern, 2D infographic/diagram suitable for educational purposes. 
- UNIQUENESS: Every illustration must be UNIQUE and SPECIFIC to the provided topic. Do not reuse generic layouts if the description provides specific details.
- Background: Usually transparent or white.
- Labels: Use Vietnamese (Tiếng Việt) for all annotations and labels.
- Sizing: Ensure it's responsive (use viewBox, avoid fixed width/height if possible).
- Colors: Use professional, high-contrast educational color palettes.
- Content: The illustration must accurately represent the concept: "${description || sectionTitle}".

Return ONLY the XML/SVG code starting with <svg and ending with </svg>. No markdown formatting, no explanations.`;

    const userPrompt = `Bài học: ${lessonName} - Khối lớp: ${grade}. 
Chương: ${chapterName}.
Mục tiêu: Vẽ hình minh họa SVG cho phần "${sectionTitle}". 
Mô tả chi tiết: ${description || 'Tạo sơ đồ hoặc hình vẽ minh họa phù hợp cho phần kiến thức này.'}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.4 }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      throw new Error(`Gemini API failed (${response.status}): ${errText}`);
    }

    const result = await response.json();
    let svgCode = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up markdown if any
    if (svgCode.includes("```svg")) {
      svgCode = svgCode.split("```svg")[1].split("```")[0];
    } else if (svgCode.includes("```xml")) {
      svgCode = svgCode.split("```xml")[1].split("```")[0];
    } else if (svgCode.includes("```")) {
      svgCode = svgCode.split("```")[1].split("```")[0];
    }

    svgCode = svgCode.trim();

    if (!svgCode.startsWith("<svg")) {
      console.error("Invalid SVG output from AI:", svgCode.substring(0, 100));
      throw new Error("AI did not generate a valid SVG code. Please try again.");
    }

    // Initialize Supabase Storage
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create a safe filename
    const safeTitle = sectionTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 40);
    const fileName = `${lessonId}/${safeTitle}-${Date.now()}.svg`;

    const { error: uploadError } = await supabase.storage
      .from("theory-illustrations")
      .upload(fileName, svgCode, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to save image to storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("theory-illustrations")
      .getPublicUrl(fileName);

    console.log("Successfully generated SVG:", publicUrl);

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("generate-illustration error:", e);
    // Trả về 200 để Frontend hiển thị được nội dung lỗi
    return new Response(JSON.stringify({
      error: `Lỗi AI Minh họa (SVG): ${e.message}`,
      details: e.stack
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
