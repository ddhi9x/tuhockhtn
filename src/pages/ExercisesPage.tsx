import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MaterialIcon from '@/components/MaterialIcon';

const gradeCards = [
  { grade: 6, icon: 'local_florist', color: 'bg-success/10 text-success', desc: 'Làm quen với KHTN, Đo lường, Chất và Tế bào' },
  { grade: 7, icon: 'science', color: 'bg-info/10 text-info', desc: 'Nguyên tử, Tốc độ, Âm thanh và Ánh sáng' },
  { grade: 8, icon: 'biotech', color: 'bg-accent-foreground/10 text-accent-foreground', desc: 'Phản ứng hóa học, Áp suất, Điện và Cơ thể người' },
  { grade: 9, icon: 'genetics', color: 'bg-warning/10 text-warning', desc: 'Năng lượng, Kim loại, Di truyền và Tiến hóa' },
];

const ExercisesPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl font-bold">Luyện tập theo chủ đề</h1>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">
          Chọn khối lớp bạn đang theo học để truy cập kho bài tập trắc nghiệm thông minh, bám sát chương trình sách giáo khoa Kết nối tri thức.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {gradeCards.map((g, i) => (
          <motion.button
            key={g.grade}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            onClick={() => setSelected(g.grade)}
            className={`bg-card rounded-2xl p-5 text-left border-2 transition-all hover:shadow-lg flex flex-col h-full ${selected === g.grade ? 'border-primary shadow-md' : 'border-border'
              }`}
          >
            <div className={`w-12 h-12 rounded-xl ${g.color} flex items-center justify-center mb-3`}>
              <MaterialIcon name={g.icon} size={24} />
            </div>
            <h3 className="text-lg font-bold">Lớp {g.grade}</h3>
            <p className="text-[10px] font-bold text-primary tracking-wider uppercase mt-1">Chương trình mới</p>
            <p className="text-xs text-muted-foreground mt-2 flex-grow">{g.desc}</p>
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => selected && navigate(`/exercises/${selected}`)}
        disabled={!selected}
        className="mx-auto flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        Xác nhận & Bắt đầu
        <MaterialIcon name="arrow_forward" size={18} />
      </motion.button>
    </div>
  );
};

export default ExercisesPage;
