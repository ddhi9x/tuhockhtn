
-- Create exercises table for the question bank
CREATE TABLE public.exercises (
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

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read exercises
CREATE POLICY "Anyone can read exercises"
ON public.exercises FOR SELECT
TO authenticated
USING (true);

-- Only admin can insert
CREATE POLICY "Admin can insert exercises"
ON public.exercises FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admin can update
CREATE POLICY "Admin can update exercises"
ON public.exercises FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admin can delete
CREATE POLICY "Admin can delete exercises"
ON public.exercises FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookup by lesson
CREATE INDEX idx_exercises_lesson ON public.exercises (grade, lesson_id);
CREATE INDEX idx_exercises_difficulty ON public.exercises (difficulty_level);
