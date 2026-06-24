-- ============================================================
--  V20 — storage_routing: cho phép bucket_id NULL
--  Mục đích: file_type mới (auto-seed từ FileType enum lúc khởi động)
--  có thể tồn tại mà CHƯA gán bucket. Admin kéo-thả gán sau qua UI.
--  → FileType enum trở thành nguồn chân lý duy nhất cho danh sách file_type.
-- ============================================================

ALTER TABLE storage_routing ALTER COLUMN bucket_id DROP NOT NULL;
