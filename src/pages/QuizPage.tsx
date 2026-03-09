import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { exerciseData, Question } from '@/data/exerciseData';
import { useAppContext } from '@/contexts/AppContext';
import MaterialIcon from '@/components/MaterialIcon';

const QuizPage = () => {
  const { grade } = useParams<{ grade: string }>();
  const navigate = useNavigate();
  const { addExerciseResult, updateDailyActivity, getTodayActivity } = useAppContext();

  const gradeNum = parseInt(grade || '6');
  const gradeData = exerciseData.find(g => g.grade === gradeNum);
  const [topicIdx, setTopicIdx] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startTime] = useState(Date.now());

  if (!gradeData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Không tìm thấy dữ liệu lớp {grade}</p>
        <button onClick={() => navigate('/exercises')} className="text-primary mt-2 underline">Quay lại</button>
      </div>
    );
  }

  // Topic selection
  if (topicIdx === null) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/exercises/${grade}`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <MaterialIcon name="arrow_back" size={18} /> Quay lại
        </button>
        <h1 className="text-2xl font-bold mb-6">Lớp {gradeNum} - Chọn chủ đề</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {gradeData.topics.map((topic, i) => (
            <motion.button
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              onClick={() => setTopicIdx(i)}
              className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <MaterialIcon name={topic.icon} size={22} className="text-primary" />
              </div>
              <h3 className="font-bold">{topic.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{topic.questions.length} câu hỏi</p>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const topic = gradeData.topics[topicIdx];
  const questions = topic.questions;
  const question = questions[currentQ];

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    if (idx === question.correct) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const today = getTodayActivity();
      addExerciseResult({
        date: new Date().toISOString().split('T')[0],
        subject: topic.name,
        grade: gradeNum,
        correct: score + (selectedAnswer === question.correct ? 1 : 0),
        total: questions.length,
        timeSpent: elapsed,
      });
      updateDailyActivity({
        exerciseCount: today.exerciseCount + questions.length,
        totalTime: today.totalTime + elapsed,
      });
    }
  };

  if (showResult) {
    const finalScore = score;
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-2xl border border-border p-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${pct >= 70 ? 'bg-success/10' : 'bg-warning/10'}`}>
            <MaterialIcon name={pct >= 70 ? 'emoji_events' : 'sentiment_neutral'} size={40} className={pct >= 70 ? 'text-success' : 'text-warning'} />
          </div>
          <h2 className="text-2xl font-bold">Kết quả</h2>
          <p className="text-4xl font-extrabold text-primary mt-2">{finalScore}/{questions.length}</p>
          <p className="text-muted-foreground mt-1">({pct}% đúng)</p>
          <div className="flex gap-3 mt-6 justify-center">
            <button onClick={() => { setTopicIdx(null); setCurrentQ(0); setSelectedAnswer(null); setScore(0); setAnswers([]); setShowResult(false); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Chọn chủ đề khác
            </button>
            <button onClick={() => { setCurrentQ(0); setSelectedAnswer(null); setScore(0); setAnswers([]); setShowResult(false); }}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              Làm lại
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setTopicIdx(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <MaterialIcon name="arrow_back" size={18} /> {topic.name}
        </button>
        <span className="text-xs text-muted-foreground font-medium">Câu {currentQ + 1}/{questions.length}</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <div className="bg-card rounded-2xl border border-border p-6 mb-4">
            <h2 className="font-bold text-lg leading-relaxed">{question.question}</h2>
          </div>

          <div className="space-y-3">
            {question.options.map((opt, i) => {
              let style = 'border-border hover:border-primary/40 hover:bg-primary/5';
              if (selectedAnswer !== null) {
                if (i === question.correct) style = 'border-success bg-success/10';
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
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${selectedAnswer !== null && i === question.correct ? 'bg-success text-success-foreground' :
                      selectedAnswer === i && i !== question.correct ? 'bg-destructive text-destructive-foreground' :
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
                {selectedAnswer === question.correct ? '✅ Chính xác!' : '❌ Sai rồi!'}
              </p>
              <p className="text-sm text-muted-foreground">{question.explanation}</p>
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

export default QuizPage;
