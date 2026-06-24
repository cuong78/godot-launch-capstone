-- Flyway Migration: Add metadata fields to marketplace_items, tags relationship, and media/screenshots

ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS license VARCHAR(50);
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS documentation TEXT;
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0.0';
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS supported_platforms VARCHAR(200);

-- Table for marketplace item screenshots/videos
CREATE TABLE IF NOT EXISTS marketplace_item_media (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id    UUID         NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    media_type VARCHAR(20)  NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url  TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_item_media_item_id ON marketplace_item_media(item_id);

-- Many-to-many relationship table between marketplace_items and tags
CREATE TABLE IF NOT EXISTS marketplace_item_tags (
    marketplace_item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    tag_id              UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (marketplace_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_item_tags_tag_id ON marketplace_item_tags(tag_id);
