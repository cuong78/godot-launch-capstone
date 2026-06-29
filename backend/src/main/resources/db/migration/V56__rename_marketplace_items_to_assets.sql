-- ============================================================
--  V56: đổi tên marketplace_items → assets (trực quan hơn)
-- ============================================================
--  Mô hình mới: Game (lên store / marketplace qua publishing_type) + Asset (asset bán ở market).
--  - marketplace_items        → assets
--  - marketplace_item_tags    → asset_tags  (cột marketplace_item_id → asset_id)
--  - cột marketplace_item_id  → asset_id ở 8 bảng tham chiếu
--  - DROP cột documentation + godot_version (không dùng nữa)
--  - GIỮ version (để sau user update phiên bản) + supported_platforms
--  FK constraint của Postgres theo OID nên tự đi theo khi rename, không cần tạo lại.
-- ============================================================

-- 1. Drop 2 cột không dùng
ALTER TABLE marketplace_items DROP COLUMN IF EXISTS documentation;
ALTER TABLE marketplace_items DROP COLUMN IF EXISTS godot_version;

-- 2. Rename bảng chính + bảng tags
ALTER TABLE marketplace_items RENAME TO assets;
ALTER TABLE marketplace_item_tags RENAME TO asset_tags;

-- 3. Rename cột FK → asset_id ở mọi bảng tham chiếu
--    LƯU Ý: asset_tags (cũ marketplace_item_tags) dùng cột 'item_id', các bảng khác dùng 'marketplace_item_id'
ALTER TABLE asset_tags         RENAME COLUMN item_id TO asset_id;
ALTER TABLE orders             RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE cart_items         RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE reviews            RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE disputes           RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE source_downloads   RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE source_snapshots   RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE ai_review_reports  RENAME COLUMN marketplace_item_id TO asset_id;
ALTER TABLE media_files        RENAME COLUMN marketplace_item_id TO asset_id;

-- 4. Rename các index/constraint cho khớp tên mới (tùy chọn — cho gọn, không bắt buộc)
ALTER INDEX IF EXISTS marketplace_items_pkey      RENAME TO assets_pkey;
ALTER INDEX IF EXISTS marketplace_item_tags_pkey  RENAME TO asset_tags_pkey;

COMMENT ON TABLE assets IS 'Asset bán ở marketplace (3D model, sprite, audio, source code lẻ). Tách khỏi Game.';
