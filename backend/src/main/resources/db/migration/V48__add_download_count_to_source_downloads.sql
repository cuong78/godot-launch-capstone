ALTER TABLE source_downloads
    ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 1 CHECK (download_count >= 1);
