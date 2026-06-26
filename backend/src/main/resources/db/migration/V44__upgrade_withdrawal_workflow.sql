DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'withdrawal_requests'
          AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE withdrawal_requests RENAME COLUMN reviewed_by TO processed_by;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'withdrawal_requests'
          AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE withdrawal_requests RENAME COLUMN reviewed_at TO processed_at;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'withdrawal_requests'
          AND column_name = 'reject_reason'
    ) THEN
        ALTER TABLE withdrawal_requests RENAME COLUMN reject_reason TO remark;
    END IF;
END $$;

ALTER TABLE withdrawal_requests
    ADD COLUMN IF NOT EXISTS transfer_reference VARCHAR(120);

ALTER TYPE withdrawal_status_enum ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE withdrawal_status_enum ADD VALUE IF NOT EXISTS 'cancelled';

UPDATE withdrawal_requests
SET status = 'completed'::withdrawal_status_enum
WHERE status::text = 'approved';
