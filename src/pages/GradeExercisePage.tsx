import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { curriculumData, subjectColors } from '@/data/curriculumData';
import { useAppContext } from '@/contexts/AppContext';
import MaterialIcon from '@/components/MaterialIcon';

const GradeExercisePage = () => {
  const { grade } = useParams<{ grade: string }>();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const gradeNum = parseInt(grade || '6');
  const gradeData = curriculumData.find(g => g.grade === gradeNum);
  const location = useLocation();
  const [selectedChapter, setSelectedChapter] = useState<string | null>(() => {
    return (location.state as any)?.chapterId || null;
  });
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  if (!gradeData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Không tìm thấy dữ liệu lớp {grade}</p>
        <button onClick={() => navigate('/exercises')} className="text-primary mt-2 underline text-sm">Quay lại</button>
      </div>
    );
  }

  const chapter = gradeData.chapters.find(c => c.id === selectedChapter);

  const handleStartQuiz = (lessonId: string, lessonName: string) => {
    navigate(`/exercises/${gradeNum}/quiz`, { state: { lessonId, lessonName, chapterName: chapter?.name, chapterId: selectedChapter } });
  };

  const handleViewTheory = (lessonId: string, lessonName: string, defaultTab?: string) => {
    navigate(`/exercises/${gradeNum}/theory?lessonId=${encodeURIComponent(lessonId)}&lessonName=${encodeURIComponent(lessonName)}&chapterName=${encodeURIComponent(chapter?.name || '')}&chapterId=${encodeURIComponent(selectedChapter || '')}${defaultTab ? `&tab=${defaultTab}` : ''}`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Chapter List - Left Panel */}
      <div className="w-72 border-r border-border bg-card overflow-y-auto scrollbar-thin shrink-0">
        <div className="p-4">
          <button
            onClick={() => navigate('/exercises')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <MaterialIcon name="arrow_back" size={18} />
            Quay lại
          </button>
          <h1 className="text-xl font-bold">Bài tập Lớp {gradeNum}</h1>
          <p className="text-xs text-muted-foreground mt-1">Chương trình KHTN - Kết nối tri thức</p>
        </div>

        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <MaterialIcon name="list_alt" size={18} className="text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh sách Chương</span>
          </div>

          <div className="space-y-1">
            {gradeData.chapters.map((ch, i) => {
              const colorClass = subjectColors[ch.subject] || subjectColors.general;
              return (
                <motion.button
                  key={ch.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  onClick={() => { setSelectedChapter(ch.id); setSelectedLesson(null); }}
                  className={`w-full text-left rounded-xl p-3 flex items-start gap-3 transition-all text-sm ${selectedChapter === ch.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/50 border border-transparent'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <MaterialIcon name={ch.icon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight truncate">{ch.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ch.lessons.length} bài học</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Lessons */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {!chapter ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MaterialIcon name="psychology" size={64} className="text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-bold">Sẵn sàng ôn luyện chưa?</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Chọn một chương ở cột bên trái để xem các bài học và bắt đầu tạo bài tập AI nhé.
            </p>
          </div>
        ) : (
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-bold mb-1">{chapter.name}</h2>
            <p className="text-sm text-muted-foreground mb-6">{chapter.lessons.length} bài học</p>

            <div className="space-y-2">
              {chapter.lessons.map((lesson, i) => {
                // Check if user has done exercises for this lesson
                const hasResults = state.exerciseResults.some(r => r.subject === lesson.name);
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i }}
                    className={`bg-card border rounded-xl p-4 flex items-center justify-between hover:shadow-md hover:border-primary/30 transition-all ${hasResults ? 'border-success/30' : 'border-border'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasResults ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                        <MaterialIcon name={hasResults ? 'check_circle' : 'menu_book'} size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{lesson.name}</p>
                        {lesson.summary && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-xl">{lesson.summary}</p>
                        )}
                        {hasResults && (
                          <p className="text-[10px] text-success font-medium mt-1">Đã luyện tập</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewTheory(lesson.id, lesson.name, 'self_study')}
                        className="flex items-center gap-1.5 border border-purple-500/50 text-purple-600 bg-purple-500/5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-purple-500/10 transition-colors"
                      >
                        <MaterialIcon name="html" size={16} />
                        Tự học
                      </button>
                      <button
                        onClick={() => handleViewTheory(lesson.id, lesson.name, 'simulation')}
                        className="flex items-center gap-1.5 border border-destructive/50 text-destructive bg-destructive/5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-destructive/10 transition-colors"
                      >
                        <MaterialIcon name="science" size={16} />
                        Mô phỏng
                      </button>
                      <button
                        onClick={() => handleViewTheory(lesson.id, lesson.name)}
                        className="flex items-center gap-1.5 bg-info/10 text-info px-3 py-2 rounded-lg text-xs font-semibold hover:bg-info/20 transition-colors"
                      >
                        <MaterialIcon name="menu_book" size={16} />
                        Lý thuyết
                      </button>
                      <button
                        onClick={() => handleStartQuiz(lesson.id, lesson.name)}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <MaterialIcon name="edit_document" size={16} />
                        Làm bài
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GradeExercisePage;
