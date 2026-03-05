import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { curriculumData } from '@/data/curriculumData';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

interface ExerciseRecord {
  id: string;
  grade: number;
  chapter_name: string;
  lesson_id: string;
  lesson_name: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  difficulty_level: string;
  is_ai_generated: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ', color: 'text-success bg-success/10' },
  { value: 'medium', label: 'Trung bình', color: 'text-warning bg-warning/10' },
  { value: 'hard', label: 'Khó', color: 'text-destructive bg-destructive/10' },
];

const AdminExercisesPage = () => {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState(6);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLessonId, setFormLessonId] = useState('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState(['', '', '', '']);
  const [formCorrect, setFormCorrect] = useState(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('medium');

  // AI generation state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLessonId, setAiLessonId] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importGrade, setImportGrade] = useState(6);
  const [importParsing, setImportParsing] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const gradeData = curriculumData.find(g => g.grade === selectedGrade);
  const chapters = gradeData?.chapters || [];

  useEffect(() => { fetchExercises(); }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('grade')
      .order('lesson_id')
      .order('difficulty_level');
    if (!error && data) {
      setExercises(data.map(d => ({ ...d, options: d.options as unknown as string[] })) as ExerciseRecord[]);
    }
    setLoading(false);
  };

  const exercisesForLesson = (lessonId: string) =>
    exercises.filter(e => e.lesson_id === lessonId);

  const getLessonInfo = (lessonId: string) => {
    for (const g of curriculumData) {
      for (const c of g.chapters) {
        const l = c.lessons.find(l => l.id === lessonId);
        if (l) return { lessonName: l.name, chapterName: c.name, grade: g.grade };
      }
    }
    return null;
  };

  const openAddForm = (lessonId: string) => {
    setEditingId(null);
    setFormLessonId(lessonId);
    setFormQuestion('');
    setFormOptions(['', '', '', '']);
    setFormCorrect(0);
    setFormExplanation('');
    setFormDifficulty('medium');
    setShowForm(true);
  };

  const openEditForm = (ex: ExerciseRecord) => {
    setEditingId(ex.id);
    setFormLessonId(ex.lesson_id);
    setFormQuestion(ex.question);
    setFormOptions([...ex.options, '', '', '', ''].slice(0, 4));
    setFormCorrect(ex.correct_answer);
    setFormExplanation(ex.explanation || '');
    setFormDifficulty(ex.difficulty_level);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formLessonId || !formQuestion.trim() || formOptions.some(o => !o.trim())) {
      toast.error('Vui lòng điền đầy đủ câu hỏi và 4 đáp án.');
      return;
    }
    const info = getLessonInfo(formLessonId);
    if (!info) { toast.error('Không tìm thấy bài học.'); return; }

    const payload = {
      grade: info.grade,
      chapter_name: info.chapterName,
      lesson_id: formLessonId,
      lesson_name: info.lessonName,
      question: formQuestion.trim(),
      options: formOptions.map(o => o.trim()),
      correct_answer: formCorrect,
      explanation: formExplanation.trim() || null,
      difficulty_level: formDifficulty,
      is_ai_generated: false,
    };

    if (editingId) {
      const { error } = await supabase.from('exercises').update(payload).eq('id', editingId);
      if (error) { toast.error('Lỗi cập nhật: ' + error.message); return; }
      toast.success('Đã cập nhật câu hỏi!');
    } else {
      const { error } = await supabase.from('exercises').insert(payload);
      if (error) { toast.error('Lỗi thêm: ' + error.message); return; }
      toast.success('Đã thêm câu hỏi!');
    }
    setShowForm(false);
    fetchExercises();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) { toast.error('Lỗi xóa: ' + error.message); return; }
    toast.success('Đã xóa.');
    fetchExercises();
  };

  // AI Batch Generation
  const handleAIGenerate = async () => {
    if (!aiLessonId) { toast.error('Vui lòng chọn bài học.'); return; }
    const info = getLessonInfo(aiLessonId);
    if (!info) return;

    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { lessonName: info.lessonName, chapterName: info.chapterName, grade: info.grade, numQuestions: aiCount },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setAiGenerating(false); return; }

      const questions = data?.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        toast.error('AI không trả về câu hỏi hợp lệ.'); setAiGenerating(false); return;
      }

      // Insert all generated questions
      const rows = questions.map((q: any) => ({
        grade: info.grade,
        chapter_name: info.chapterName,
        lesson_id: aiLessonId,
        lesson_name: info.lessonName,
        question: q.question,
        options: q.options,
        correct_answer: q.correct,
        explanation: q.explanation || null,
        difficulty_level: 'medium',
        is_ai_generated: true,
      }));

      const { error: insertError } = await supabase.from('exercises').insert(rows);
      if (insertError) { toast.error('Lỗi lưu: ' + insertError.message); setAiGenerating(false); return; }

      toast.success(`Đã tạo và lưu ${questions.length} câu hỏi AI!`);
      setShowAIModal(false);
      fetchExercises();
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('Lỗi tạo câu hỏi AI.');
    }
    setAiGenerating(false);
  };

  // === FILE IMPORT HANDLERS ===
  const extractTextFromFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt' || ext === 'md') {
      return await file.text();
    }

    if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
      }
      return text;
    }

    if (ext === 'pdf') {
      // Basic text extraction attempt
      const text = await file.text();
      if (text.length > 50) return text;
      toast.error(`PDF "${file.name}" không thể đọc tự động. Hãy copy-paste nội dung.`);
      return '';
    }

    return await file.text();
  };

  const handleImportFiles = async () => {
    if (importFiles.length === 0) { toast.error('Vui lòng chọn file.'); return; }

    setImportParsing(true);
    setImportPreview([]);

    try {
      // Extract text from all files
      let allText = '';
      for (const file of importFiles) {
        toast.info(`Đang đọc: ${file.name}...`);
        const text = await extractTextFromFile(file);
        if (text) {
          allText += `\n--- FILE: ${file.name} ---\n${text}\n`;
        }
      }

      if (allText.length < 30) {
        toast.error('Không đọc được nội dung từ các file.');
        setImportParsing(false);
        return;
      }

      // Build curriculum for selected grade
      const gradeData = curriculumData.find(g => g.grade === importGrade);
      if (!gradeData) { setImportParsing(false); return; }

      const curriculum = gradeData.chapters.map(ch => ({
        name: ch.name,
        lessons: ch.lessons.map(l => ({ id: l.id, name: l.name })),
      }));

      toast.info('AI đang phân tích và phân loại câu hỏi...');

      const { data, error } = await supabase.functions.invoke('import-exercises', {
        body: { textContent: allText, grade: importGrade, curriculum },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setImportParsing(false); return; }

      const questions = data?.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        toast.error('AI không tìm thấy câu hỏi trắc nghiệm trong file.');
        setImportParsing(false);
        return;
      }

      const withDuplicateCheck = checkDuplicates(questions);
      setImportPreview(withDuplicateCheck);
      const dupeCount = withDuplicateCheck.filter((q: any) => q.isDuplicate).length;
      toast.success(`Đã tìm thấy ${questions.length} câu hỏi!${dupeCount > 0 ? ` (${dupeCount} câu trùng lặp)` : ''} Xem trước bên dưới.`);
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Lỗi khi phân tích file: ' + (err?.message || 'Unknown'));
    }
    setImportParsing(false);
  };

  // Normalize text for duplicate comparison
  const normalizeQuestion = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '');

  const checkDuplicates = (preview: any[]) => {
    const existingQuestions = new Set(exercises.map(e => normalizeQuestion(e.question)));
    return preview.map(q => ({
      ...q,
      isDuplicate: existingQuestions.has(normalizeQuestion(q.question)),
    }));
  };

  const handleConfirmImport = async () => {
    // Filter out duplicates
    const nonDuplicates = importPreview.filter(q => !q.isDuplicate);
    if (nonDuplicates.length === 0) {
      toast.error('Tất cả câu hỏi đều trùng lặp, không có gì để import.');
      return;
    }

    setImportSaving(true);
    try {
      const rows = nonDuplicates.map(q => ({
        grade: importGrade,
        chapter_name: q.chapter_name,
        lesson_id: q.lesson_id,
        lesson_name: q.lesson_name,
        question: q.question,
        options: q.options,
        correct_answer: q.correct,
        explanation: q.explanation || null,
        difficulty_level: q.difficulty_level || 'medium',
        is_ai_generated: false,
      }));

      const { error } = await supabase.from('exercises').insert(rows);
      if (error) throw error;

      const skipped = importPreview.length - nonDuplicates.length;
      toast.success(`Đã import ${rows.length} câu hỏi!${skipped > 0 ? ` (bỏ qua ${skipped} câu trùng)` : ''}`);
      setShowImportModal(false);
      setImportFiles([]);
      setImportPreview([]);
      fetchExercises();
    } catch (err: any) {
      toast.error('Lỗi lưu: ' + (err?.message || 'Unknown'));
    }
    setImportSaving(false);
  };

  const removePreviewQuestion = (index: number) => {
    setImportPreview(prev => prev.filter((_, i) => i !== index));
  };

  const filteredExercises = selectedLessonFilter
    ? exercises.filter(e => e.lesson_id === selectedLessonFilter)
    : exercises.filter(e => {
      const chapterLessons = chapters.find(c => c.id === selectedChapter)?.lessons || [];
      return chapterLessons.some(l => l.id === e.lesson_id);
    });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MaterialIcon name="quiz" size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quản lý Kho bài tập</h1>
              <p className="text-sm text-muted-foreground">
                {exercises.length} câu hỏi trong kho
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowImportModal(true); setImportFiles([]); setImportPreview([]); }}
              className="flex items-center gap-2 bg-info text-info-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <MaterialIcon name="upload_file" size={18} />
              Import file
            </button>
            <button
              onClick={() => { setShowAIModal(true); setAiLessonId(''); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <MaterialIcon name="auto_awesome" size={18} />
              AI Tạo hàng loạt
            </button>
          </div>
        </div>

        {/* Grade selector */}
        <div className="flex gap-2 mb-4">
          {[6, 7, 8, 9].map(g => (
            <button key={g} onClick={() => { setSelectedGrade(g); setSelectedChapter(''); setSelectedLessonFilter(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedGrade === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
              Lớp {g}
            </button>
          ))}
        </div>

        {/* Chapters & Lessons */}
        <div className="grid gap-3">
          {chapters.map(chapter => {
            const chapterExerciseCount = exercises.filter(e =>
              chapter.lessons.some(l => l.id === e.lesson_id)
            ).length;

            return (
              <div key={chapter.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => { setSelectedChapter(selectedChapter === chapter.id ? '' : chapter.id); setSelectedLessonFilter(''); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MaterialIcon name={chapter.icon} size={20} className="text-primary" />
                    <span className="font-medium text-sm">{chapter.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {chapterExerciseCount} câu
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
                        const lessonExercises = exercisesForLesson(lesson.id);
                        const isExpanded = selectedLessonFilter === lesson.id;
                        return (
                          <div key={lesson.id} className="border-b border-border last:border-b-0">
                            <div className="p-4 flex items-center justify-between">
                              <button
                                onClick={() => setSelectedLessonFilter(isExpanded ? '' : lesson.id)}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                              >
                                <span className="text-sm font-medium truncate">{lesson.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${lessonExercises.length > 0 ? 'bg-primary/10 text-primary' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                  {lessonExercises.length} câu
                                </span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openAddForm(lesson.id)}
                                  className="p-1.5 hover:bg-muted rounded-lg" title="Thêm thủ công"
                                >
                                  <MaterialIcon name="add_circle" size={18} className="text-primary" />
                                </button>
                                <button
                                  onClick={() => { setShowAIModal(true); setAiLessonId(lesson.id); }}
                                  className="p-1.5 hover:bg-muted rounded-lg" title="AI tạo câu hỏi"
                                >
                                  <MaterialIcon name="auto_awesome" size={18} className="text-info" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded exercises list */}
                            <AnimatePresence>
                              {isExpanded && lessonExercises.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="bg-muted/30 border-t border-border"
                                >
                                  {lessonExercises.map((ex, idx) => {
                                    const diff = DIFFICULTY_OPTIONS.find(d => d.value === ex.difficulty_level);
                                    return (
                                      <div key={ex.id} className="px-4 py-3 border-b border-border/50 last:border-b-0 flex items-start gap-3">
                                        <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0 w-6">
                                          {idx + 1}.
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm line-clamp-2">{ex.question}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${diff?.color || ''}`}>
                                              {diff?.label}
                                            </span>
                                            {ex.is_ai_generated && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info">AI</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button onClick={() => openEditForm(ex)} className="p-1 hover:bg-muted rounded" title="Sửa">
                                            <MaterialIcon name="edit" size={14} className="text-info" />
                                          </button>
                                          <button onClick={() => handleDelete(ex.id)} className="p-1 hover:bg-muted rounded" title="Xóa">
                                            <MaterialIcon name="delete" size={14} className="text-destructive" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
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
                  {editingId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Bài học</label>
                    <p className="text-sm font-medium bg-muted rounded-lg px-3 py-2">
                      {getLessonInfo(formLessonId)?.lessonName || formLessonId}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Câu hỏi <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={formQuestion}
                      onChange={e => setFormQuestion(e.target.value)}
                      placeholder="Nhập nội dung câu hỏi..."
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Đáp án <span className="text-destructive">*</span> (chọn đáp án đúng)
                    </label>
                    {['A', 'B', 'C', 'D'].map((letter, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => setFormCorrect(i)}
                          className={`w-8 h-8 rounded-lg text-sm font-bold shrink-0 transition-all ${formCorrect === i ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          {letter}
                        </button>
                        <input
                          value={formOptions[i]}
                          onChange={e => {
                            const newOpts = [...formOptions];
                            newOpts[i] = e.target.value;
                            setFormOptions(newOpts);
                          }}
                          placeholder={`Đáp án ${letter}...`}
                          className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Giải thích</label>
                    <textarea
                      value={formExplanation}
                      onChange={e => setFormExplanation(e.target.value)}
                      placeholder="Giải thích đáp án đúng..."
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Độ khó</label>
                    <div className="flex gap-2">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <button key={d.value} onClick={() => setFormDifficulty(d.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formDifficulty === d.value ? d.color + ' ring-1 ring-current' : 'bg-muted text-muted-foreground'
                            }`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
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

        {/* AI Generation Modal */}
        <AnimatePresence>
          {showAIModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => !aiGenerating && setShowAIModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MaterialIcon name="auto_awesome" size={22} className="text-primary" />
                  AI Tạo câu hỏi hàng loạt
                </h3>

                <div className="space-y-4">
                  {!aiLessonId && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Chọn bài học</label>
                      <select
                        value={aiLessonId}
                        onChange={e => setAiLessonId(e.target.value)}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">-- Chọn bài học --</option>
                        {chapters.map(ch => (
                          <optgroup key={ch.id} label={ch.name}>
                            {ch.lessons.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}

                  {aiLessonId && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Bài học</label>
                      <p className="text-sm font-medium bg-muted rounded-lg px-3 py-2">
                        {getLessonInfo(aiLessonId)?.lessonName}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Số lượng câu hỏi</label>
                    <div className="flex gap-2 flex-wrap">
                      {[5, 10, 15, 20, 30, 50].map(n => (
                        <button key={n} onClick={() => setAiCount(n)}
                          className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${aiCount === n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                          {n}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={aiCount}
                        onChange={e => setAiCount(Math.min(50, Math.max(1, Number(e.target.value) || 5)))}
                        className="w-16 px-2 py-2 rounded-lg text-sm font-bold text-center bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                        title="Nhập số tùy chỉnh (1-50)"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    AI sẽ tạo {aiCount} câu hỏi trắc nghiệm và lưu vào kho bài tập. Bạn có thể chỉnh sửa sau.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiGenerating || !aiLessonId}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {aiGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <MaterialIcon name="auto_awesome" size={16} />
                          Tạo câu hỏi
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowAIModal(false)}
                      disabled={aiGenerating}
                      className="px-6 bg-muted text-muted-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import File Modal */}
        <AnimatePresence>
          {showImportModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => !importParsing && !importSaving && setShowImportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <MaterialIcon name="upload_file" size={22} className="text-info" />
                  Import bài tập từ file
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload nhiều file cùng lúc, AI sẽ tự phân loại câu hỏi vào đúng bài học
                </p>

                <div className="space-y-4">
                  {/* Grade selector */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Lớp</label>
                    <div className="flex gap-2">
                      {[6, 7, 8, 9].map(g => (
                        <button key={g} onClick={() => setImportGrade(g)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${importGrade === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                          Lớp {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File upload area */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Chọn file ({importFiles.length} file đã chọn)
                    </label>
                    <div
                      onClick={() => importFileRef.current?.click()}
                      className="border-2 border-dashed border-info/30 rounded-xl p-6 text-center cursor-pointer hover:border-info/60 hover:bg-info/5 transition-all"
                    >
                      <MaterialIcon name="cloud_upload" size={36} className="text-info/60 mx-auto mb-2" />
                      <p className="font-medium text-sm">Bấm để chọn hoặc kéo thả file</p>
                      <p className="text-xs text-muted-foreground mt-1">.docx, .xlsx, .txt, .pdf - Chọn nhiều file cùng lúc</p>
                      <input
                        ref={importFileRef}
                        type="file"
                        accept=".docx,.xlsx,.xls,.txt,.md,.pdf"
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          setImportFiles(prev => [...prev, ...files]);
                          setImportPreview([]);
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Selected files list */}
                    {importFiles.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {importFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                            <MaterialIcon name="description" size={16} className="text-muted-foreground" />
                            <span className="text-xs flex-1 truncate">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                            <button onClick={() => setImportFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-destructive hover:bg-destructive/10 rounded p-0.5">
                              <MaterialIcon name="close" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Parse button */}
                  {importPreview.length === 0 && (
                    <button
                      onClick={handleImportFiles}
                      disabled={importParsing || importFiles.length === 0}
                      className="w-full bg-info text-info-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {importParsing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-info-foreground border-t-transparent rounded-full animate-spin" />
                          AI đang phân tích...
                        </>
                      ) : (
                        <>
                          <MaterialIcon name="auto_awesome" size={16} />
                          AI Phân tích & phân loại
                        </>
                      )}
                    </button>
                  )}

                  {/* Preview results */}
                  {importPreview.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <MaterialIcon name="preview" size={18} className="text-success" />
                          Xem trước: {importPreview.length} câu hỏi
                          {importPreview.some((q: any) => q.isDuplicate) && (
                            <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-semibold">
                              ⚠️ {importPreview.filter((q: any) => q.isDuplicate).length} trùng
                            </span>
                          )}
                        </h4>
                        <button onClick={() => setImportPreview([])} className="text-xs text-muted-foreground hover:text-foreground">
                          Phân tích lại
                        </button>
                      </div>

                      {/* Group by lesson */}
                      {(() => {
                        const groups: Record<string, any[]> = {};
                        importPreview.forEach((q, i) => {
                          const key = q.lesson_name || q.lesson_id;
                          if (!groups[key]) groups[key] = [];
                          groups[key].push({ ...q, _index: i });
                        });
                        return Object.entries(groups).map(([lessonName, questions]) => {
                          const dupeCount = questions.filter((q: any) => q.isDuplicate).length;
                          return (
                            <div key={lessonName} className="mb-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-bold text-primary">{lessonName}</span>
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{questions.length} câu</span>
                                {dupeCount > 0 && (
                                  <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full">{dupeCount} trùng</span>
                                )}
                              </div>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {questions.map((q: any) => (
                                  <div key={q._index} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${q.isDuplicate ? 'bg-warning/10 border border-warning/20' : 'bg-muted/30'
                                    }`}>
                                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{q._index + 1}.</span>
                                    {q.isDuplicate && (
                                      <span className="text-[9px] bg-warning text-warning-foreground px-1.5 py-0.5 rounded-full font-bold shrink-0 mt-0.5">TRÙNG</span>
                                    )}
                                    <p className={`text-xs flex-1 line-clamp-2 ${q.isDuplicate ? 'line-through opacity-60' : ''}`}>{q.question}</p>
                                    <button onClick={() => removePreviewQuestion(q._index)}
                                      className="text-destructive hover:bg-destructive/10 rounded p-0.5 shrink-0">
                                      <MaterialIcon name="close" size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {(() => {
                        const nonDupes = importPreview.filter((q: any) => !q.isDuplicate).length;
                        const dupes = importPreview.length - nonDupes;
                        return (
                          <button
                            onClick={handleConfirmImport}
                            disabled={importSaving || nonDupes === 0}
                            className="w-full bg-success text-success-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
                          >
                            {importSaving ? (
                              <>
                                <div className="w-4 h-4 border-2 border-success-foreground border-t-transparent rounded-full animate-spin" />
                                Đang lưu...
                              </>
                            ) : (
                              <>
                                <MaterialIcon name="save" size={16} />
                                Xác nhận import {nonDupes} câu{dupes > 0 ? ` (bỏ qua ${dupes} trùng)` : ''}
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  {/* Cancel */}
                  <button
                    onClick={() => setShowImportModal(false)}
                    disabled={importParsing || importSaving}
                    className="w-full bg-muted text-muted-foreground rounded-xl py-2 text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminExercisesPage;
