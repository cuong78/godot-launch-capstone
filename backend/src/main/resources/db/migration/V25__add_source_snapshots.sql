-- ============================================================
--  V22 — source_snapshots: bằng chứng bất biến mỗi lần submit code
--  Mục đích: due diligence + phán xử tranh chấp bản quyền sau này.
--  Lưu commit SHA + hash toàn bộ source tại thời điểm submit.
-- ============================================================

CREATE TABLE source_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id             UUID REFERENCES games(id) ON DELETE CASCADE,
    marketplace_item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,
    submitted_by        UUID NOT NULL REFERENCES users(id),
    repo_url            TEXT NOT NULL,
    commit_sha          VARCHAR(40),
    bundle_hash         VARCHAR(64) NOT NULL,   -- SHA-256 toàn bộ source
    file_count          INTEGER NOT NULL DEFAULT 0,
    is_godot_project    BOOLEAN NOT NULL DEFAULT FALSE,
    virus_clean         BOOLEAN NOT NULL DEFAULT TRUE,
    virus_scanned       BOOLEAN NOT NULL DEFAULT FALSE,  -- ClamAV có chạy không
    file_hashes         JSONB,                  -- { "path": "sha256" }
    secrets_found       JSONB,                  -- [ {file, type} ] secret hardcoded
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- mỗi snapshot gắn với game HOẶC marketplace item (không cả hai)
    CONSTRAINT chk_snapshot_target CHECK (
        (game_id IS NOT NULL AND marketplace_item_id IS NULL)
        OR (game_id IS NULL AND marketplace_item_id IS NOT NULL)
    )
);

CREATE INDEX idx_source_snapshots_game    ON source_snapshots(game_id);
CREATE INDEX idx_source_snapshots_item    ON source_snapshots(marketplace_item_id);
CREATE INDEX idx_source_snapshots_user    ON source_snapshots(submitted_by);
CREATE INDEX idx_source_snapshots_bundle  ON source_snapshots(bundle_hash);

COMMENT ON TABLE source_snapshots IS 'Bằng chứng bất biến mỗi lần submit code (anti-theft + due diligence)';
