import React from 'react';
import MaterialIcon from './MaterialIcon';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <MaterialIcon name="info" className="text-primary" />
          Thông tin hệ thống
        </h2>

        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MaterialIcon name="auto_awesome" size={18} className="text-primary" />
              <p className="text-sm font-semibold">AI được tích hợp sẵn</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Hệ thống sử dụng AI tích hợp sẵn, học sinh không cần nhập API key. 
              Tất cả tính năng AI (Chat, Sinh quiz) đều hoạt động tự động.
            </p>
          </div>

          <div className="bg-muted rounded-xl p-4">
            <p className="text-xs text-muted-foreground">
              * Hệ thống sẽ tự động chuyển đổi sang model khác nếu model đã chọn bị quá tải.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
