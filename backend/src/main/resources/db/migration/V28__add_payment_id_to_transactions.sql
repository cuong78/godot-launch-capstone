-- V28__add_payment_id_to_transactions.sql
-- Thêm cột payment_id vào bảng transactions để liên kết One-to-One với bảng payments.

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS payment_id uuid;

-- Thêm foreign key constraint và unique constraint
ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_payment_id_key,
    ADD CONSTRAINT transactions_payment_id_key UNIQUE (payment_id);

ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_payment_id_fkey,
    ADD CONSTRAINT transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
