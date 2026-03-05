import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import QuestionRenderer, { QuizQuestionAny } from '@/components/quiz/QuestionRenderer';
import { toast } from 'sonner';


const QUESTION_COUNTS = [10, 20, 30];

const AIQuizPage = () => {
  const { grade } = useParams<{ grade: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addExerciseResult, updateDailyActivity, getTodayActivity } = useAppContext();

  const lessonId = (location.state as any)?.lessonId || '';
  const lessonName = (location.state as any)?.lessonName || 'Bài học';
  const chapterName = (location.state as any)?.chapterName || '';

  const [phase, setPhase] = useState<'setup' | 'loading' | 'quiz' | 'result'>('setup');
  const [numQuestions, setNumQuestions] = useState(10);
  const [dbQuestionCount, setDbQuestionCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestionAny[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);

  // Extra AI mode
  const [showExtraAI, setShowExtraAI] = useState(false);
  const [extraApiKey, setExtraApiKey] = useState('');
  const [extraCount, setExtraCount] = useState(5);
  const [extraLoading, setExtraLoading] = useState(false);

  // Fetch count of exercises in DB for this lesson
  useEffect(() => {
    const fetchCount = async () => {
      if (!lessonId) { setLoadingCount(false); return; }
      const { count, error } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);
      if (!error && count !== null) setDbQuestionCount(count);
      setLoadingCount(false);
    };
    fetchCount();
  }, [lessonId]);

  const startQuiz = async (count: number) => {
    setPhase('loading');
    try {
      // Fetch random questions from DB
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Shuffle and take `count` questions
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, count);
        const mapped: QuizQuestionAny[] = shuffled.map(d => ({
          type: (d as any).question_type || 'mcq',
          question: d.question,
          options: d.options as unknown as string[],
          correct: d.correct_answer,
          explanation: d.explanation || '',
          ...(d as any).correct_answer_data,
        }));
        setQuestions(mapped);
      } else {
        // Fallback: use AI if no DB questions
        toast.info('Chưa có câu hỏi trong kho, đang dùng AI...');
        await generateAIQuestions(count);
        return;
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
      toast.error('Lỗi tải câu hỏi, thử AI...');
      await generateAIQuestions(count);
      return;
    }
    setStartTime(Date.now());
    setPhase('quiz');
  };

  const generateAIQuestions = async (count: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { lessonName, chapterName, grade: parseInt(grade || '6'), numQuestions: count },
      });
      if (error) throw error;
      if (data?.questions) {
        setQuestions(data.questions);
      } else {
        throw new Error('No questions returned');
      }
    } catch (err) {
      console.error('AI quiz failed:', err);
      toast.error('Không thể tạo câu hỏi.');
      setPhase('setup');
      return;
    }
    setStartTime(Date.now());
    setPhase('quiz');
  };

  // Extra AI with student's own key
  const handleExtraAI = async () => {
    if (!extraApiKey.trim()) { toast.error('Vui lòng nhập API key Gemini.'); return; }
    setExtraLoading(true);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' + extraApiKey.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Tạo ${extraCount} câu hỏi trắc nghiệm KHTN cho bài "${lessonName}" (${chapterName}, Lớp ${grade}).
Mỗi câu có 4 đáp án A, B, C, D. Trả về JSON array, mỗi phần tử có: question, options (array 4 strings), correct (index 0-3), explanation.
CHỈ trả về JSON array, không có text khác.` }]
          }],
          generationConfig: { temperature: 0.85 }
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(prev => [...prev, ...parsed]);
          toast.success(`Đã thêm ${parsed.length} câu hỏi AI!`);
          setShowExtraAI(false);
          return;
        }
      }
      throw new Error('Invalid response');
    } catch (err: any) {
      console.error('Extra AI error:', err);
      toast.error('Lỗi API key hoặc không thể tạo câu hỏi. Kiểm tra lại key.');
    } finally {
      setExtraLoading(false);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setAnsweredCurrent(true);
    if (isCorrect) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedAnswer(null);
      setAnsweredCurrent(false);
    } else {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const today = getTodayActivity();
      addExerciseResult({
        date: new Date().toISOString().split('T')[0],
        subject: lessonName,
        grade: parseInt(grade || '6'),
        correct: score,
        total: questions.length,
        timeSpent: elapsed,
      });
      updateDailyActivity({
        exerciseCount: today.exerciseCount + questions.length,
        totalTime: today.totalTime + elapsed,
      });
      setPhase('result');
    }
  };

  const resetQuiz = (newCount?: number) => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnsweredCurrent(false);
    setScore(0);
    setQuestions([]);
    if (newCount !== undefined) {
      setNumQuestions(newCount);
      startQuiz(newCount);
    } else {
      setPhase('setup');
    }
  };

  // ── Setup phase ──
  if (phase === 'setup') {
    const availableCounts = QUESTION_COUNTS.filter(n => n <= dbQuestionCount);
    return (
      <div className="p-6 max-w-lg mx-auto flex items-center justify-center min-h-[calc(100vh-64px)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <button onClick={() => navigate(`/exercises/${grade}`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <MaterialIcon name="arrow_back" size={18} />
            Quay lại
          </button>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <MaterialIcon name="quiz" size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">Luyện tập</h2>
              <p className="text-sm text-muted-foreground mt-1">{lessonName}</p>
              {chapterName && <p className="text-xs text-muted-foreground">{chapterName}</p>}
            </div>

            {loadingCount ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dbQuestionCount > 0 ? (
              <>
                <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded-xl text-center">
                  <p className="text-sm font-medium text-success">
                    📚 Kho bài tập: {dbQuestionCount} câu hỏi
                  </p>
                </div>

                <div className="mb-6">
                  <label className="text-sm font-medium block mb-3">Chọn số câu hỏi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUESTION_COUNTS.map(n => (
                      <button
                        key={n}
                        onClick={() => setNumQuestions(Math.min(n, dbQuestionCount))}
                        disabled={n > dbQuestionCount}
                        className={`py-3 rounded-xl text-sm font-bold transition-all ${numQuestions === Math.min(n, dbQuestionCount) && n <= dbQuestionCount
                          ? 'bg-primary text-primary-foreground shadow-md scale-105'
                          : n > dbQuestionCount
                            ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Câu hỏi sẽ được chọn ngẫu nhiên từ kho
                  </p>
                </div>

                <button
                  onClick={() => startQuiz(numQuestions)}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <MaterialIcon name="play_arrow" size={18} />
                  Bắt đầu làm bài
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Chưa có câu hỏi trong kho cho bài này.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Bạn có thể dùng AI để luyện tập (sử dụng API key Gemini riêng).
                </p>
                <button
                  onClick={() => setShowExtraAI(true)}
                  className="bg-info/10 text-info px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-info/20 transition-colors flex items-center gap-2 mx-auto"
                >
                  <MaterialIcon name="auto_awesome" size={16} />
                  Dùng AI tạo câu hỏi
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Extra AI Modal */}
        <ExtraAIModal
          show={showExtraAI}
          onClose={() => setShowExtraAI(false)}
          apiKey={extraApiKey}
          setApiKey={setExtraApiKey}
          count={extraCount}
          setCount={setExtraCount}
          loading={extraLoading}
          onGenerate={async () => {
            // For setup phase, generate and start quiz directly
            if (!extraApiKey.trim()) { toast.error('Vui lòng nhập API key Gemini.'); return; }
            setExtraLoading(true);
            setPhase('loading');
            setShowExtraAI(false);
            try {
              const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' + extraApiKey.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `Tạo ${extraCount} câu hỏi trắc nghiệm KHTN cho bài "${lessonName}" (${chapterName}, Lớp ${grade}).
Mỗi câu có 4 đáp án A, B, C, D. Trả về JSON array, mỗi phần tử có: question, options (array 4 strings), correct (index 0-3), explanation.
CHỈ trả về JSON array, không có text khác.` }]
                  }],
                  generationConfig: { temperature: 0.85 }
                }),
              });
              if (!response.ok) throw new Error(await response.text());
              const result = await response.json();
              const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setQuestions(parsed);
                  setStartTime(Date.now());
                  setPhase('quiz');
                  setExtraLoading(false);
                  return;
                }
              }
              throw new Error('Invalid response');
            } catch (err) {
              console.error(err);
              toast.error('Lỗi tạo câu hỏi. Kiểm tra API key.');
              setPhase('setup');
            }
            setExtraLoading(false);
          }}
        />
      </div>
    );
  }

  // ── Loading phase ──
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold">Đang tải câu hỏi...</p>
        <p className="text-sm text-muted-foreground mt-1">{lessonName}</p>
      </div>
    );
  }

  // ── Result phase ──
  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="p-6 max-w-lg mx-auto flex items-center justify-center min-h-[calc(100vh-64px)]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-2xl border border-border p-8 text-center w-full">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${pct >= 70 ? 'bg-success/10' : 'bg-warning/10'}`}>
            <MaterialIcon name={pct >= 70 ? 'emoji_events' : 'sentiment_neutral'} size={40} className={pct >= 70 ? 'text-success' : 'text-warning'} />
          </div>
          <h2 className="text-2xl font-bold">Kết quả</h2>
          <p className="text-sm text-muted-foreground mt-1">{lessonName}</p>
          <p className="text-4xl font-extrabold text-primary mt-3">{score}/{questions.length}</p>
          <p className="text-muted-foreground">({pct}% đúng)</p>

          <div className="flex flex-col gap-2 mt-6">
            <div className="flex gap-2">
              <button onClick={() => navigate(`/exercises/${grade}`)}
                className="flex-1 px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                Quay lại
              </button>
              <button onClick={() => resetQuiz(numQuestions)}
                className="flex-1 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Làm lại ({numQuestions} câu)
              </button>
            </div>
            <button onClick={() => resetQuiz()}
              className="w-full px-5 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2">
              <MaterialIcon name="tune" size={16} />
              Đổi số câu & làm bài mới
            </button>
            <button onClick={() => setShowExtraAI(true)}
              className="w-full px-5 py-2.5 bg-info/10 text-info rounded-xl text-sm font-medium hover:bg-info/20 transition-colors flex items-center justify-center gap-2">
              <MaterialIcon name="auto_awesome" size={16} />
              Luyện thêm với AI (API key riêng)
            </button>
          </div>
        </motion.div>

        <ExtraAIModal
          show={showExtraAI}
          onClose={() => setShowExtraAI(false)}
          apiKey={extraApiKey}
          setApiKey={setExtraApiKey}
          count={extraCount}
          setCount={setExtraCount}
          loading={extraLoading}
          onGenerate={handleExtraAI}
        />
      </div>
    );
  }

  // ── Quiz phase ──
  const question = questions[currentQ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(`/exercises/${grade}`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <MaterialIcon name="arrow_back" size={18} />
          Quay lại
        </button>
        <span className="text-xs text-muted-foreground font-medium">Câu {currentQ + 1}/{questions.length}</span>
      </div>
      <p className="text-xs text-primary font-medium mb-4">{lessonName}</p>

      <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <QuestionRenderer
            question={question}
            onAnswered={handleAnswer}
            showNext={answeredCurrent}
            onNext={nextQuestion}
            isLast={currentQ >= questions.length - 1}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Extra AI Modal Component
const ExtraAIModal = ({
  show, onClose, apiKey, setApiKey, count, setCount, loading, onGenerate
}: {
  show: boolean; onClose: () => void;
  apiKey: string; setApiKey: (v: string) => void;
  count: number; setCount: (v: number) => void;
  loading: boolean; onGenerate: () => void;
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={() => !loading && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MaterialIcon name="auto_awesome" size={22} className="text-info" />
            Luyện thêm với AI
          </h3>

          <p className="text-xs text-muted-foreground mb-4">
            Nhập API key Google Gemini của bạn để tạo thêm câu hỏi luyện tập. API key được sử dụng trực tiếp, không lưu trữ.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">API Key Gemini</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline mt-1 inline-block">
                Lấy API key miễn phí tại Google AI Studio →
              </a>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Số câu hỏi</label>
              <div className="flex gap-2">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${count === n ? 'bg-info text-info-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onGenerate} disabled={loading || !apiKey.trim()}
                className="flex-1 bg-info text-info-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Đang tạo...</>
                ) : (
                  <><MaterialIcon name="auto_awesome" size={16} /> Tạo câu hỏi</>
                )}
              </button>
              <button onClick={onClose} disabled={loading}
                className="px-6 bg-muted text-muted-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50">
                Hủy
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default AIQuizPage;
