import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcon from './MaterialIcon';

const Header = () => {
  const { state } = useAppContext();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const tabs = [
    { path: '/', label: 'Trang chủ' },
    { path: '/chat', label: 'Gia sư AI' },
    { path: '/profile', label: 'Hồ sơ' },
  ];

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
          <MaterialIcon name="school" size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground leading-tight">Tự học KHTN</h1>
          <p className="text-[11px] text-muted-foreground">Phát triển bởi thầy Dương Đức Hiếu</p>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 bg-muted rounded-full p-1">
        {tabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              location.pathname === tab.path
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/profile')}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MaterialIcon name="person" size={18} className="text-primary" />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-foreground">{user?.user_metadata?.display_name || state.profile.name}</p>
            <p className="text-[10px] text-primary">{isAdmin ? 'Admin' : state.profile.grade}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Đăng xuất"
        >
          <MaterialIcon name="logout" size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
