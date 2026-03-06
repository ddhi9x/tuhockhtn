import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { textContent, grade, curriculum, targetLessonId } = await req.json();
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

    // Helper for resilient snippet searching
    const findSnippetIndex = (text: string, snippet: string) => {
      if (!snippet) return -1;
      const index = text.indexOf(snippet);
      if (index !== -1) return index;

      // Fallback: search with normalized spaces if direct match fails
      const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
      const normalizedSnippet = normalize(snippet);
      if (normalizedSnippet.length < 10) return -1;

      // Look for a close match in the first 200k chars
      const searchRegion = text.substring(0, 250000);
      const normalizedSearch = normalize(searchRegion);
      const normIndex = normalizedSearch.indexOf(normalizedSnippet);

      if (normIndex !== -1) {
        // Approximate back to original index
        return Math.floor((normIndex / normalizedSearch.length) * searchRegion.length);
      }
      return -1;
    };

    let allExtractedQuestions: any[] = [];

    if (targetLessonId) {
      console.log(`TARGETED EXTRACTION: Jumping straight to lesson ${targetLessonId}`);
      // Skip Mapping Pass, treat entire content as the target lesson
      const extractionPrompt = `Bạn là chuyên gia bóc tách dữ liệu bài tập KHTN cấp THCS.
Nhiệm vụ: Trích xuất ĐẦY ĐỦ 100% các câu hỏi trắc nghiệm có trong văn bản.
VĂN BẢN NÀY THUỘC VỀ BÀI HỌC: ${targetLessonId}

QUY TẮC:
1. Trích xuất TẤT CẢ câu hỏi có trong tài liệu.
2. Mỗi câu hỏi trắc nghiệm cần: question, 4 options (A/B/C/D), correct (index 0-3), explanation.
3. Phải giữ nguyên nội dung gốc của câu hỏi và đáp án.

Yêu cầu output JSON array:
[
  {
    "lesson_id": "${targetLessonId}",
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correct": 0,
    "explanation": "...",
    "difficulty_level": "medium"
  }
]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `VĂN BẢN TÀI LIỆU:\n\n${textContent.substring(0, 50000)}` }] }],
          systemInstruction: { parts: [{ text: extractionPrompt }] },
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const questions = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "[]");
        if (Array.isArray(questions)) {
          const exInfo = curriculum.flatMap((ch: any) => ch.lessons.map((l: any) => ({ ...l, chapter: ch.name }))).find((l: any) => l.id === targetLessonId);
          allExtractedQuestions = questions.map(q => ({
            ...q,
            lesson_id: targetLessonId,
            chapter_name: exInfo?.chapter || "Khác",
            lesson_name: exInfo?.name || "Nạp theo chủ đề",
          }));
        }
      }
    } else {
      // --- PASS 1: STRUCTURAL MAPPING ---
      console.log(`PASS 1: Mapping structural boundaries for Import`);

      // Build lesson list for the AI to reference
      const lessonList = curriculum.map((ch: any) =>
        ch.lessons.map((l: any) => `${l.id} | ${ch.name} | ${l.name}`).join('\n')
      ).join('\n');

      const mappingPrompt = `Bạn là chuyên gia phân tích cấu trúc tài liệu giáo khoa KHTN.
Nhiệm vụ: Duyệt qua toàn bộ văn bản và xác định CHÍNH XÁC các ranh giới (đoạn bắt đầu/kết thúc) của từng bài học.

DANH SÁCH BÀI HỌC CẦN TÌM:
${lessonList}

Yêu cầu output JSON định dạng:
{
  "map": [
    { "lesson_id": "id", "start_snippet": "Câu văn bắt đầu bài học (khoảng 50 ký tự)", "end_snippet": "Câu văn kết thúc bài học (khoảng 50 ký tự)" }
  ]
}
- Chỉ đưa vào map những bài thực sự có trong file.`;

      const mappingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `VĂN BẢN TÀI LIỆU:\n\n${textContent.substring(0, 200000)}` }] }],
          systemInstruction: { parts: [{ text: mappingPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        }),
      });

      if (!mappingResponse.ok) throw new Error("Structural mapping failed: " + await mappingResponse.text());
      const mappingResult = await mappingResponse.json();
      const lessonMap = JSON.parse(mappingResult.candidates?.[0]?.content?.parts?.[0]?.text || '{"map":[]}').map;

      console.log(`Found ${lessonMap.length} lessons in map. Starting extraction...`);

      // --- PASS 2: TARGETED EXTRACTION ---
      for (const entry of lessonMap) {
        console.log(`Extracting: ${entry.lesson_id}...`);

        const startIdx = findSnippetIndex(textContent, entry.start_snippet);
        const endIdx = findSnippetIndex(textContent, entry.end_snippet);

        let segment = "";
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          segment = textContent.substring(startIdx, endIdx + (entry.end_snippet?.length || 50));
        } else if (startIdx !== -1) {
          segment = textContent.substring(startIdx, startIdx + 30000);
        } else {
          continue;
        }

        const extractionPrompt = `Trích xuất ĐẦY ĐỦ câu hỏi trắc nghiệm cho Bài học: ${entry.lesson_id}. JSON output array [ { question, options, correct, explanation } ]`;

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `ĐOẠN VĂN BẢN TRÍCH XUẤT:\n\n${segment}` }] }],
              systemInstruction: { parts: [{ text: extractionPrompt }] },
              generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
            }),
          });

          if (!response.ok) continue;
          const result = await response.json();
          const questions = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "[]");

          if (Array.isArray(questions)) {
            const exInfo = curriculum.flatMap((ch: any) => ch.lessons.map((l: any) => ({ ...l, chapter: ch.name }))).find((l: any) => l.id === entry.lesson_id);
            allExtractedQuestions = [...allExtractedQuestions, ...questions.map(q => ({
              ...q,
              lesson_id: entry.lesson_id,
              chapter_name: exInfo?.chapter || "Khác",
              lesson_name: exInfo?.name || "Nạp từ file",
              difficulty_level: q.difficulty_level || 'medium'
            }))];
          }
        } catch (err) { console.error(`Error in extraction pass for ${entry.lesson_id}:`, err); }
      }
    }

    return new Response(JSON.stringify({ questions: allExtractedQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-exercises error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
