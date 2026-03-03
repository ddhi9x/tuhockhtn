// Badge and achievement system

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalExercises: number;
  totalCorrect: number;
  streak: number;
  totalTimeSeconds: number;
  chatMessages: number;
  perfectScores: number; // quizzes with 100%
  subjectsStudied: number;
  gradesCompleted: number[];
}

export const badges: Badge[] = [
  {
    id: 'first-step',
    name: 'Bước đầu tiên',
    description: 'Hoàn thành bài tập đầu tiên',
    icon: 'directions_walk',
    color: 'bg-success/10 text-success',
    requirement: (s) => s.totalExercises >= 1,
  },
  {
    id: 'eager-learner',
    name: 'Học sinh chăm chỉ',
    description: 'Hoàn thành 50 câu hỏi',
    icon: 'school',
    color: 'bg-info/10 text-info',
    requirement: (s) => s.totalExercises >= 50,
  },
  {
    id: 'knowledge-seeker',
    name: 'Người tìm kiếm tri thức',
    description: 'Hoàn thành 200 câu hỏi',
    icon: 'auto_stories',
    color: 'bg-primary/10 text-primary',
    requirement: (s) => s.totalExercises >= 200,
  },
  {
    id: 'quiz-master',
    name: 'Bậc thầy trắc nghiệm',
    description: 'Hoàn thành 500 câu hỏi',
    icon: 'emoji_events',
    color: 'bg-warning/10 text-warning',
    requirement: (s) => s.totalExercises >= 500,
  },
  {
    id: 'perfect-score',
    name: 'Điểm tuyệt đối',
    description: 'Đạt 100% trong một bài kiểm tra',
    icon: 'star',
    color: 'bg-warning/10 text-warning',
    requirement: (s) => s.perfectScores >= 1,
  },
  {
    id: 'perfectionist',
    name: 'Hoàn hảo chủ nghĩa',
    description: 'Đạt 100% trong 5 bài kiểm tra',
    icon: 'military_tech',
    color: 'bg-destructive/10 text-destructive',
    requirement: (s) => s.perfectScores >= 5,
  },
  {
    id: 'streak-3',
    name: 'Kiên trì',
    description: 'Chuỗi học tập 3 ngày liên tiếp',
    icon: 'local_fire_department',
    color: 'bg-destructive/10 text-destructive',
    requirement: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    name: 'Tuần lễ vàng',
    description: 'Chuỗi học tập 7 ngày liên tiếp',
    icon: 'whatshot',
    color: 'bg-warning/10 text-warning',
    requirement: (s) => s.streak >= 7,
  },
  {
    id: 'streak-30',
    name: 'Chiến binh học tập',
    description: 'Chuỗi học tập 30 ngày liên tiếp',
    icon: 'shield',
    color: 'bg-primary/10 text-primary',
    requirement: (s) => s.streak >= 30,
  },
  {
    id: 'ai-explorer',
    name: 'Nhà thám hiểm AI',
    description: 'Gửi 10 tin nhắn cho Gia sư AI',
    icon: 'smart_toy',
    color: 'bg-info/10 text-info',
    requirement: (s) => s.chatMessages >= 10,
  },
  {
    id: 'ai-fan',
    name: 'Fan cứng AI',
    description: 'Gửi 100 tin nhắn cho Gia sư AI',
    icon: 'psychology',
    color: 'bg-accent-foreground/10 text-accent-foreground',
    requirement: (s) => s.chatMessages >= 100,
  },
  {
    id: 'time-1h',
    name: 'Bền bỉ',
    description: 'Tổng thời gian học 1 giờ',
    icon: 'timer',
    color: 'bg-success/10 text-success',
    requirement: (s) => s.totalTimeSeconds >= 3600,
  },
  {
    id: 'time-10h',
    name: 'Nỗ lực phi thường',
    description: 'Tổng thời gian học 10 giờ',
    icon: 'hourglass_top',
    color: 'bg-info/10 text-info',
    requirement: (s) => s.totalTimeSeconds >= 36000,
  },
  {
    id: 'accuracy-80',
    name: 'Chính xác',
    description: 'Tỷ lệ đúng trên 80% (ít nhất 20 câu)',
    icon: 'gps_fixed',
    color: 'bg-success/10 text-success',
    requirement: (s) => s.totalExercises >= 20 && (s.totalCorrect / s.totalExercises) >= 0.8,
  },
  {
    id: 'accuracy-95',
    name: 'Xuất sắc',
    description: 'Tỷ lệ đúng trên 95% (ít nhất 50 câu)',
    icon: 'diamond',
    color: 'bg-warning/10 text-warning',
    requirement: (s) => s.totalExercises >= 50 && (s.totalCorrect / s.totalExercises) >= 0.95,
  },
];

// Leaderboard mock data (simulated other students)
export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  grade: string;
  score: number;
  streak: number;
  exercises: number;
}

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Trần Minh Khôi', avatar: '', grade: 'Lớp 9A1', score: 9.8, streak: 45, exercises: 890 },
  { rank: 2, name: 'Nguyễn Thị Hà', avatar: '', grade: 'Lớp 8A2', score: 9.6, streak: 38, exercises: 756 },
  { rank: 3, name: 'Lê Hoàng Anh', avatar: '', grade: 'Lớp 9A3', score: 9.5, streak: 32, exercises: 680 },
  { rank: 4, name: 'Phạm Đức Huy', avatar: '', grade: 'Lớp 7A1', score: 9.3, streak: 28, exercises: 620 },
  { rank: 5, name: 'Võ Thị Mai', avatar: '', grade: 'Lớp 8A1', score: 9.2, streak: 25, exercises: 580 },
  { rank: 6, name: 'Đặng Quốc Bảo', avatar: '', grade: 'Lớp 6A2', score: 9.0, streak: 21, exercises: 510 },
  { rank: 7, name: 'Bùi Thị Ngọc', avatar: '', grade: 'Lớp 7A3', score: 8.8, streak: 18, exercises: 470 },
  { rank: 8, name: 'Huỳnh Minh Tú', avatar: '', grade: 'Lớp 9A2', score: 8.7, streak: 15, exercises: 430 },
  { rank: 9, name: 'Trương Đình Phúc', avatar: '', grade: 'Lớp 6A1', score: 8.5, streak: 12, exercises: 380 },
  { rank: 10, name: 'Ngô Thanh Tâm', avatar: '', grade: 'Lớp 8A3', score: 8.3, streak: 10, exercises: 340 },
];
