-- Add illustrations column to lesson_theory
ALTER TABLE public.lesson_theory 
ADD COLUMN IF NOT EXISTS illustrations jsonb DEFAULT '{}'::jsonb;

-- Create storage bucket for theory illustrations
INSERT INTO storage.buckets (id, name, public) 
VALUES ('theory-illustrations', 'theory-illustrations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view illustrations
CREATE POLICY "Anyone can view theory illustrations"
ON storage.objects FOR SELECT
USING (bucket_id = 'theory-illustrations');

-- Allow admins to upload illustrations
CREATE POLICY "Admin can upload theory illustrations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'theory-illustrations' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete illustrations
CREATE POLICY "Admin can delete theory illustrations"
ON storage.objects FOR DELETE
USING (bucket_id = 'theory-illustrations' AND public.has_role(auth.uid(), 'admin'));