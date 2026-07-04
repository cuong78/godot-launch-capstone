-- Chỉ focus Google Play — bỏ cột platform (App Store chưa làm, field luôn là hằng số).
ALTER TABLE public.store_download_stats
    DROP COLUMN IF EXISTS platform;
