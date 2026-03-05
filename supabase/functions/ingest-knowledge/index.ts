import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { sourceId, textContent, grade, curriculum } = await req.json();
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
            ch.lessons.map((l: any) => `${l.id} | ${ch.name} | ${l.name}`).join('\n')
        ).join('\n');

        const systemPrompt = `Bạn là chuyên gia phân tích tài liệu giáo khoa KHTN THCS. 
Đây là một PHẦN của tài liệu lớn. 
Nhiệm vụ: Phân tích đoạn văn bản này và trích xuất:
1. LÝ THUYẾT: Chia nhỏ văn bản thành các đoạn (chunks) theo từng bài học.
2. BÀI TẬP: Tìm các câu hỏi trắc nghiệm có trong văn bản.

Danh sách bài học lớp ${grade}:
${lessonList}

Yêu cầu output JSON định dạng:
{
  "theory_chunks": [
    { "lesson_id": "id", "content": "Nội dung tóm tắt lý thuyết", "key_points": ["..."] }
  ],
  "exercises": [
    { "lesson_id": "id", "question": "...", "options": ["A...", "B..."], "correct": 0, "explanation": "..." }
  ]
}

- Hãy cố gắng khớp đúng lesson_id từ danh sách.
- Nếu không chắc chắn về bài học, có thể để trống lesson_id hoặc khớp theo chương.
- CHỈ trả về JSON.`;

        // Split text into batches of ~25k chars
        const BATCH_SIZE = 25000;
        const textBatches: string[] = [];
        for (let i = 0; i < textContent.length; i += BATCH_SIZE) {
            textBatches.push(textContent.substring(i, i + BATCH_SIZE));
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
                        contents: [{ role: 'user', parts: [{ text: `Đoạn tài liệu ${b + 1}/${textBatches.length}:\n\n${currentBatch}` }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        generationConfig: { responseMimeType: "application/json" }
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
