ALTER TABLE withdrawal_requests
    ADD COLUMN IF NOT EXISTS payos_payout_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payos_reference_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS payos_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payos_created_at TEXT;
