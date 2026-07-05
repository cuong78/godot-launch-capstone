-- V25__add_missing_asset_id_to_media.sql
-- Thêm cột asset_id vào bảng media nếu chưa có để đồng bộ với thực thể Media trong Java.

ALTER TABLE public.media
    ADD COLUMN IF NOT EXISTS asset_id uuid;

-- Thêm foreign key constraint nếu chưa có
ALTER TABLE public.media
    DROP CONSTRAINT IF EXISTS media_asset_id_fkey,
    ADD CONSTRAINT media_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
