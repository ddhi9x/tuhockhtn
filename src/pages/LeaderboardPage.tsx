import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';
import { badges, UserStats } from '@/data/badgeData';
import MaterialIcon from '@/components/MaterialIcon';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const LeaderboardPage = () => {
  const { state } = useAppContext();
  const [tab, setTab] = useState<'leaderboard' | 'badges'>('leaderboard');

  // Calculate user stats
  const totalExercises = state.exerciseResults.reduce((s, r) => s + r.total, 0);
  const totalCorrect = state.exerciseResults.reduce((s, r) => s + r.correct, 0);
  const totalTime = state.dailyActivities.reduce((s, a) => s + a.totalTime, 0);
  const perfectScores = state.exerciseResults.filter(r => r.correct === r.total && r.total > 0).length;
  const chatMessages = state.chatHistory.filter(m => m.role === 'user').length;

  const userStats: UserStats = {
    totalExercises,
    totalCorrect,
    streak: state.streak,
    totalTimeSeconds: totalTime,
    chatMessages,
    perfectScores,
    subjectsStudied: 0,
    gradesCompleted: [],
  };

  const avgScore = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 10 * 10) / 10 : 0;

  const [realStudents, setRealStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase.from('students' as any).select('full_name, class_name, grade');
      if (!error && data) {
        setRealStudents(data);
      }
      setLoading(false);
    };
    fetchStudents();
  }, []);

  // Insert user into leaderboard
  const userEntry = {
    rank: 0,
    name: state.profile.name,
    avatar: '',
    grade: state.profile.grade,
    score: avgScore,
    streak: state.streak,
    exercises: totalExercises,
    isUser: true,
  };

  // Convert real students from DB to entry format
  const studentEntries = realStudents
    .filter(s => s.full_name !== state.profile.name) // Don't double count if user is in DB list
    .map(s => ({
      rank: 0,
      name: s.full_name,
      avatar: '',
      grade: `${s.class_name} - Khối ${s.grade}`,
      score: 0, // Other students have 0 for now as scores are local
      streak: 0,
      exercises: 0,
      isUser: false,
    }));

  const fullLeaderboard = [...studentEntries];

  // Find where user would rank
  let userRank = fullLeaderboard.length + 1;
  for (let i = 0; i < fullLeaderboard.length; i++) {
    if (avgScore >= fullLeaderboard[i].score) {
      userRank = i + 1;
      break;
    }
  }
  fullLeaderboard.splice(userRank - 1, 0, { ...userEntry, rank: userRank });

  // Sort and re-rank
  fullLeaderboard.sort((a, b) => b.score - a.score || b.exercises - a.exercises);
  fullLeaderboard.forEach((e, i) => e.rank = i + 1);

  const earnedBadges = badges.filter(b => b.requirement(userStats));
  const lockedBadges = badges.filter(b => !b.requirement(userStats));

  const medalColors = ['text-warning', 'text-muted-foreground', 'text-warning/70'];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 bg-muted rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'leaderboard' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <MaterialIcon name="leaderboard" size={18} />
          Bảng xếp hạng
        </button>
        <button
          onClick={() => setTab('badges')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'badges' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <MaterialIcon name="workspace_premium" size={18} />
          Huy hiệu ({earnedBadges.length}/{badges.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Đang tải bảng xếp hạng...</p>
        </div>
      ) : tab === 'leaderboard' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 0, 2].map((podiumIdx) => {
              const entry = fullLeaderboard[podiumIdx];
              if (!entry) return null;
              const isCenter = podiumIdx === 0;
              return (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * podiumIdx }}
                  className={`bg-card rounded-2xl border-2 p-5 text-center transition-all ${(entry as any).isUser ? 'border-primary shadow-lg' : 'border-border'
                    } ${isCenter ? 'scale-105 -mt-2' : ''}`}
                >
                  <div className="relative inline-block mb-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${(entry as any).isUser ? 'bg-primary' : 'bg-muted'
                      }`}>
                      <MaterialIcon
                        name={(entry as any).isUser ? 'person' : 'person'}
                        size={32}
                        className={(entry as any).isUser ? 'text-primary-foreground' : 'text-muted-foreground'}
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center">
                      {entry.rank <= 3 ? (
                        <MaterialIcon name="emoji_events" size={16} className={medalColors[entry.rank - 1]} />
                      ) : (
                        <span className="text-[10px] font-bold">{entry.rank}</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-sm truncate">{entry.name}</h3>
                  <p className="text-[10px] text-primary font-medium">{entry.grade}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-muted rounded-lg py-1.5">
                      <p className="font-bold text-foreground">{entry.score}</p>
                      <p className="text-muted-foreground">Điểm TB</p>
                    </div>
                    <div className="bg-muted rounded-lg py-1.5">
                      <p className="font-bold text-foreground">{entry.exercises}</p>
                      <p className="text-muted-foreground">Bài tập</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Full list */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_4rem_4rem_4rem] gap-2 px-4 py-3 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>#</span>
              <span>Học sinh</span>
              <span className="text-center">Điểm</span>
              <span className="text-center">Streak</span>
              <span className="text-center">Bài tập</span>
            </div>
            {fullLeaderboard.slice(3).map((entry, i) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                className={`grid grid-cols-[3rem_1fr_4rem_4rem_4rem] gap-2 px-4 py-3 items-center border-t border-border text-sm ${(entry as any).isUser ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/30'
                  }`}
              >
                <span className="font-bold text-muted-foreground">{entry.rank}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${(entry as any).isUser ? 'bg-primary' : 'bg-muted'
                    }`}>
                    <MaterialIcon name="person" size={16} className={(entry as any).isUser ? 'text-primary-foreground' : 'text-muted-foreground'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      {entry.name}
                      {(entry as any).isUser && <span className="text-primary text-[10px] ml-1">(Bạn)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{entry.grade}</p>
                  </div>
                </div>
                <span className="text-center font-semibold">{entry.score}</span>
                <span className="text-center">
                  <span className="inline-flex items-center gap-0.5">
                    <MaterialIcon name="local_fire_department" size={12} className="text-destructive" />
                    {entry.streak}
                  </span>
                </span>
                <span className="text-center text-muted-foreground">{entry.exercises}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === 'badges' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Earned */}
          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MaterialIcon name="workspace_premium" size={22} className="text-warning" />
              Đã đạt được ({earnedBadges.length})
            </h2>
            {earnedBadges.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <MaterialIcon name="emoji_events" size={48} className="text-muted-foreground/30" />
                <p className="text-muted-foreground mt-3">Chưa có huy hiệu nào. Hãy bắt đầu học tập!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {earnedBadges.map((badge, i) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i }}
                    className="bg-card rounded-2xl border-2 border-primary/20 p-4 text-center hover:shadow-lg transition-shadow"
                  >
                    <div className={`w-14 h-14 rounded-xl ${badge.color} flex items-center justify-center mx-auto mb-2`}>
                      <MaterialIcon name={badge.icon} size={28} />
                    </div>
                    <h4 className="font-bold text-sm">{badge.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                    <span className="inline-block mt-2 text-[9px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                      ✓ Đã đạt
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Locked */}
          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MaterialIcon name="lock" size={22} className="text-muted-foreground" />
              Chưa đạt ({lockedBadges.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {lockedBadges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * i }}
                  className="bg-card rounded-2xl border border-border p-4 text-center opacity-60 hover:opacity-80 transition-opacity"
                >
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                    <MaterialIcon name="lock" size={24} className="text-muted-foreground/50" />
                  </div>
                  <h4 className="font-bold text-sm">{badge.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LeaderboardPage;
