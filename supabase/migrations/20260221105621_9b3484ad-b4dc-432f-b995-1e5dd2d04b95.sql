
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  grade INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Học sinh'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update lesson_simulations RLS: only admin can write
DROP POLICY "Anyone can insert simulations" ON public.lesson_simulations;
DROP POLICY "Anyone can update simulations" ON public.lesson_simulations;
DROP POLICY "Anyone can delete simulations" ON public.lesson_simulations;

CREATE POLICY "Admin can insert simulations" ON public.lesson_simulations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update simulations" ON public.lesson_simulations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete simulations" ON public.lesson_simulations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update lesson_theory RLS: only admin can write
DROP POLICY "Anyone can insert lesson theory" ON public.lesson_theory;
DROP POLICY "Anyone can update lesson theory" ON public.lesson_theory;
DROP POLICY "Anyone can delete lesson theory" ON public.lesson_theory;

CREATE POLICY "Admin can insert lesson theory" ON public.lesson_theory FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update lesson theory" ON public.lesson_theory FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete lesson theory" ON public.lesson_theory FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
