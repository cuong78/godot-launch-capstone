DO $$
BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('MANUAL_BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE payment_status_enum AS ENUM (
        'PENDING',
        'WAITING_VERIFICATION',
        'PAID',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE orders
    ALTER COLUMN transaction_id DROP NOT NULL;

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    payment_method payment_method_enum NOT NULL DEFAULT 'MANUAL_BANK_TRANSFER',
    payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    receipt_url TEXT,
    payer_name VARCHAR(200),
    payer_bank VARCHAR(200),
    transfer_reference VARCHAR(120),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_verified_by ON payments(verified_by);
