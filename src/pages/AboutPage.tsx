import React from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from '@/components/MaterialIcon';

const AboutPage = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-8 text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-primary flex items-center justify-center mb-4">
          <MaterialIcon name="school" size={40} className="text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Tự học KHTN</h1>
        <p className="text-muted-foreground mt-2">Phiên bản 1.0</p>

        <div className="mt-6 space-y-4 text-left">
          <div className="bg-muted/50 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-1">👩‍🏫 Phát triển bởi</h3>
            <p className="text-sm text-muted-foreground">Thầy Dương Đức Hiếu</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-1">📚 Mục đích</h3>
            <p className="text-sm text-muted-foreground">
              Hỗ trợ học sinh cấp THCS ôn luyện các môn Khoa học Tự nhiên (Vật lý, Hóa học, Sinh học) 
              thông qua AI và bài tập trắc nghiệm thông minh.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-1">🤖 Công nghệ</h3>
            <p className="text-sm text-muted-foreground">
              Sử dụng Google Gemini AI để giải đáp thắc mắc và hỗ trợ học tập 24/7.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AboutPage;
