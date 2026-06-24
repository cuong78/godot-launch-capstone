-- ============================================================
--  V22 — Drop publishing_guides
--  Tính năng Publishing Wizard không còn nằm trong plan.
--  Bảng không có FK nào tham chiếu ngược → drop an toàn.
-- ============================================================

DROP INDEX IF EXISTS idx_publishing_guides_active;
DROP TABLE IF EXISTS publishing_guides;
