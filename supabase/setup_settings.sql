-- Chạy dòng lệnh này trong mục SQL Editor trên Supabase để tạo bảng lưu API Key an toàn
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gemini_api_key text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Khóa quyền bảo mật (chỉ cho phép Authenticated Users với Role phù hợp tương tác nếu làm RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Cho phép ai có quyền đọc/ghi
CREATE POLICY "Cho phép admin đọc settings" ON public.app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Cho phép admin cập nhật settings" ON public.app_settings
  FOR UPDATE USING (auth.role() = 'authenticated');
  
CREATE POLICY "Cho phép admin thêm settings" ON public.app_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tạo 1 row mặc định nếu chưa có
INSERT INTO public.app_settings (gemini_api_key) 
SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);
