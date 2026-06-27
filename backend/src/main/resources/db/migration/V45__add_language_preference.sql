ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'vi' NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_users_preferred_language'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT check_users_preferred_language
                CHECK (preferred_language IN ('vi', 'en', 'ja'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);
