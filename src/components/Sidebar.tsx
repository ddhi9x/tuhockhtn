import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcon from './MaterialIcon';

const navItems = [
  { path: '/', label: 'Tổng quan', icon: 'dashboard' },
  { path: '/chat', label: 'Gia sư AI', icon: 'smart_toy' },
];

const gradeItems = [
  { path: '/exercises/6', label: 'Lớp 6', icon: 'local_florist' },
  { path: '/exercises/7', label: 'Lớp 7', icon: 'science' },
  { path: '/exercises/8', label: 'Lớp 8', icon: 'biotech' },
  { path: '/exercises/9', label: 'Lớp 9', icon: 'memory' },
];

const personalItems = [
  { path: '/leaderboard', label: 'Xếp hạng', icon: 'leaderboard' },
  { path: '/profile', label: 'Hồ sơ', icon: 'person' },
  { path: '/about', label: 'Về tác giả', icon: 'info' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path || (path !== '/' && path !== '/admin' && location.pathname.startsWith(path + '/'));

  const NavButton = ({ path, label, icon }: { path: string; label: string; icon: string }) => (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(path)
        ? 'bg-primary text-primary-foreground shadow-md'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }`}
    >
      <MaterialIcon name={icon} size={20} />
      {label}
    </button>
  );

  return (
    <aside className="w-[220px] min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col py-4 px-3 shrink-0">
      <div className="text-center mb-6 px-2">
        <h2 className="text-sm font-bold text-foreground leading-tight">KHOA HỌC TỰ NHIÊN</h2>
        <span className="text-[10px] font-semibold text-primary tracking-wider">KHỐI LỚP THCS</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <NavButton key={item.path} {...item} />
        ))}

        <div className="pt-4 pb-1 px-2">
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Luyện tập</span>
        </div>
        {gradeItems.map(item => (
          <NavButton key={item.path} {...item} />
        ))}

        <div className="pt-4 pb-1 px-2">
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Kiểm tra</span>
        </div>
        <NavButton path="/exam" label="Tạo đề kiểm tra" icon="assignment" />

        <div className="pt-4 pb-1 px-2">
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Cá nhân</span>
        </div>
        {personalItems.map(item => (
          <NavButton key={item.path} {...item} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Quản trị</span>
            </div>
            <NavButton path="/admin" label="Kho Mô phỏng / HTML" icon="admin_panel_settings" />
            <NavButton path="/admin/theory" label="Lý thuyết" icon="menu_book" />
            <NavButton path="/admin/exercises" label="Kho bài tập" icon="quiz" />
            <NavButton path="/admin/videos" label="Kho video" icon="video_library" />
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
