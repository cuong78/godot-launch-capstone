    -- V27__add_order_id_to_transactions.sql
-- Thêm cột order_id vào bảng transactions để liên kết Many-to-One với bảng orders.

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS order_id uuid;

-- Thêm foreign key constraint
ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_order_id_fkey,
    ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
