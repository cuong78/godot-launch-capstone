-- Bảng media_content_flags — lưu kết quả quét NSFW tự động cho từng file media

CREATE TABLE IF NOT EXISTS media_content_flags (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    media_url     TEXT         NOT NULL,               -- URL file bị quét
    media_type    VARCHAR(20),                         -- 'image' | 'video'
    owner_type    VARCHAR(50)  NOT NULL,               -- 'game' | 'marketplace_item'
    owner_id      UUID         NOT NULL,
    owner_name    TEXT,                                -- tên game/item (denormalized)
    nsfw_score    FLOAT        NOT NULL DEFAULT 0.0,   -- điểm cao nhất (0-1)
    flagged       BOOLEAN      NOT NULL DEFAULT FALSE,
    flag_details  JSONB,                               -- perImage array từ NSFW scan
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending | approved | removed | warned
    reviewed_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at   TIMESTAMPTZ,
    reviewer_note TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_flags_status  ON media_content_flags(status);
CREATE INDEX IF NOT EXISTS idx_media_flags_owner   ON media_content_flags(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_media_flags_flagged ON media_content_flags(flagged);
CREATE INDEX IF NOT EXISTS idx_media_flags_created ON media_content_flags(created_at DESC);
