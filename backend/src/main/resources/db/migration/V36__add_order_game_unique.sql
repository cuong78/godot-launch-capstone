-- uq_order_marketplace (V1) chi bao ve (buyer_id, asset_id) khoi mua trung.
-- Mua game/source-code (asset_id NULL, game_id NOT NULL) khong co constraint nao
-- tuong duong o DB. Them unique constraint neu DB chua co san.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_order_game'
          AND conrelid = 'public.orders'::regclass
    )
    AND to_regclass('public.uq_order_game') IS NULL THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT uq_order_game UNIQUE (buyer_id, game_id);
    END IF;
END $$;
