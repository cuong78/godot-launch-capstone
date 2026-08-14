-- V25: Add version column to assets table to track and persist marketplace asset versions.
ALTER TABLE public.assets ADD COLUMN version VARCHAR(50) DEFAULT '1.0.0' NOT NULL;
COMMENT ON COLUMN public.assets.version IS 'Version number of the marketplace asset (e.g. 1.0.0)';
