-- ============================================================
--  V29 — Nới constraint chk_source_needs_github
--  Luồng mới: tạo marketplace source_code item ở Step 1 (chưa verify)
--  → submit repo verify thật (clone+scan+snapshot) ở Step 2 → set github_verified_at.
--  Constraint cũ bắt github_verified_at NOT NULL ngay lúc tạo → mâu thuẫn.
--  Chỉ giữ yêu cầu github_repo_url NOT NULL cho source_code.
-- ============================================================

ALTER TABLE marketplace_items DROP CONSTRAINT IF EXISTS chk_source_needs_github;

ALTER TABLE marketplace_items ADD CONSTRAINT chk_source_needs_github CHECK (
    item_type <> 'source_code' OR github_repo_url IS NOT NULL
);
