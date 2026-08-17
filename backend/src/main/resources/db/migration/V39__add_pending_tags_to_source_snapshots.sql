-- Migration V38: Add pending_tags JSONB column to source_snapshots for game update tag comparison
ALTER TABLE source_snapshots ADD COLUMN IF NOT EXISTS pending_tags JSONB;
