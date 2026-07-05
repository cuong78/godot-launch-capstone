-- V29__drop_polymorphic_media_columns.sql
-- Gỡ bỏ các cột polymorphic cũ owner_type và owner_id trong bảng media nếu tồn tại để đồng bộ hoàn toàn với Java Media entity.

ALTER TABLE public.media
    DROP COLUMN IF EXISTS owner_type,
    DROP COLUMN IF EXISTS owner_id;
