-- ============================================================
--  V39: gộp AI review về 1 bảng duy nhất
-- ============================================================
--  1) Drop bảng ai_reports cũ (V1) — thiên ĐỊNH GIÁ, gắn game_version_id,
--     chưa từng được dùng (GameVersion chưa active, không service nào ghi).
--  2) Thêm phần KHUYẾN NGHỊ GIÁ vào ai_review_reports (V38) → 1 bảng vừa
--     kiểm duyệt nội dung, vừa gợi ý giá.
-- ============================================================

-- 1. Drop bảng định giá cũ + 2 enum chỉ nó dùng (không bảng nào REFERENCES ai_reports)
DROP TABLE IF EXISTS ai_reports CASCADE;
DROP TYPE  IF EXISTS ai_rec_enum;
DROP TYPE  IF EXISTS security_status_enum;

-- 2. Thêm khuyến nghị giá vào ai_review_reports (gộp mục đích định giá vào đây)
ALTER TABLE ai_review_reports
    ADD COLUMN suggested_price          NUMERIC(15,2) CHECK (suggested_price >= 0),
    ADD COLUMN suggested_revenue_split  SMALLINT      CHECK (suggested_revenue_split BETWEEN 0 AND 100),
    ADD COLUMN pricing_rationale        TEXT;

COMMENT ON COLUMN ai_review_reports.suggested_price IS 'Giá AI gợi ý (đề xuất, admin quyết định)';
COMMENT ON COLUMN ai_review_reports.suggested_revenue_split IS '% chia doanh thu AI gợi ý 0-100 (game co-publishing)';
COMMENT ON COLUMN ai_review_reports.pricing_rationale IS 'Lý do AI đề xuất mức giá đó';
