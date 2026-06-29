-- V47: Thêm lưu trữ ảnh CCCD/KYC và FileType mới cccd_image

-- Cột lưu URL ảnh CCCD (mặt trước và mặt sau)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_front_image_url TEXT,
    ADD COLUMN IF NOT EXISTS kyc_back_image_url  TEXT;

-- Đăng ký FileType cccd_image vào storage_routing (chưa gán bucket → admin tự route)
INSERT INTO storage_routing (file_type, bucket_id, updated_at)
VALUES ('cccd_image', NULL, NOW())
ON CONFLICT (file_type) DO NOTHING;
