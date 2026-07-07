-- uq_order_marketplace (V1) chỉ bảo vệ (buyer_id, asset_id) khỏi mua trùng.
-- Mua game/source-code (asset_id NULL, game_id NOT NULL) không có constraint nào
-- tương đương ở DB — app-level check existsByBuyerIdAndGameId() bị race điều kiện
-- (2 request đồng thời đều pass check trước khi transaction nào commit) có thể
-- tạo ra 2 Order cho cùng 1 game, trừ ví buyer 2 lần. Thêm unique constraint để
-- DB chặn triệt để, Postgres cho phép nhiều NULL nên không ảnh hưởng asset orders.
ALTER TABLE public.orders
    ADD CONSTRAINT uq_order_game UNIQUE (buyer_id, game_id);
