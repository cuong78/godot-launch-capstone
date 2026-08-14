-- Tăng độ dài cột status trong bảng disputes lên 50 ký tự để có thể lưu trữ các trạng thái
-- như 'resolved_inconclusive' (21 ký tự) hoặc 'resolved_reporter_fault' (23 ký tự)
ALTER TABLE public.disputes ALTER COLUMN status TYPE character varying(50);
