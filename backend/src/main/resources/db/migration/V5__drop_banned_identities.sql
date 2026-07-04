-- Bỏ blacklist danh tính (banned_identities).
-- Lý do: chống đăng ký lại đã được cover bởi lớp unique sẵn có —
-- face_embeddings check trùng mọi user (ban hay không), embedding KHÔNG bị xóa khi ban.
-- (Check CCCD trùng giữa users sẽ bổ sung ở luồng KYC sau.)
DROP TABLE IF EXISTS public.banned_identities;
