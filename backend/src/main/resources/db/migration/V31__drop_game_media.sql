-- ============================================================
--  V31 — Drop game_media (đã thay bằng bảng media chung ở V30)
--  Data đã copy sang media (owner_type='game') trong V30.
--  Giờ không còn entity/code nào dùng game_media → drop an toàn.
-- ============================================================

DROP TABLE IF EXISTS game_media;
