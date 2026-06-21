ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS kyc_full_name      TEXT,
    ADD COLUMN IF NOT EXISTS kyc_id_number      TEXT,
    ADD COLUMN IF NOT EXISTS kyc_date_of_birth  DATE,
    ADD COLUMN IF NOT EXISTS kyc_address        TEXT,
    ADD COLUMN IF NOT EXISTS kyc_document_type  TEXT,
    ADD COLUMN IF NOT EXISTS kyc_verified_at    TIMESTAMPTZ;
