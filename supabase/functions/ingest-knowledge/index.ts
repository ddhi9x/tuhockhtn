import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    let sourceId: string | null = null;
    try {
        const body = await req.json();
        sourceId = body.sourceId;
        const { textContent, grade, curriculum } = body;
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get API Key
        const { data: settings } = await supabase.from('app_settings').select('gemini_api_key').limit(1).maybeSingle();
        const GEMINI_API_KEY = settings?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");

        if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

        // Update status to processing
        await supabase.from('knowledge_sources').update({ status: 'processing' }).eq('id', sourceId);

        const lessonList = curriculum.map((ch: any) =>
            ch.lessons.map((l: any) =>
                `ID: ${l.id} | Bài: ${l.name} | Chủ đề chính: ${l.summary || 'Không có mô tả'}`
            ).join('\n')
        ).join('\n');

        const systemPrompt = `Bạn là chuyên gia phân tích giáo trình Khoa học tự nhiên (KHTN) THCS. 
Nhiệm vụ: Phân tích đoạn văn bản này để trích xuất LÝ THUYẾT và BÀI TẬP trắc nghiệm.

DANH SÁCH BÀI HỌC VÀ CHỦ ĐỀ ĐỂ PHÂN LOẠI:
${lessonList}

QUY TẮC PHÂN LOẠI "THÔNG MINH" (BẢN V3):
1. TRUY TÌM TIÊU ĐỀ: Tìm các dấu hiệu tiêu đề trong văn bản như "Bài 13:", "Dạng 1:", "III. Áp suất", "Câu hỏi ôn tập Bài 15"... để xác định mốc phân loại.
2. NGỮ CẢNH LIÊN TỤC: Dữ liệu này được chia nhỏ từ một file lớn. Nếu câu hỏi nằm ngay sau một tiêu đề bài học, hãy gán nó cho bài học đó.
3. PHÂN TÍCH TỪ KHÓA CHUYÊN SÂU:
   - "Khối lượng", "Thể tích", "Cân", "Bình chia độ" -> ID Bài 13 hoặc 14.
   - "Áp suất", "p=F/S", "Diện tích bị ép", "Lực kế" -> ID Bài 15 hoặc 16.
   - "Archimedes", "Lực đẩy", "nhúng trong lỏng", "trọng lượng nước chiếm chỗ" -> ID Bài 17.
4. CỨNG RẮN: Đừng gán bừa vào Bài 13 nếu nội dung rõ ràng nói về Áp suất hay Lực đẩy.

Yêu cầu output JSON định dạng:
{
  "theory_chunks": [
    { "lesson_id": "id", "reasoning": "Tại sao chọn id này?", "content": "Nội dung tóm tắt lý thuyết", "key_points": ["..."] }
  ],
  "exercises": [
    { "lesson_id": "id", "reasoning": "Tại sao chọn id này?", "question": "...", "options": ["A...", "B..."], "correct": 0, "explanation": "..." }
  ]
}
- GHI CHÚ: Trường 'reasoning' để bạn tự biện luận lý do chọn bài học (dựa trên tiêu đề hoặc từ khóa tìm được).
- CHỈ trả về JSON nguyên khối.`;

        // --- PASS 1: STRUCTURAL MAPPING ---
        console.log(`PASS 1: Mapping structural boundaries for ${sourceId}`);
        const mappingPrompt = `Bạn là chuyên gia phân tích cấu trúc tài liệu giáo khoa KHTN.
Nhiệm vụ: Duyệt qua toàn bộ văn bản và xác định các ranh giới (đoạn bắt đầu/kết thúc) của từng bài học.

DANH SÁCH BÀI HỌC CẦN TÌM:
${lessonList}

Yêu cầu output JSON định dạng:
{
  "map": [
    { "lesson_id": "id", "start_snippet": "Câu văn bắt đầu bài học (khoảng 50 ký tự)", "end_snippet": "Câu văn kết thúc bài học (hoảng 50 ký tự)" }
  ]
}
- Nếu một bài học không xuất hiện trong tài liệu, đừng đưa vào map.
- Đảm bảo trật tự các bài học đúng như trong file.`;

        const mappingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `VĂN BẢN TÀI LIỆU:\n\n${textContent.substring(0, 100000)}` }] }], // Scan first 100k chars for structure
                systemInstruction: { parts: [{ text: mappingPrompt }] },
                generationConfig: { responseMimeType: "application/json" }
            }),
        });

        if (!mappingResponse.ok) throw new Error("Structural mapping failed: " + await mappingResponse.text());
        const mappingResult = await mappingResponse.json();
        const lessonMap = JSON.parse(mappingResult.candidates?.[0]?.content?.parts?.[0]?.text || '{"map":[]}').map;

        console.log(`Found ${lessonMap.length} lessons in map. Starting extraction...`);

        // --- PASS 2: TARGETED EXTRACTION ---
        let totalTheory = 0;
        let totalExercises = 0;

        for (const entry of lessonMap) {
            console.log(`Extracting: ${entry.lesson_id}...`);

            // Find boundaries in text
            const startIdx = entry.start_snippet ? textContent.indexOf(entry.start_snippet) : -1;
            const endIdx = entry.end_snippet ? textContent.indexOf(entry.end_snippet) : -1;

            let segment = "";
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                segment = textContent.substring(startIdx, endIdx + entry.end_snippet.length);
            } else if (startIdx !== -1) {
                segment = textContent.substring(startIdx, startIdx + 20000); // Fallback to window
            } else {
                continue; // Skip if can't find boundary
            }

            const extractionPrompt = `Bạn là chuyên gia trích xuất dữ liệu KHTN THCS.
Nhiệm vụ: Trích xuất LÝ THUYẾT và tối đa 25 CÂU HỎI TRẮC NGHIỆM hay nhất cho Bài học sau:
BÀI HỌC: ${entry.lesson_id}

QUY TẮC:
1. CHỈ trích xuất nội dung thuộc về bài học này.
2. Lấy tối đa 25 câu hỏi trắc nghiệm chất lượng nhất (ưu tiên có cả 4 phương án).
3. Đảm bảo JSON hợp lệ.

Yêu cầu output JSON:
{
  "theory": { "content": "...", "key_points": ["..."] },
  "exercises": [
    { "question": "...", "options": ["A...", "B..."], "correct": 0, "explanation": "..." }
  ]
}`;

            try {
                const extractionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: `ĐOẠN VĂN BẢN TRÍCH XUẤT:\n\n${segment}` }] }],
                        systemInstruction: { parts: [{ text: extractionPrompt }] },
                        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
                    }),
                });

                if (!extractionResponse.ok) continue;

                const result = await extractionResponse.json();
                const parsed = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

                // Save Theory
                if (parsed.theory) {
                    const { data: existing } = await supabase.from('lesson_theory').select('id, content').eq('lesson_id', entry.lesson_id).maybeSingle();
                    if (existing) {
                        const newContent = existing.content + "\n\n--- Cập nhật mới ---\n" + parsed.theory.content;
                        await supabase.from('lesson_theory').update({ content: newContent, updated_at: new Date().toISOString() }).eq('id', existing.id);
                    } else {
                        const info = curriculum.flatMap((ch: any) => ch.lessons).find((l: any) => l.id === entry.lesson_id);
                        if (info) {
                            await supabase.from('lesson_theory').insert({
                                lesson_id: entry.lesson_id,
                                lesson_name: info.name,
                                grade,
                                content: parsed.theory.content,
                                summary: parsed.theory.content.substring(0, 500),
                                key_points: parsed.theory.key_points
                            });
                        }
                    }
                    totalTheory++;
                }

                // Save Exercises
                const exercises = parsed.exercises || [];
                if (exercises.length > 0) {
                    const exInfo = curriculum.flatMap((ch: any) => ch.lessons.map((l: any) => ({ ...l, chapter: ch.name }))).find((l: any) => l.id === entry.lesson_id);
                    const exerciseRows = exercises.map((ex: any) => ({
                        grade,
                        chapter_name: exInfo?.chapter || "Khác",
                        lesson_id: entry.lesson_id,
                        lesson_name: exInfo?.name || "Nạp từ file",
                        question: ex.question,
                        options: ex.options,
                        correct_answer: ex.correct,
                        explanation: ex.explanation,
                        is_ai_generated: true
                    }));
                    await supabase.from('exercises').insert(exerciseRows);
                    totalExercises += exercises.length;
                }
            } catch (err) {
                console.error(`Error in extraction pass for ${entry.lesson_id}:`, err);
            }
        }

        // Mark as completed
        await supabase.from('knowledge_sources').update({ status: 'completed' }).eq('id', sourceId);

        return new Response(JSON.stringify({ success: true, theoryCount: totalTheory, exerciseCount: totalExercises }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e: any) {
        console.error("ingest-knowledge error:", e);

        // Try to update status to error if sourceId is available
        try {
            const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
            const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            await supabase.from('knowledge_sources').update({
                status: 'error',
                error_message: e.message
            }).eq('id', sourceId);
        } catch (statusErr) {
            console.error("Could not update error status:", statusErr);
        }

        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
