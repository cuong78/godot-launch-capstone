-- ============================================================
--  V30 — Bảng media chung + gom FileType routing
--  1. Tạo bảng media (polymorphic: game | marketplace_item)
--  2. Copy game_media → media (owner_type='game')
--  3. Routing: thêm game_media/asset_media/source_bundle, xóa loại cũ
--  4. source_snapshots: thêm bundle_url (link source đã zip lên storage)
-- ============================================================

-- ── 1. Bảng media chung ───────────────────────────────────
CREATE TABLE media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type  VARCHAR(20) NOT NULL CHECK (owner_type IN ('game', 'marketplace_item')),
    owner_id    UUID NOT NULL,
    media_type  VARCHAR(20) NOT NULL,   -- 'thumbnail' | 'screenshot' | 'video' | 'asset_image'
    media_url   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_media_owner ON media(owner_type, owner_id);

COMMENT ON TABLE media IS 'Media chung cho game + marketplace_item (polymorphic owner)';

-- ── 2. Copy game_media → media (owner_type='game') ────────
INSERT INTO media (owner_type, owner_id, media_type, media_url, created_at)
SELECT 'game', game_id, media_type, media_url, created_at FROM game_media;

-- ── 3. source_snapshots: bundle_url ───────────────────────
ALTER TABLE source_snapshots ADD COLUMN IF NOT EXISTS bundle_url TEXT;
COMMENT ON COLUMN source_snapshots.bundle_url IS 'Link source code đã zip lên storage (AI đọc lại + admin/người mua tải)';

-- ── 4. FileType routing — gom lại ─────────────────────────
-- Thêm loại mới (bucket null = chưa gán, admin config sau)
INSERT INTO storage_routing (file_type, bucket_id, updated_at) VALUES
    ('game_media',   NULL, NOW()),
    ('asset_media',  NULL, NOW()),
    ('source_bundle',NULL, NOW())
ON CONFLICT (file_type) DO NOTHING;

-- Xóa loại cũ (đã gom hoặc bỏ): thumbnail/screenshot/video → game_media,
-- asset → asset_media, game_zip/source_code_zip → bỏ (dùng repo)
DELETE FROM storage_routing WHERE file_type IN
    ('thumbnail', 'screenshot', 'video', 'asset', 'game_zip', 'source_code_zip');

-- KHÔNG drop game_media table ở đây — giữ để rollback, drop ở migration sau khi verify.
