-- ============================================================
--  V34 — Bảng media chung + gom FileType routing
--  DB hiện tại đã chạy tới V31 nên game_media có thể đã bị drop.
--  Migration này phải chịu được schema cũ:
--  - marketplace_item_media còn tồn tại
--  - marketplace_items.thumbnail_url còn dữ liệu
--  - source_snapshots chưa có bundle_url
-- ============================================================

-- ── 1. Bảng media chung ───────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type  VARCHAR(20) NOT NULL CHECK (owner_type IN ('game', 'marketplace_item')),
    owner_id    UUID NOT NULL,
    media_type  VARCHAR(20) NOT NULL,
    media_url   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_owner ON media(owner_type, owner_id);

COMMENT ON TABLE media IS 'Media chung cho game + marketplace_item (polymorphic owner)';

-- ── 2. Migrate marketplace thumbnail cũ vào media ─────────
INSERT INTO media (owner_type, owner_id, media_type, media_url, created_at)
SELECT
    'marketplace_item',
    mi.id,
    'thumbnail',
    mi.thumbnail_url,
    COALESCE(mi.updated_at, mi.created_at, NOW())
FROM marketplace_items mi
WHERE mi.thumbnail_url IS NOT NULL
  AND BTRIM(mi.thumbnail_url) <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM media m
      WHERE m.owner_type = 'marketplace_item'
        AND m.owner_id = mi.id
        AND m.media_type = 'thumbnail'
        AND m.media_url = mi.thumbnail_url
  );

-- ── 3. Migrate marketplace_item_media cũ vào media ────────
INSERT INTO media (owner_type, owner_id, media_type, media_url, created_at)
SELECT
    'marketplace_item',
    mim.item_id,
    CASE
        WHEN mim.media_type = 'video' THEN 'video'
        ELSE 'screenshot'
    END,
    mim.media_url,
    mim.created_at
FROM marketplace_item_media mim
WHERE NOT EXISTS (
    SELECT 1
    FROM media m
    WHERE m.owner_type = 'marketplace_item'
      AND m.owner_id = mim.item_id
      AND m.media_url = mim.media_url
);

-- ── 4. source_snapshots: bundle_url ───────────────────────
ALTER TABLE source_snapshots
    ADD COLUMN IF NOT EXISTS bundle_url TEXT;

COMMENT ON COLUMN source_snapshots.bundle_url IS 'Link source code đã zip lên storage (AI đọc lại + admin/người mua tải)';

-- ── 5. FileType routing mới ───────────────────────────────
INSERT INTO storage_routing (file_type, bucket_id, updated_at) VALUES
    ('game_media',    NULL, NOW()),
    ('asset_media',   NULL, NOW()),
    ('source_bundle', NULL, NOW())
ON CONFLICT (file_type) DO NOTHING;
