-- ============================================================
--  V21 — Game chuyển sang repo-based (bỏ upload game.zip)
--  Game giờ submit bằng link repo GitHub, hệ thống auto pull.
--  fileUrl (link game.zip) giữ lại cho data cũ, không dùng cho game mới.
-- ============================================================

ALTER TABLE games
    ADD COLUMN IF NOT EXISTS github_repo_url   TEXT,
    ADD COLUMN IF NOT EXISTS github_branch     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS github_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN games.github_repo_url   IS 'Repo GitHub của game — nguồn pull code (thay cho game.zip)';
COMMENT ON COLUMN games.github_branch     IS 'Branch để pull (null = default branch)';
COMMENT ON COLUMN games.github_verified_at IS 'Thời điểm verify owner repo khớp account';
