
-- Table for storing lesson theory content and AI summaries
CREATE TABLE public.lesson_theory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  chapter_name TEXT,
  content TEXT, -- full content from uploaded file
  summary TEXT, -- AI-generated summary
  key_points JSONB DEFAULT '[]'::jsonb, -- key points array
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public access (no auth required for this educational app)
ALTER TABLE public.lesson_theory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lesson theory" ON public.lesson_theory FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lesson theory" ON public.lesson_theory FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update lesson theory" ON public.lesson_theory FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete lesson theory" ON public.lesson_theory FOR DELETE USING (true);

-- Create unique index on lesson_id to prevent duplicates
CREATE UNIQUE INDEX idx_lesson_theory_lesson_id ON public.lesson_theory (lesson_id);

-- Storage bucket for uploaded textbook files
INSERT INTO storage.buckets (id, name, public) VALUES ('textbook-uploads', 'textbook-uploads', true);

CREATE POLICY "Anyone can upload textbooks" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'textbook-uploads');
CREATE POLICY "Anyone can read textbooks" ON storage.objects FOR SELECT USING (bucket_id = 'textbook-uploads');
CREATE POLICY "Anyone can delete textbooks" ON storage.objects FOR DELETE USING (bucket_id = 'textbook-uploads');
