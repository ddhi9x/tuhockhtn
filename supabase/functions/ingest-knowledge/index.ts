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

        // Split text into batches with OVERLAP to maintain context
        const BATCH_SIZE = 12000;
        const OVERLAP = 1000;
        const textBatches: string[] = [];

        let currentPos = 0;
        while (currentPos < textContent.length) {
            const end = Math.min(currentPos + BATCH_SIZE, textContent.length);
            textBatches.push(textContent.substring(currentPos, end));
            if (end === textContent.length) break;
            currentPos += (BATCH_SIZE - OVERLAP); // Move forward but keep some overlap
        }

        console.log(`Processing ${textBatches.length} batches for source ${sourceId}`);

        let totalTheory = 0;
        let totalExercises = 0;

        for (let b = 0; b < textBatches.length; b++) {
            console.log(`Processing batch ${b + 1}/${textBatches.length}...`);
            const currentBatch = textBatches[b];

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: `PHẦN TÀI LIỆU (${b + 1}/${textBatches.length}):\n\n${currentBatch}` }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        generationConfig: {
                            temperature: 0.0, // Force most deterministic output
                            responseMimeType: "application/json"
                        }
                    }),
                });

                if (!response.ok) {
                    console.error(`Batch ${b + 1} failed:`, await response.text());
                    continue;
                }

                const result = await response.json();
                const parsed = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

                // 1. Save theory chunks
                const chunks = parsed.theory_chunks || [];
                if (chunks.length > 0) {
                    const chunkRows = chunks.map((c: any) => ({
                        source_id: sourceId,
                        grade,
                        lesson_id: c.lesson_id,
                        content: c.content,
                        metadata: { key_points: c.key_points }
                    }));
                    await supabase.from('knowledge_chunks').insert(chunkRows);

                    // Update lesson_theory
                    for (const piece of chunks) {
                        if (!piece.lesson_id) continue;
                        const { data: existing } = await supabase.from('lesson_theory').select('content').eq('lesson_id', piece.lesson_id).maybeSingle();
                        if (existing) {
                            const newContent = existing.content + "\n\n--- Trích xuất từ tài liệu mới ---\n" + piece.content;
                            await supabase.from('lesson_theory').update({ content: newContent }).eq('lesson_id', piece.lesson_id);
                        } else {
                            const info = curriculum.flatMap((ch: any) => ch.lessons).find((l: any) => l.id === piece.lesson_id);
                            if (info) {
                                await supabase.from('lesson_theory').insert({
                                    lesson_id: piece.lesson_id,
                                    lesson_name: info.name,
                                    grade,
                                    content: piece.content,
                                    summary: piece.content.substring(0, 500)
                                });
                            }
                        }
                    }
                    totalTheory += chunks.length;
                }

                // 2. Save exercises
                const exercises = parsed.exercises || [];
                if (exercises.length > 0) {
                    const exerciseRows = exercises.map((ex: any) => {
                        let chapter_name = "Khác";
                        let lesson_name = "Nạp từ file";
                        for (const ch of curriculum) {
                            const l = ch.lessons.find((l: any) => l.id === ex.lesson_id);
                            if (l) {
                                chapter_name = ch.name;
                                lesson_name = l.name;
                                break;
                            }
                        }
                        return {
                            grade,
                            chapter_name,
                            lesson_id: ex.lesson_id,
                            lesson_name,
                            question: ex.question,
                            options: ex.options,
                            correct_answer: ex.correct,
                            explanation: ex.explanation,
                            is_ai_generated: true
                        };
                    });
                    await supabase.from('exercises').insert(exerciseRows);
                    totalExercises += exercises.length;
                }
            } catch (batchErr) {
                console.error(`Error processing batch ${b + 1}:`, batchErr);
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
