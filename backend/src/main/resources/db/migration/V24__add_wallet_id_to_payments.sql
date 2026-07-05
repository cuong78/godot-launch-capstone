-- V24__add_wallet_id_to_payments.sql
-- Thêm cột wallet_id vào bảng payments để liên kết với wallets, thay thế cho order_id cũ.

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS wallet_id uuid;

-- Thêm foreign key constraint
ALTER TABLE public.payments
    ADD CONSTRAINT payments_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;
