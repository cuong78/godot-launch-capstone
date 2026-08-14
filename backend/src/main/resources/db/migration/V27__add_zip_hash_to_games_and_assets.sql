-- V27: Add zip_hash column to games and assets tables to support hash-based deduplication and update verification.
ALTER TABLE public.games ADD COLUMN zip_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE public.assets ADD COLUMN zip_hash VARCHAR(64) DEFAULT NULL;

COMMENT ON COLUMN public.games.zip_hash IS 'SHA-256 hash checksum of the last successfully uploaded unified ZIP file';
COMMENT ON COLUMN public.assets.zip_hash IS 'SHA-256 hash checksum of the last successfully uploaded unified ZIP file';
