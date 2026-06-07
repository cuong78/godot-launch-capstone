CREATE TABLE game_media (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id    UUID         NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    media_type VARCHAR(20)  NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url  TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_media_game_id ON game_media(game_id);

COMMENT ON TABLE game_media IS 'Lưu trữ các hình ảnh chụp màn hình (screenshots) và video gameplay của game';
COMMENT ON COLUMN game_media.media_type IS 'Loại tài nguyên: image hoặc video';
COMMENT ON COLUMN game_media.media_url IS 'Đường dẫn URL tệp tin lưu trữ trên S3';
