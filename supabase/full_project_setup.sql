-- ==========================================
-- BỘ SQL KHÔI PHỤC TOÀN DIỆN DỰ ÁN KHTN
-- Project: lqusmaooekvbflhmwlty
-- ==========================================

-- 1. XÁC THỰC & PHÂN QUYỀN (Roles & Profiles)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'student');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  grade INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 2. CÀI ĐẶT HỆ THỐNG
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gemini_api_key text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (gemini_api_key) SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- 3. DỮ LIỆU HỌC TẬP (AI & Simulations)
CREATE TABLE IF NOT EXISTS public.lesson_theory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id TEXT NOT NULL UNIQUE,
  lesson_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  chapter_name TEXT,
  content TEXT,
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  illustrations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  sim_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL,
  chapter_name text NOT NULL,
  lesson_id text NOT NULL,
  lesson_name text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer NOT NULL DEFAULT 0,
  explanation text,
  difficulty_level text NOT NULL DEFAULT 'medium',
  is_ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL,
  lesson_id text NOT NULL,
  lesson_name text NOT NULL,
  chapter_name text NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. QUẢN LÝ HỌC SINH
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  birthday text,
  class_name text,
  gender text,
  password text NOT NULL,
  grade integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. PHÂN QUYỀN (RLS Policies)
ALTER TABLE public.lesson_theory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles & Theory
DROP POLICY IF EXISTS "Anyone can read lesson theory" ON public.lesson_theory;
CREATE POLICY "Anyone can read lesson theory" ON public.lesson_theory FOR SELECT USING (true);
CREATE POLICY "Admin can write theory" ON public.lesson_theory FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for Simulations
DROP POLICY IF EXISTS "Anyone can read simulations" ON public.lesson_simulations;
CREATE POLICY "Anyone can read simulations" ON public.lesson_simulations FOR SELECT USING (true);
CREATE POLICY "Admin can write simulations" ON public.lesson_simulations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for Exercises
DROP POLICY IF EXISTS "Anyone can read exercises" ON public.exercises;
CREATE POLICY "Anyone can read exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Admin can write exercises" ON public.exercises FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for Videos
DROP POLICY IF EXISTS "Anyone can read videos" ON public.lesson_videos;
CREATE POLICY "Anyone can read videos" ON public.lesson_videos FOR SELECT USING (true);
CREATE POLICY "Admin can write videos" ON public.lesson_videos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for Students
DROP POLICY IF EXISTS "Anyone can read students" ON public.students;
CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admin can write students" ON public.students FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('textbook-uploads', 'textbook-uploads', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('theory-illustrations', 'theory-illustrations', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view assets" ON storage.objects FOR SELECT USING (bucket_id IN ('textbook-uploads', 'lesson-videos', 'theory-illustrations'));
CREATE POLICY "Admin can upload assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('textbook-uploads', 'lesson-videos', 'theory-illustrations') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete assets" ON storage.objects FOR DELETE USING (bucket_id IN ('textbook-uploads', 'lesson-videos', 'theory-illustrations') AND public.has_role(auth.uid(), 'admin'));
