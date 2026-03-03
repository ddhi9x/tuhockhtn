import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { sectionTitle, lessonName, chapterName, grade, lessonId, description } = await req.json();

    if (!sectionTitle || !lessonId) {
      return new Response(JSON.stringify({ error: "Missing sectionTitle or lessonId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a detailed prompt for educational illustration
    const prompt = `Generate a clear, colorful educational illustration for Vietnamese middle school science (grade ${grade}).

Topic: "${sectionTitle}" from lesson "${lessonName}" (${chapterName}).
${description ? `Details: ${description}` : ''}

Requirements:
- Clean, simple educational diagram style with labels in Vietnamese
- Use bright colors on white/light background
- Include clear labels, arrows, and annotations
- Must be scientifically accurate
- Style: flat illustration, infographic-style, suitable for textbook
- NO text that's too small to read
- The illustration should explain the concept visually

Generate only the illustration image.`;

    console.log("Generating illustration for:", sectionTitle);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response keys:", JSON.stringify(Object.keys(data)));
    console.log("Choices:", JSON.stringify(data.choices?.length));
    
    const message = data.choices?.[0]?.message;
    const imageData = message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response. Message keys:", JSON.stringify(message ? Object.keys(message) : 'no message'));
      console.error("Full response (truncated):", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated - AI may not have produced an image for this topic");
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid image format");

    const imageFormat = base64Match[1]; // png, jpeg, etc.
    const base64Data = base64Match[2];
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const safeName = sectionTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40);
    const fileName = `${lessonId}/${safeName}-${Date.now()}.${imageFormat}`;

    const { error: uploadError } = await supabase.storage
      .from('theory-illustrations')
      .upload(fileName, imageBytes, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image: " + uploadError.message);
    }

    const { data: urlData } = supabase.storage
      .from('theory-illustrations')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update lesson_theory illustrations
    const { data: existing } = await supabase
      .from('lesson_theory')
      .select('illustrations')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const currentIllustrations = (existing?.illustrations as Record<string, string>) || {};
    currentIllustrations[sectionTitle] = publicUrl;

    await supabase
      .from('lesson_theory')
      .update({ illustrations: currentIllustrations })
      .eq('lesson_id', lessonId);

    console.log("Illustration saved:", publicUrl);

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-illustration error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
