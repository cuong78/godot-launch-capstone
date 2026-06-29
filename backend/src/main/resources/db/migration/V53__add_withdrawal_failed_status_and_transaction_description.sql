ALTER TYPE withdrawal_status_enum ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS description TEXT;
