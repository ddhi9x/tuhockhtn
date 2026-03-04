-- 1. Tạo bảng (Nếu chưa có)
CREATE TABLE IF NOT EXISTS public.lesson_theory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id text UNIQUE NOT NULL,
  lesson_name text NOT NULL,
  grade integer NOT NULL,
  chapter_name text,
  content text,
  summary text,
  key_points jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bật bảo mật RLS
ALTER TABLE public.lesson_theory ENABLE ROW LEVEL SECURITY;

-- 3. Cài đặt các quy tắc (Xóa cái cũ trước khi tạo cái mới để tránh lỗi)
DROP POLICY IF EXISTS "Cho phép đọc lý thuyết" ON public.lesson_theory;
CREATE POLICY "Cho phép đọc lý thuyết" ON public.lesson_theory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép admin chỉnh sửa lý thuyết" ON public.lesson_theory;
CREATE POLICY "Cho phép admin chỉnh sửa lý thuyết" ON public.lesson_theory 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  
-- Dự phòng (Nếu vẫn lỗi quyền):
-- DROP POLICY IF EXISTS "Cho phép tất cả quyền ghi/xóa" ON public.lesson_theory;
-- CREATE POLICY "Cho phép tất cả quyền ghi/xóa" ON public.lesson_theory FOR ALL USING (true) WITH CHECK (true);
