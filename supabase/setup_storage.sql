-- 1. Tạo bucket "theory-illustrations" nếu chưa có
INSERT INTO storage.buckets (id, name, public)
VALUES ('theory-illustrations', 'theory-illustrations', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Tạo bucket "textbook-uploads" cho Knowledge Hub
INSERT INTO storage.buckets (id, name, public)
VALUES ('textbook-uploads', 'textbook-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Tạo bucket "html_lessons" cho Simulations
INSERT INTO storage.buckets (id, name, public)
VALUES ('html_lessons', 'html_lessons', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Tạo bucket "lesson-videos" cho Videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Cấp quyền SELECT công khai cho tất cả các xô
CREATE POLICY "Public Access Select" ON storage.objects FOR SELECT USING (true);

-- Cấp quyền INSERT/UPDATE/DELETE cho Admin/Service Role
-- (Ghi chú: Thường thì service_role có toàn quyền, nhưng ta định nghĩa rõ hơn nếu cần RLS)
CREATE POLICY "Admin All Access" ON storage.objects FOR ALL 
USING (bucket_id IN ('theory-illustrations', 'textbook-uploads', 'html_lessons', 'lesson-videos')) 
WITH CHECK (bucket_id IN ('theory-illustrations', 'textbook-uploads', 'html_lessons', 'lesson-videos'));
