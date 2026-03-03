import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Student {
  id: string;
  student_code: string;
  full_name: string;
  class_name: string;
  gender: string;
  grade: number;
}

interface AuthContextType {
  user: User | null;
  student: Student | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInByStudentCode: (code: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    // If it's a demo admin, we already know they are admin
    if (userId === 'demo-admin-id') {
      setIsAdmin(true);
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // 1. Check for real Supabase Session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession.user);
            await checkAdminRole(currentSession.user.id);
          }
        } else {
          // 2. Check for Student session
          const savedStudentId = localStorage.getItem('student_id');
          if (savedStudentId) {
            const { data, error } = await (supabase
              .from('students' as any)
              .select('*')
              .eq('id', savedStudentId)
              .maybeSingle() as any);

            if (data && !error && mounted) {
              setStudent(data as unknown as Student);
              setIsAdmin(false);
            }
          } else {
            // 3. Check for Demo Admin persistence
            const isDemoAdmin = localStorage.getItem('is_demo_admin') === 'true';
            if (isDemoAdmin && mounted) {
              const mockUser = {
                id: 'demo-admin-id',
                email: 'ddhisk9x@gmail.com',
                user_metadata: { display_name: 'Admin Demo' }
              } as unknown as User;
              setUser(mockUser);
              setSession({ user: mockUser, access_token: 'mock-token', expires_at: Date.now() + 3600000 } as any);
              setIsAdmin(true);
              setStudent(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (for real Supabase users)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (_event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setStudent(null);
          localStorage.removeItem('student_id');
          localStorage.removeItem('is_demo_admin');
        } else if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          checkAdminRole(newSession.user.id);
          localStorage.removeItem('student_id');
          localStorage.removeItem('is_demo_admin');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Mock admin login for local demo
    if (email === 'ddhisk9x@gmail.com' && password === 'nshmadmin') {
      const mockUser = {
        id: 'demo-admin-id',
        email: 'ddhisk9x@gmail.com',
        user_metadata: { display_name: 'Admin Demo' }
      } as unknown as User;

      setUser(mockUser);
      setSession({ user: mockUser, access_token: 'mock-token', expires_at: Date.now() + 3600000 } as any);
      setIsAdmin(true);
      setStudent(null);
      localStorage.removeItem('student_id');
      localStorage.setItem('is_demo_admin', 'true');
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setStudent(null);
      localStorage.removeItem('student_id');
      localStorage.removeItem('is_demo_admin');
    }
    return { error };
  };

  const signInByStudentCode = async (code: string, password: string) => {
    const { data, error } = await (supabase
      .from('students' as any)
      .select('*')
      .eq('student_code', code)
      .maybeSingle() as any);

    if (error) return { error };
    if (!data) return { error: { message: 'Mã học sinh không tồn tại' } };

    if (data.password !== password) {
      return { error: { message: 'Mật khẩu không chính xác' } };
    }

    setStudent(data as unknown as Student);
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    localStorage.setItem('student_id', data.id);
    localStorage.removeItem('is_demo_admin');
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStudent(null);
    setSession(null);
    setIsAdmin(false);
    localStorage.removeItem('student_id');
    localStorage.removeItem('is_demo_admin');
  };

  return (
    <AuthContext.Provider value={{ user, student, session, isAdmin, isLoading, signUp, signIn, signInByStudentCode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
