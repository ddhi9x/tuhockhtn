import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';
import MaterialIcon from '@/components/MaterialIcon';
import heroImage from '@/assets/hero-science.png';

const HomePage = () => {
  const navigate = useNavigate();
  const { state, getTodayActivity } = useAppContext();
  const today = getTodayActivity();

  const theoryGoal = 3600; // 60 min
  const exerciseGoal = 50;
  const totalGoal = 18000; // 5 hours

  const theoryPct = Math.min(100, Math.round((today.theoryTime / theoryGoal) * 100));
  const exercisePct = Math.min(100, Math.round((today.exerciseCount / exerciseGoal) * 100));
  const totalPct = Math.min(100, Math.round((today.totalTime / totalGoal) * 100));

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} giây`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    return `${Math.floor(seconds / 3600)} giờ ${Math.floor((seconds % 3600) / 60)} phút`;
  };

  const features = [
    { icon: 'smart_toy', title: 'Gia sư AI', desc: 'Giải đáp mọi thắc mắc 24/7.', path: '/chat', color: 'bg-primary/10 text-primary' },
    { icon: 'edit_document', title: 'Bài tập', desc: 'Luyện tập theo từng chủ đề.', path: '/exercises', color: 'bg-info/10 text-info' },
    { icon: 'workspace_premium', title: 'Hạng học tập', desc: 'Thành tích và huy hiệu.', path: '/profile', color: 'bg-warning/10 text-warning' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-gradient rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 overflow-hidden relative"
      >
        <div className="flex-1 z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground leading-tight">
            Chào {state.profile.name}! 👋
            <br />
            Hôm nay học gì nhỉ?
          </h1>
          <p className="text-primary-foreground/80 mt-3 text-sm md:text-base max-w-md">
            Cùng khám phá những bí ẩn của vũ trụ qua các bài học Vật lý, Hóa học và Sinh học nhé.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 bg-card text-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg transition-shadow"
            >
              <MaterialIcon name="bolt" size={18} />
              Hỏi Gia sư AI
            </button>
            <button
              onClick={() => navigate('/exercises')}
              className="flex items-center gap-2 bg-primary-foreground/20 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-foreground/30 transition-colors border border-primary-foreground/30"
            >
              Làm bài tập ngay
            </button>
          </div>
        </div>
        <div className="w-48 h-48 md:w-64 md:h-64 shrink-0">
          <img src={heroImage} alt="Science" className="w-full h-full object-cover rounded-2xl shadow-xl" />
        </div>
      </motion.div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.button
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            onClick={() => navigate(f.path)}
            className="bg-card rounded-2xl p-5 text-left border border-border hover:shadow-lg hover:border-primary/20 transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <MaterialIcon name={f.icon} size={24} />
            </div>
            <h3 className="font-bold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Progress + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Tiến độ tuần này</h2>
            <button onClick={() => navigate('/profile')} className="text-xs text-primary font-semibold hover:underline">
              Chi tiết
            </button>
          </div>

          <div className="space-y-5">
            {[
              { label: 'Học lý thuyết', pct: theoryPct, detail: formatTime(today.theoryTime) },
              { label: 'Làm bài tập', pct: exercisePct, detail: `${today.exerciseCount} câu` },
              { label: 'Tổng thời gian', pct: totalPct, detail: formatTime(today.totalTime) },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.pct}% <span className="text-muted-foreground/60">({item.detail})</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="streak-gradient rounded-2xl p-6 text-primary-foreground flex flex-col items-center justify-center text-center"
        >
          <MaterialIcon name="local_fire_department" size={40} />
          <h2 className="text-4xl font-extrabold mt-2">{state.streak} Ngày</h2>
          <p className="text-sm mt-2 opacity-90">
            Hãy bắt đầu chuỗi học tập ngay hôm nay bằng cách làm bài tập hoặc hỏi Gia sư AI!
          </p>
          <button
            onClick={() => navigate('/leaderboard')}
            className="mt-4 bg-primary-foreground/20 border border-primary-foreground/30 text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary-foreground/30 transition-colors"
          >
            Xem bảng xếp hạng
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
