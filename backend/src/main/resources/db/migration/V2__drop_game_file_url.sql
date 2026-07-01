-- ============================================================
--  V2: bỏ cột file_url khỏi games
-- ============================================================
--  Game submit qua GitHub repo → file source thật nằm ở source_snapshots.bundle_url
--  (game = repo + snapshot). Cột games.file_url là di tích luồng cũ "upload game.zip",
--  gần như luôn null. Bỏ để hết dư thừa.
--  (searchGameZips + tab admin "game_zip" đã chuyển sang dùng source_snapshots.)
-- ============================================================

ALTER TABLE games DROP COLUMN IF EXISTS file_url;
