-- 1. Tạo bucket "theory-illustrations" nếu chưa có
INSERT INTO storage.buckets (id, name, public)
VALUES ('theory-illustrations', 'theory-illustrations', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Cấp quyền cho phép tất cả các tệp trong bucket này được đọc công khai
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'theory-illustrations' );

-- 3. Cấp quyền cho phép Admin (Service Role) tải tệp lên
-- Lưu ý: Edge Function dùng Service Role nên thường đã có quyền, nhưng ta thêm cho chắc chắn
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'theory-illustrations' );

-- 4. Cấp quyền cho phép Xóa/Cập nhật (nếu cần)
CREATE POLICY "Service Role Update/Delete"
ON storage.objects FOR UPDATE OR DELETE
USING ( bucket_id = 'theory-illustrations' );
