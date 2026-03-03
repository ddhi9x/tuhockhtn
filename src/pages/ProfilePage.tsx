import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';
import MaterialIcon from '@/components/MaterialIcon';

const ProfilePage = () => {
  const { state, getTodayActivity, getWeekActivities, updateProfile } = useAppContext();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.profile.name);
  const [viewMode, setViewMode] = useState<'week' | 'year'>('week');

  const today = getTodayActivity();
  const weekActivities = getWeekActivities();

  const totalExercises = state.exerciseResults.reduce((sum, r) => sum + r.total, 0);
  const totalCorrect = state.exerciseResults.reduce((sum, r) => sum + r.correct, 0);
  const avgScore = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 10 * 10) / 10 : 0;

  const theoryGoal = 3600;
  const exerciseGoal = 50;
  const totalGoal = 18000;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} giây`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    return `${Math.floor(seconds / 3600)} giờ ${Math.floor((seconds % 3600) / 60)} phút`;
  };

  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    return hours < 0.1 ? '0' : hours.toFixed(1);
  };

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const maxTime = Math.max(...weekActivities.map(a => a.totalTime), 1);

  const saveName = () => {
    updateProfile({ name: nameInput });
    setEditingName(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-center gap-6"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <MaterialIcon name="person" size={40} className="text-primary" />
        </div>
        <div className="text-center sm:text-left flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => e.key === 'Enter' && saveName()}
              />
              <button onClick={saveName} className="text-primary text-sm font-semibold">Lưu</button>
            </div>
          ) : (
            <h2 className="text-xl font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingName(true)}>
              {state.profile.name}
            </h2>
          )}
          <p className="text-sm text-primary font-medium">{state.profile.grade}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <MaterialIcon name="assignment_turned_in" size={22} className="text-primary" />
            </div>
            <p className="text-lg font-bold">{totalExercises}</p>
            <p className="text-[10px] text-muted-foreground">Đã giải</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-1">
              <MaterialIcon name="star" size={22} className="text-warning" />
            </div>
            <p className="text-lg font-bold">{avgScore}</p>
            <p className="text-[10px] text-muted-foreground">Điểm TB</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-1">
              <MaterialIcon name="local_fire_department" size={22} className="text-destructive" />
            </div>
            <p className="text-lg font-bold">{state.streak}</p>
            <p className="text-[10px] text-muted-foreground">Chuỗi ngày</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h3 className="font-bold flex items-center gap-2 mb-5">
            <MaterialIcon name="track_changes" size={20} className="text-primary" />
            Mục tiêu hôm nay
          </h3>

          <div className="space-y-5">
            {[
              { icon: 'menu_book', label: 'Học lý thuyết', value: formatTime(today.theoryTime), goal: '60 phút', pct: Math.min(100, (today.theoryTime / theoryGoal) * 100) },
              { icon: 'edit_document', label: 'Làm bài tập', value: `${today.exerciseCount} câu`, goal: '50 câu', pct: Math.min(100, (today.exerciseCount / exerciseGoal) * 100) },
              { icon: 'schedule', label: 'Tổng thời gian', value: formatTime(today.totalTime), goal: '5 giờ', pct: Math.min(100, (today.totalTime / totalGoal) * 100) },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <MaterialIcon name={item.icon} size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.value} / {item.goal}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${item.pct}%` }} />
                </div>
                <p className="text-right text-[10px] text-muted-foreground mt-0.5">{Math.round(item.pct)}%</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold flex items-center gap-2">
              <MaterialIcon name="bar_chart" size={20} className="text-primary" />
              Thời gian hoạt động
            </h3>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Tuần
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'year' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Năm
              </button>
            </div>
          </div>

          <div className="flex items-end gap-3 h-40">
            {weekActivities.map((activity, i) => {
              const height = maxTime > 0 ? (activity.totalTime / maxTime) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{formatHours(activity.totalTime)} giờ</span>
                  <div className="w-full bg-muted rounded-lg overflow-hidden flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 2)}%` }}
                      transition={{ delay: 0.05 * i, duration: 0.5 }}
                      className="w-full bg-primary/60 rounded-lg"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{dayLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h3 className="font-bold flex items-center gap-2 mb-5">
          <MaterialIcon name="settings" size={20} className="text-primary" />
          Cài đặt tài khoản
        </h3>

        <div className="space-y-3">
          {[
            { icon: 'lock', title: 'Mật khẩu & Bảo mật', desc: 'Đổi mật khẩu lần cuối 3 tháng trước', action: 'Thay đổi' },
            { icon: 'notifications_active', title: 'Thông báo & Nhắc nhở', desc: 'Nhận thông báo về bài tập và điểm số', action: '' },
            { icon: 'language', title: 'Ngôn ngữ ứng dụng', desc: 'Mặc định: Tiếng Việt', action: 'Tiếng Việt' },
          ].map(item => (
            <div key={item.title} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <MaterialIcon name={item.icon} size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              {item.action && (
                <span className="text-xs text-primary font-medium">{item.action}</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
