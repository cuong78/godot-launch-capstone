-- V23: Add pending metadata and media columns to source_snapshots to support side-by-side comparison in admin moderation queue.
ALTER TABLE public.source_snapshots ADD COLUMN pending_title VARCHAR(200);
ALTER TABLE public.source_snapshots ADD COLUMN pending_description TEXT;
ALTER TABLE public.source_snapshots ADD COLUMN pending_thumbnail_url TEXT;
ALTER TABLE public.source_snapshots ADD COLUMN pending_video_url TEXT;
ALTER TABLE public.source_snapshots ADD COLUMN pending_screenshots jsonb;

COMMENT ON COLUMN public.source_snapshots.pending_title IS 'Pending game title during update moderation flow';
COMMENT ON COLUMN public.source_snapshots.pending_description IS 'Pending game description during update moderation flow';
COMMENT ON COLUMN public.source_snapshots.pending_thumbnail_url IS 'Pending game thumbnail URL during update moderation flow';
COMMENT ON COLUMN public.source_snapshots.pending_video_url IS 'Pending game video URL during update moderation flow';
COMMENT ON COLUMN public.source_snapshots.pending_screenshots IS 'Pending game screenshots JSON list during update moderation flow';
