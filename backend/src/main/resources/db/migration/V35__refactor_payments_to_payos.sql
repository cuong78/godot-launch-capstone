DO $$
BEGIN
    CREATE TYPE payment_provider_enum AS ENUM ('PAYOS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'order_status_enum'
    ) THEN
        CREATE TYPE order_status_enum AS ENUM ('PENDING', 'PAID');
    END IF;
END $$;

DO $$
BEGIN
    ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'PROCESSING';
    ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'FAILED';
    ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_provider payment_provider_enum,
    ADD COLUMN IF NOT EXISTS payos_order_code BIGINT,
    ADD COLUMN IF NOT EXISTS payos_payment_link_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payos_transaction_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS checkout_url TEXT,
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120),
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

UPDATE payments
SET payment_provider = 'PAYOS'
WHERE payment_provider IS NULL;

UPDATE payments
SET payment_reference = COALESCE(payment_reference, transfer_reference)
WHERE payment_reference IS NULL;

UPDATE payments
SET currency = 'VND'
WHERE currency = 'USD';

ALTER TABLE payments
    ALTER COLUMN payment_provider SET DEFAULT 'PAYOS',
    ALTER COLUMN payment_provider SET NOT NULL,
    ALTER COLUMN currency SET DEFAULT 'VND';

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_status order_status_enum;

UPDATE orders
SET order_status = CASE
    WHEN transaction_id IS NOT NULL THEN 'PAID'::order_status_enum
    ELSE 'PENDING'::order_status_enum
END
WHERE order_status IS NULL;

ALTER TABLE orders
    ALTER COLUMN order_status SET DEFAULT 'PENDING',
    ALTER COLUMN order_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_payos_order_code ON payments(payos_order_code) WHERE payos_order_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_payos_payment_link_id ON payments(payos_payment_link_id) WHERE payos_payment_link_id IS NOT NULL;
