-- ============================================================
--  V57: đơn giản hóa Asset — bỏ source_code / sourceGame / itemType
-- ============================================================
--  Asset giờ CHỈ là tài nguyên lẻ (3D, sprite, audio, plugin).
--  "Bán source code của game" chuyển sang luồng Game (publishing_type=marketplace_listing).
--    - Bỏ item_type (asset chỉ còn 1 loại; phân loại dùng category)
--    - Bỏ source_game_id (asset không liên kết game nữa)
--    - Bỏ github_repo_url / github_verified_at (repo thuộc Game, không phải Asset)
--  GIỮ: source_snapshots.asset_id / source_downloads.asset_id (Phase 2 sẽ xử lý — chưa drop).
-- ============================================================

-- 1. Bỏ FK + cột source_game_id
ALTER TABLE assets DROP CONSTRAINT IF EXISTS marketplace_items_source_game_id_fkey;
ALTER TABLE assets DROP COLUMN IF EXISTS source_game_id;

-- 2. Bỏ github (asset không còn repo)
ALTER TABLE assets DROP COLUMN IF EXISTS github_repo_url;
ALTER TABLE assets DROP COLUMN IF EXISTS github_verified_at;

-- 3. Bỏ item_type + enum type (chỉ assets dùng item_type_enum)
ALTER TABLE assets DROP COLUMN IF EXISTS item_type;
DROP TYPE IF EXISTS item_type_enum;

COMMENT ON TABLE assets IS 'Asset = tài nguyên lẻ ở marketplace (3D/sprite/audio/plugin). Không chứa source code game.';
