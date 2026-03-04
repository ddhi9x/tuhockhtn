import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { curriculumData } from '@/data/curriculumData';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TheoryRecord {
  id: string;
  lesson_id: string;
  lesson_name: string;
  grade: number;
  chapter_name: string | null;
  content: string | null;
  summary: string | null;
  key_points: string[] | null;
}

const AdminTheoryPage = () => {
  const [theories, setTheories] = useState<TheoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState(6);
  const [selectedChapter, setSelectedChapter] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLessonId, setFormLessonId] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formKeyPoints, setFormKeyPoints] = useState('');

  // Batch generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, lessonName: '' });
  const abortRef = useRef(false);

  const gradeData = curriculumData.find(g => g.grade === selectedGrade);
  const chapters = gradeData?.chapters || [];

  useEffect(() => { fetchTheories(); }, []);

  const fetchTheories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lesson_theory')
      .select('*')
      .order('grade')
      .order('lesson_id');
    if (!error && data) {
      setTheories(data as unknown as TheoryRecord[]);
    }
    setLoading(false);
  };

  const theoryForLesson = (lessonId: string) =>
    theories.find(t => t.lesson_id === lessonId);

  // Count lessons with/without theory for current grade
  const statsForGrade = (grade: number) => {
    const gData = curriculumData.find(g => g.grade === grade);
    if (!gData) return { total: 0, done: 0 };
    const allLessons = gData.chapters.flatMap(c => c.lessons);
    const done = allLessons.filter(l => theories.some(t => t.lesson_id === l.id)).length;
    return { total: allLessons.length, done };
  };

  const openAddForm = (lessonId: string) => {
    setEditingId(null);
    setFormLessonId(lessonId);
    setFormContent('');
    setFormSummary('');
    setFormKeyPoints('');
    setShowForm(true);
  };

  const openEditForm = (theory: TheoryRecord) => {
    setEditingId(theory.id);
    setFormLessonId(theory.lesson_id);
    setFormContent(theory.content || '');
    setFormSummary(theory.summary || '');
    setFormKeyPoints(
      Array.isArray(theory.key_points) ? theory.key_points.join('\n') : ''
    );
    for (const g of curriculumData) {
      for (const c of g.chapters) {
        if (c.lessons.some(l => l.id === theory.lesson_id)) {
          setSelectedGrade(g.grade);
          setSelectedChapter(c.id);
        }
      }
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formLessonId || !formContent.trim()) {
      toast.error('Vui lòng chọn bài học và nhập nội dung.');
      return;
    }

    let lessonName = '';
    let chapterName = '';
    for (const g of curriculumData) {
      for (const c of g.chapters) {
        const l = c.lessons.find(l => l.id === formLessonId);
        if (l) { lessonName = l.name; chapterName = c.name; }
      }
    }

    const keyPointsArr = formKeyPoints.split('\n').map(s => s.trim()).filter(Boolean);
    const payload = {
      lesson_id: formLessonId,
      lesson_name: lessonName,
      grade: selectedGrade,
      chapter_name: chapterName,
      content: formContent.trim(),
      summary: formSummary.trim() || null,
      key_points: keyPointsArr.length > 0 ? keyPointsArr : null,
    };

    if (editingId) {
      const { error } = await supabase.from('lesson_theory').update(payload).eq('id', editingId);
      if (error) { toast.error('Lỗi cập nhật: ' + error.message); return; }
      toast.success('Đã cập nhật lý thuyết!');
    } else {
      const { error } = await supabase.from('lesson_theory').insert(payload);
      if (error) { toast.error('Lỗi thêm: ' + error.message); return; }
      toast.success('Đã thêm lý thuyết!');
    }

    setShowForm(false);
    fetchTheories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa nội dung lý thuyết này?')) return;
    const { error } = await supabase.from('lesson_theory').delete().eq('id', id);
    if (error) { toast.error('Lỗi xóa: ' + error.message); return; }
    toast.success('Đã xóa.');
    fetchTheories();
  };

  // Generate theory for a single lesson via AI
  const generateTheoryForLesson = useCallback(async (
    lessonId: string, lessonName: string, chapterName: string, grade: number
  ): Promise<boolean> => {
    setGeneratingLessonId(lessonId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-theory', {
        body: { lessonName, chapterName, grade },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error === 'rate_limit') toast.error('Quá nhiều yêu cầu, đợi 30s rồi thử lại...');
        else if (data.error === 'credits_exhausted') toast.error('Hết credits AI!');
        else toast.error(`Lỗi AI: ${data.error}`);
        return false;
      }

      const { error: dbError } = await supabase.from('lesson_theory').upsert({
        lesson_id: String(lessonId),
        lesson_name: lessonName,
        grade,
        chapter_name: chapterName,
        content: data.content || data.summary || '',
        summary: data.summary || '',
        key_points: data.key_points || [],
      }, { onConflict: 'lesson_id' });

      if (dbError) {
        console.error('DB error:', dbError);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('Generate error:', err);
      return false;
    } finally {
      setGeneratingLessonId(null);
    }
  }, []);

  // Generate for one lesson button
  const handleGenerateSingle = async (lessonId: string, lessonName: string, chapterName: string, grade: number) => {
    setIsGenerating(true);
    const ok = await generateTheoryForLesson(lessonId, lessonName, chapterName, grade);
    if (ok) {
      toast.success(`Đã tạo lý thuyết: ${lessonName}`);
      await fetchTheories();
    } else {
      toast.error(`Lỗi tạo lý thuyết: ${lessonName}`);
    }
    setIsGenerating(false);
  };

  // Batch generate for all missing lessons in selected grade
  const handleBatchGenerate = async () => {
    if (!gradeData) return;
    const missing: { lessonId: string; lessonName: string; chapterName: string }[] = [];
    for (const ch of gradeData.chapters) {
      for (const l of ch.lessons) {
        if (!theories.some(t => t.lesson_id === l.id)) {
          missing.push({ lessonId: l.id, lessonName: l.name, chapterName: ch.name });
        }
      }
    }
    if (missing.length === 0) {
      toast.info('Tất cả bài học đã có lý thuyết!');
      return;
    }
    if (!confirm(`Tạo lý thuyết AI cho ${missing.length} bài học lớp ${selectedGrade}? Quá trình này có thể mất vài phút.`)) return;

    setIsGenerating(true);
    abortRef.current = false;
    let successCount = 0;

    for (let i = 0; i < missing.length; i++) {
      if (abortRef.current) break;
      const item = missing[i];
      setBatchProgress({ current: i + 1, total: missing.length, lessonName: item.lessonName });

      const ok = await generateTheoryForLesson(item.lessonId, item.lessonName, item.chapterName, selectedGrade);
      if (ok) {
        successCount++;
        // Refresh theories periodically
        if (successCount % 5 === 0) await fetchTheories();
      } else {
        // Wait before retry on failure
        await new Promise(r => setTimeout(r, 5000));
      }

      // Small delay between requests to avoid rate limiting
      if (i < missing.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    await fetchTheories();
    setBatchProgress({ current: 0, total: 0, lessonName: '' });
    setIsGenerating(false);
    toast.success(`Hoàn thành! Đã tạo ${successCount}/${missing.length} bài.`);
  };

  const handleStopBatch = () => {
    abortRef.current = true;
    toast.info('Đang dừng...');
  };

  const currentLesson = (() => {
    for (const g of curriculumData) {
      for (const c of g.chapters) {
        const l = c.lessons.find(l => l.id === formLessonId);
        if (l) return l;
      }
    }
    return null;
  })();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStats = statsForGrade(selectedGrade);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MaterialIcon name="menu_book" size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quản lý Lý thuyết</h1>
              <p className="text-sm text-muted-foreground">
                Lớp {selectedGrade}: {currentStats.done}/{currentStats.total} bài đã có lý thuyết
              </p>
            </div>
          </div>

          {/* Batch generate button */}
          {!isGenerating ? (
            <button
              onClick={handleBatchGenerate}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <MaterialIcon name="auto_awesome" size={18} />
              Tạo AI cho tất cả (Lớp {selectedGrade})
            </button>
          ) : (
            <button
              onClick={handleStopBatch}
              className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              <MaterialIcon name="stop" size={18} />
              Dừng
            </button>
          )}
        </div>

        {/* Batch progress bar */}
        {isGenerating && batchProgress.total > 0 && (
          <div className="mb-4 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Đang tạo: {batchProgress.lessonName}
              </span>
              <span className="text-xs text-muted-foreground">
                {batchProgress.current}/{batchProgress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Grade selector */}
        <div className="flex gap-2 mb-4">
          {[6, 7, 8, 9].map(g => {
            const stats = statsForGrade(g);
            return (
              <button key={g} onClick={() => { setSelectedGrade(g); setSelectedChapter(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedGrade === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}>
                Lớp {g}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedGrade === g ? 'bg-primary-foreground/20' : 'bg-background'
                  }`}>
                  {stats.done}/{stats.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chapters */}
        <div className="grid gap-3">
          {chapters.map(chapter => {
            const chapterLessons = chapter.lessons;
            const chapterDone = chapterLessons.filter(l => theories.some(t => t.lesson_id === l.id)).length;

            return (
              <div key={chapter.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setSelectedChapter(selectedChapter === chapter.id ? '' : chapter.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MaterialIcon name={chapter.icon} size={20} className="text-primary" />
                    <span className="font-medium text-sm">{chapter.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${chapterDone === chapterLessons.length
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                      }`}>
                      {chapterDone}/{chapterLessons.length}
                    </span>
                  </div>
                  <MaterialIcon
                    name={selectedChapter === chapter.id ? 'expand_less' : 'expand_more'}
                    size={20} className="text-muted-foreground"
                  />
                </button>

                <AnimatePresence>
                  {selectedChapter === chapter.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      {chapter.lessons.map(lesson => {
                        const theory = theoryForLesson(lesson.id);
                        const isCurrentlyGenerating = generatingLessonId === lesson.id;

                        return (
                          <div key={lesson.id} className="border-b border-border last:border-b-0 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isCurrentlyGenerating && (
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">{lesson.name}</span>
                                {theory ? (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                                    ✓ Đã có
                                  </span>
                                ) : (
                                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                                    Chưa có
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {theory ? (
                                  <>
                                    <button onClick={() => openEditForm(theory)} className="p-1 hover:bg-muted rounded" title="Sửa">
                                      <MaterialIcon name="edit" size={16} className="text-info" />
                                    </button>
                                    <button onClick={() => handleDelete(theory.id)} className="p-1 hover:bg-muted rounded" title="Xóa">
                                      <MaterialIcon name="delete" size={16} className="text-destructive" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleGenerateSingle(lesson.id, lesson.name, chapter.name, selectedGrade)}
                                      disabled={isGenerating}
                                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                                      title="Tạo bằng AI"
                                    >
                                      <MaterialIcon name="auto_awesome" size={14} />
                                      AI
                                    </button>
                                    <button
                                      onClick={() => openAddForm(lesson.id)}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1"
                                    >
                                      <MaterialIcon name="edit" size={14} />
                                      Thủ công
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {theory?.summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{theory.summary}</p>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MaterialIcon name={editingId ? 'edit' : 'add_circle'} size={22} className="text-primary" />
                  {editingId ? 'Chỉnh sửa lý thuyết' : 'Thêm nội dung lý thuyết'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Bài học</label>
                    <p className="text-sm font-medium bg-muted rounded-lg px-3 py-2">
                      {currentLesson?.name || formLessonId}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tóm tắt bài học</label>
                    <textarea
                      value={formSummary}
                      onChange={e => setFormSummary(e.target.value)}
                      placeholder="Tóm tắt ngắn gọn nội dung bài học..."
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Nội dung chi tiết <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={formContent}
                      onChange={e => setFormContent(e.target.value)}
                      placeholder="Nhập nội dung lý thuyết chi tiết (hỗ trợ Markdown)..."
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm h-48 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Điểm chính (mỗi dòng một điểm)
                    </label>
                    <textarea
                      value={formKeyPoints}
                      onChange={e => setFormKeyPoints(e.target.value)}
                      placeholder={"Điểm chính 1\nĐiểm chính 2\nĐiểm chính 3"}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSave}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
                      {editingId ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                    <button onClick={() => setShowForm(false)}
                      className="px-6 bg-muted text-muted-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors">
                      Hủy
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminTheoryPage;
