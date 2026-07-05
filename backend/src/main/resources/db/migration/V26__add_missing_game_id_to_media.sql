-- V26__add_missing_game_id_to_media.sql
-- Thêm cột game_id vào bảng media nếu chưa có để đồng bộ với thực thể Media trong Java.

ALTER TABLE public.media
    ADD COLUMN IF NOT EXISTS game_id uuid;

-- Thêm foreign key constraint nếu chưa có
ALTER TABLE public.media
    DROP CONSTRAINT IF EXISTS media_game_id_fkey,
    ADD CONSTRAINT media_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
