-- Chạy đoạn mã này trong phần SQL Editor của Supabase để tạo bảng lưu Lý thuyết
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

-- Bật tính năng Bảo mật RLS
ALTER TABLE public.lesson_theory ENABLE ROW LEVEL SECURITY;

-- Cho phép mọi người (Học sinh/Giáo viên) đọc lý thuyết
CREATE POLICY "Cho phép đọc lý thuyết" ON public.lesson_theory
  FOR SELECT USING (true);

-- Xóa policy cũ nếu có
DROP POLICY IF EXISTS "Cho phép admin chỉnh sửa lý thuyết" ON public.lesson_theory;

-- Cho phép mọi thao tác cho người dùng đã đăng nhập
CREATE POLICY "Cho phép admin chỉnh sửa lý thuyết" ON public.lesson_theory
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  
-- Nếu frontend gọi upsert nhưng chưa config Role chuẩn, có thể tạm thời mở khóa hoàn toàn:
-- DROP POLICY IF EXISTS "Cho phép admin chỉnh sửa lý thuyết" ON public.lesson_theory;
-- CREATE POLICY "Cho phép tất cả quyền ghi/xóa" ON public.lesson_theory FOR ALL USING (true) WITH CHECK (true);
