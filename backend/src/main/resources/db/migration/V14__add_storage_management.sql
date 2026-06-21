-- ============================================================
--  Storage Management — dynamic provider routing
--  V14 | storage_accounts, storage_buckets, storage_routing
-- ============================================================

CREATE TABLE storage_accounts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    provider   VARCHAR(20)  NOT NULL CHECK (provider IN ('aws_s3', 'seaweedfs')),
    config     TEXT         NOT NULL,   -- AES-256 encrypted JSON
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE storage_buckets (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID        NOT NULL REFERENCES storage_accounts(id) ON DELETE CASCADE,
    name       VARCHAR(200) NOT NULL,
    region     VARCHAR(50),             -- S3 only
    public_url TEXT,                    -- SeaweedFS public base URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE storage_routing (
    file_type  VARCHAR(50) PRIMARY KEY,
    bucket_id  UUID        NOT NULL REFERENCES storage_buckets(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default file types (unassigned — admin sẽ config qua UI)
INSERT INTO storage_routing (file_type, bucket_id, updated_at)
SELECT ft.file_type, (SELECT id FROM storage_buckets LIMIT 1), NOW()
FROM (VALUES
    ('avatar'),
    ('thumbnail'),
    ('pdf_contract'),
    ('game_zip'),
    ('source_code_zip'),
    ('screenshot'),
    ('video'),
    ('asset')
) AS ft(file_type)
WHERE EXISTS (SELECT 1 FROM storage_buckets LIMIT 1);

CREATE INDEX idx_storage_buckets_account ON storage_buckets(account_id);
