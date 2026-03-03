
-- Create lesson_videos table for experiment videos
CREATE TABLE public.lesson_videos (
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

ALTER TABLE public.lesson_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read videos" ON public.lesson_videos FOR SELECT USING (true);
CREATE POLICY "Admin can insert videos" ON public.lesson_videos FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update videos" ON public.lesson_videos FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete videos" ON public.lesson_videos FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lesson_videos_grade_lesson ON public.lesson_videos (grade, lesson_id);

-- Create storage bucket for video files
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', true);

CREATE POLICY "Anyone can view videos" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-videos');
CREATE POLICY "Admin can upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lesson-videos');
CREATE POLICY "Admin can update videos" ON storage.objects FOR UPDATE USING (bucket_id = 'lesson-videos');
CREATE POLICY "Admin can delete videos" ON storage.objects FOR DELETE USING (bucket_id = 'lesson-videos');
