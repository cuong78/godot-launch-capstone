-- V18: Add pending_update_snapshot_id to games to support non-disruptive update review flow.
ALTER TABLE public.games ADD COLUMN pending_update_snapshot_id uuid;

ALTER TABLE public.games
    ADD CONSTRAINT fk_games_pending_update_snapshot
    FOREIGN KEY (pending_update_snapshot_id)
    REFERENCES public.source_snapshots (id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.games.pending_update_snapshot_id IS
    'Pointer to the newer unreviewed source snapshot during update moderation flow';
