import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

type AuthMode = 'student' | 'admin';

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('student');
  const [studentCode, setStudentCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInByStudentCode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'student') {
      const { error } = await signInByStudentCode(studentCode, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Đăng nhập học sinh thành công!');
        navigate('/');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu giáo viên không đúng'
          : error.message);
      } else {
        toast.success('Đăng nhập giáo viên thành công!');
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-info/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-[440px] relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20 transform hover:scale-105 transition-transform duration-300">
            <MaterialIcon name="auto_stories" size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">KHTN Học liệu điện tử</h1>
          <p className="text-slate-500 mt-2 font-medium">Hệ thống tự học Khoa học tự nhiên THCS</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50">
          {/* Role Selector */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => setMode('student')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'student'
                  ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <MaterialIcon name="school" size={20} />
              Học sinh
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'admin'
                  ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <MaterialIcon name="admin_panel_settings" size={20} />
              Giáo viên
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'student' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Mã học sinh (MHS)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MaterialIcon name="badge" size={20} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={e => setStudentCode(e.target.value)}
                      placeholder="Nhập mã học sinh của bạn..."
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Mật khẩu</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MaterialIcon name="lock" size={20} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mặc định là mã học sinh..."
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Email giáo viên</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MaterialIcon name="alternate_email" size={20} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Nhập email giáo viên..."
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Mật khẩu</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MaterialIcon name="vpn_key" size={20} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu truy cập..."
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 hover:opacity-95 transform active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MaterialIcon name="login" size={24} />
                  Đăng nhập hệ thống
                </>
              )}
            </button>
          </form>

          {mode === 'admin' && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error('Vui lòng nhập email giáo viên trước');
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success('Đã gửi email khôi phục! Vui lòng kiểm tra hộp thư.');
                  }
                }}
                className="w-full text-sm font-medium text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              >
                <MaterialIcon name="help_outline" size={16} />
                Quên mật khẩu giáo viên?
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-slate-400 font-medium flex items-center justify-center gap-1.5">
            <MaterialIcon name="verified_user" size={16} className="text-success" />
            Mã học sinh được cấp bởi nhà trường
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-bold text-slate-300 uppercase tracking-widest">
            <span>Phiên bản 2.0</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Thầy Dương Đức Hiếu</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
