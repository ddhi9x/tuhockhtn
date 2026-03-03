import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu không đúng'
          : error.message);
      } else {
        toast.success('Đăng nhập thành công!');
        navigate('/');
      }
    } else {
      if (!displayName.trim()) {
        toast.error('Vui lòng nhập tên hiển thị');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <MaterialIcon name="school" size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tự học KHTN</h1>
          <p className="text-sm text-muted-foreground mt-1">Phát triển bởi thầy Dương Đức Hiếu</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Tên hiển thị</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MaterialIcon name={mode === 'login' ? 'login' : 'person_add'} size={18} />
                  {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </>
              )}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error('Vui lòng nhập email trước');
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success('Đã gửi email đặt lại mật khẩu! Kiểm tra hộp thư của bạn.');
                  }
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                Quên mật khẩu?
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Phát triển bởi Thầy Dương Đức Hiếu
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
