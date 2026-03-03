import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { curriculumData, subjectColors } from '@/data/curriculumData';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import MaterialIcon from '@/components/MaterialIcon';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  difficulty_level: string;
  lesson_name: string;
  chapter_name: string;
}

type DifficultyKey = 'easy' | 'medium' | 'hard';

const difficultyLabels: Record<DifficultyKey, { label: string; icon: string; color: string }> = {
  easy: { label: 'Nhận biết', icon: 'visibility', color: 'text-success' },
  medium: { label: 'Thông hiểu', icon: 'psychology', color: 'text-info' },
  hard: { label: 'Vận dụng', icon: 'rocket_launch', color: 'text-warning' },
};

const ExamPage = () => {
  const navigate = useNavigate();
  const { addExerciseResult, updateDailyActivity, getTodayActivity } = useAppContext();

  // Step 1: Config
  const [selectedGrade, setSelectedGrade] = useState<number>(6);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [diffMatrix, setDiffMatrix] = useState<Record<DifficultyKey, number>>({ easy: 40, medium: 40, hard: 20 });
  const [step, setStep] = useState<'config' | 'loading' | 'exam' | 'result'>('config');

  // Step 2: Exam
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const gradeData = curriculumData.find(g => g.grade === selectedGrade);

  const allLessonsForGrade = useMemo(() => {
    if (!gradeData) return [];
    return gradeData.chapters.flatMap(ch =>
      ch.lessons.map(l => ({ ...l, chapterName: ch.name, chapterId: ch.id, subject: ch.subject }))
    );
  }, [gradeData]);

  const toggleLesson = (lessonId: string) => {
    setSelectedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const toggleChapter = (chapterId: string) => {
    if (!gradeData) return;
    const ch = gradeData.chapters.find(c => c.id === chapterId);
    if (!ch) return;
    const lessonIds = ch.lessons.map(l => l.id);
    const allSelected = lessonIds.every(id => selectedLessons.has(id));
    setSelectedLessons(prev => {
      const next = new Set(prev);
      lessonIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll = () => {
    const all = allLessonsForGrade.map(l => l.id);
    const allSelected = all.every(id => selectedLessons.has(id));
    setSelectedLessons(allSelected ? new Set() : new Set(all));
  };

  const adjustDifficulty = (key: DifficultyKey, value: number) => {
    const others = (Object.keys(diffMatrix) as DifficultyKey[]).filter(k => k !== key);
    const remaining = 100 - value;
    const currentOtherTotal = others.reduce((s, k) => s + diffMatrix[k], 0);
    const newMatrix = { ...diffMatrix, [key]: value };
    if (currentOtherTotal === 0) {
      newMatrix[others[0]] = Math.round(remaining / 2);
      newMatrix[others[1]] = remaining - newMatrix[others[0]];
    } else {
      others.forEach(k => {
        newMatrix[k] = Math.max(0, Math.round((diffMatrix[k] / currentOtherTotal) * remaining));
      });
      // Fix rounding
      const total = Object.values(newMatrix).reduce((s, v) => s + v, 0);
      if (total !== 100) newMatrix[others[0]] += 100 - total;
    }
    setDiffMatrix(newMatrix);
  };

  const generateExam = async () => {
    if (selectedLessons.size === 0) {
      toast.error('Vui lòng chọn ít nhất một bài học');
      return;
    }
    setStep('loading');

    try {
      // Get lesson names from selected IDs
      const lessonNames = allLessonsForGrade
        .filter(l => selectedLessons.has(l.id))
        .map(l => l.name);

      // Fetch exercises from database
      const { data: allExercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('grade', selectedGrade)
        .in('lesson_name', lessonNames);

      if (error) throw error;

      const pool = (allExercises || []).map(e => ({
        id: e.id,
        question: e.question,
        options: Array.isArray(e.options) ? e.options as string[] : [],
        correct_answer: e.correct_answer,
        explanation: e.explanation,
        difficulty_level: e.difficulty_level,
        lesson_name: e.lesson_name,
        chapter_name: e.chapter_name,
      }));

      // Distribute by difficulty
      const easyPool = pool.filter(q => q.difficulty_level === 'easy');
      const mediumPool = pool.filter(q => q.difficulty_level === 'medium');
      const hardPool = pool.filter(q => q.difficulty_level === 'hard');

      const easyCount = Math.round(totalQuestions * diffMatrix.easy / 100);
      const hardCount = Math.round(totalQuestions * diffMatrix.hard / 100);
      const mediumCount = totalQuestions - easyCount - hardCount;

      const pick = (arr: ExamQuestion[], n: number) => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
      };

      let selected = [
        ...pick(easyPool, easyCount),
        ...pick(mediumPool, mediumCount),
        ...pick(hardPool, hardCount),
      ];

      // If not enough from specific difficulties, fill from remaining pool
      if (selected.length < totalQuestions) {
        const usedIds = new Set(selected.map(q => q.id));
        const remaining = pool.filter(q => !usedIds.has(q.id));
        selected = [...selected, ...pick(remaining, totalQuestions - selected.length)];
      }

      if (selected.length === 0) {
        toast.error('Chưa có câu hỏi nào trong kho cho các bài đã chọn. Hãy thử chọn bài khác hoặc liên hệ giáo viên.');
        setStep('config');
        return;
      }

      // Shuffle final order
      selected.sort(() => Math.random() - 0.5);

      setQuestions(selected);
      setCurrentQ(0);
      setSelectedAnswer(null);
      setScore(0);
      setAnswers([]);
      setStartTime(Date.now());
      setShowReview(false);
      setStep('exam');
    } catch (e) {
      console.error('Generate exam error:', e);
      toast.error('Lỗi tạo bài kiểm tra, vui lòng thử lại');
      setStep('config');
    }
  };

  // CONFIG STEP
  if (step === 'config') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MaterialIcon name="assignment" size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tạo Bài Kiểm Tra</h1>
              <p className="text-sm text-muted-foreground">Tùy chỉnh ma trận đề kiểm tra theo mong muốn</p>
            </div>
          </div>

          {/* Grade Selection */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <MaterialIcon name="school" size={18} className="text-primary" />
              Chọn khối lớp
            </h3>
            <div className="flex gap-2">
              {[6, 7, 8, 9].map(g => (
                <button
                  key={g}
                  onClick={() => { setSelectedGrade(g); setSelectedLessons(new Set()); }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedGrade === g
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Selection */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MaterialIcon name="checklist" size={18} className="text-primary" />
                Chọn bài học ({selectedLessons.size} bài)
              </h3>
              <button onClick={selectAll} className="text-xs text-primary font-semibold hover:underline">
                {allLessonsForGrade.every(l => selectedLessons.has(l.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto scrollbar-thin space-y-3 pr-1">
              {gradeData?.chapters.map(ch => {
                const chLessons = ch.lessons.map(l => l.id);
                const allChSelected = chLessons.every(id => selectedLessons.has(id));
                const someChSelected = chLessons.some(id => selectedLessons.has(id));
                const colorClass = subjectColors[ch.subject] || subjectColors.general;
                return (
                  <div key={ch.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleChapter(ch.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox checked={allChSelected} className={someChSelected && !allChSelected ? 'opacity-60' : ''} />
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <MaterialIcon name={ch.icon} size={16} />
                      </div>
                      <span className="text-sm font-semibold flex-1 text-left">{ch.name}</span>
                      <span className="text-[10px] text-muted-foreground">{ch.lessons.length} bài</span>
                    </button>
                    <div className="border-t border-border bg-muted/10 px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {ch.lessons.map(l => (
                        <label
                          key={l.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedLessons.has(l.id)}
                            onCheckedChange={() => toggleLesson(l.id)}
                          />
                          <span className="truncate">{l.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Count & Difficulty Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <MaterialIcon name="tag" size={18} className="text-primary" />
                Số lượng câu hỏi
              </h3>
              <div className="flex items-center gap-4">
                <Slider
                  value={[totalQuestions]}
                  onValueChange={([v]) => setTotalQuestions(v)}
                  min={5}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-primary min-w-[3ch] text-right">{totalQuestions}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>5</span><span>50</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <MaterialIcon name="tune" size={18} className="text-primary" />
                Ma trận độ khó
              </h3>
              <div className="space-y-3">
                {(Object.keys(difficultyLabels) as DifficultyKey[]).map(key => {
                  const info = difficultyLabels[key];
                  const count = Math.round(totalQuestions * diffMatrix[key] / 100);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${info.color}`}>
                          <MaterialIcon name={info.icon} size={14} />
                          {info.label}
                        </span>
                        <span className="text-xs font-bold">{diffMatrix[key]}% ({count} câu)</span>
                      </div>
                      <Slider
                        value={[diffMatrix[key]]}
                        onValueChange={([v]) => adjustDifficulty(key, v)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary & Start */}
          <motion.div
            className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="school" size={16} className="text-primary" />
                Lớp {selectedGrade}
              </span>
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="book" size={16} className="text-primary" />
                {selectedLessons.size} bài
              </span>
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="quiz" size={16} className="text-primary" />
                {totalQuestions} câu
              </span>
            </div>
            <button
              onClick={generateExam}
              disabled={selectedLessons.size === 0}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <MaterialIcon name="play_arrow" size={20} />
              Bắt đầu Kiểm tra
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // LOADING
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Đang tạo đề kiểm tra...</p>
      </div>
    );
  }

  // RESULT
  if (step === 'result') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    // Group by chapter
    const chapterStats: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      if (!chapterStats[q.chapter_name]) chapterStats[q.chapter_name] = { correct: 0, total: 0 };
      chapterStats[q.chapter_name].total++;
      if (answers[i] === q.correct_answer) chapterStats[q.chapter_name].correct++;
    });

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          {/* Score Card */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-6">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${pct >= 70 ? 'bg-success/10' : pct >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <MaterialIcon
                name={pct >= 70 ? 'emoji_events' : pct >= 50 ? 'sentiment_neutral' : 'sentiment_dissatisfied'}
                size={48}
                className={pct >= 70 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive'}
              />
            </div>
            <h2 className="text-2xl font-bold">Kết quả Kiểm tra</h2>
            <p className="text-5xl font-extrabold text-primary mt-2">{score}/{questions.length}</p>
            <p className="text-muted-foreground mt-1">({pct}% đúng) • {minutes}:{seconds.toString().padStart(2, '0')}</p>
          </div>

          {/* Chapter Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <h3 className="text-sm font-bold mb-3">Kết quả theo chương</h3>
            <div className="space-y-2">
              {Object.entries(chapterStats).map(([name, stat]) => {
                const p = Math.round((stat.correct / stat.total) * 100);
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate mr-2">{name}</span>
                      <span className="font-bold shrink-0">{stat.correct}/{stat.total} ({p}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${p >= 70 ? 'bg-success' : p >= 50 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Toggle */}
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-4 mb-4 hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold flex items-center gap-2">
              <MaterialIcon name="rate_review" size={18} className="text-primary" />
              Xem lại đáp án chi tiết
            </span>
            <MaterialIcon name={showReview ? 'expand_less' : 'expand_more'} size={20} />
          </button>

          {showReview && (
            <div className="space-y-3 mb-6">
              {questions.map((q, i) => {
                const userAns = answers[i];
                const isCorrect = userAns === q.correct_answer;
                return (
                  <div key={q.id} className={`border rounded-xl p-4 ${isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    <p className="text-sm font-bold mb-2">
                      <span className="text-muted-foreground">Câu {i + 1}:</span> {q.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs mb-2">
                      {q.options.map((opt, j) => (
                        <span
                          key={j}
                          className={`px-2 py-1 rounded ${
                            j === q.correct_answer ? 'bg-success/20 font-bold' :
                            j === userAns && !isCorrect ? 'bg-destructive/20 line-through' : ''
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">💡 {q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep('config')}
              className="px-6 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Tạo đề mới
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Về trang chủ
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // EXAM STEP
  const question = questions[currentQ];
  if (!question) return null;

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);
    if (idx === question.correct_answer) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedAnswer(null);
    } else {
      // Save result
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const today = getTodayActivity();
      addExerciseResult({
        date: new Date().toISOString().split('T')[0],
        subject: `Kiểm tra Lớp ${selectedGrade}`,
        grade: selectedGrade,
        correct: score + (selectedAnswer === question.correct_answer ? 1 : 0),
        total: questions.length,
        timeSpent: elapsed,
      });
      updateDailyActivity({
        exerciseCount: today.exerciseCount + questions.length,
        totalTime: today.totalTime + elapsed,
      });
      setStep('result');
    }
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="assignment" size={20} className="text-primary" />
          <span className="text-sm font-bold">Bài Kiểm Tra</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">
          Câu {currentQ + 1}/{questions.length}
        </span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question nav dots */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => { if (answers[i] !== undefined) { setCurrentQ(i); setSelectedAnswer(answers[i] ?? null); } }}
            className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${
              i === currentQ ? 'bg-primary text-primary-foreground' :
              answers[i] !== undefined ? (answers[i] === questions[i].correct_answer ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive') :
              'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          {/* Metadata */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{question.lesson_name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              question.difficulty_level === 'easy' ? 'bg-success/10 text-success' :
              question.difficulty_level === 'hard' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
            }`}>
              {difficultyLabels[question.difficulty_level as DifficultyKey]?.label || question.difficulty_level}
            </span>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 mb-4">
            <h2 className="font-bold text-lg leading-relaxed">{question.question}</h2>
          </div>

          <div className="space-y-3">
            {question.options.map((opt, i) => {
              let style = 'border-border hover:border-primary/40 hover:bg-primary/5';
              if (selectedAnswer !== null) {
                if (i === question.correct_answer) style = 'border-success bg-success/10';
                else if (i === selectedAnswer) style = 'border-destructive bg-destructive/10';
                else style = 'border-border opacity-50';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selectedAnswer !== null}
                  className={`w-full text-left border-2 rounded-xl p-4 flex items-start gap-3 transition-all ${style}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    selectedAnswer !== null && i === question.correct_answer ? 'bg-success text-white' :
                    selectedAnswer === i && i !== question.correct_answer ? 'bg-destructive text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {letters[i]}
                  </span>
                  <span className="text-sm font-medium pt-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {selectedAnswer !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-primary mb-1">
                {selectedAnswer === question.correct_answer ? '✅ Chính xác!' : '❌ Sai rồi!'}
              </p>
              {question.explanation && (
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              )}
              <button
                onClick={nextQuestion}
                className="mt-3 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {currentQ < questions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ExamPage;
