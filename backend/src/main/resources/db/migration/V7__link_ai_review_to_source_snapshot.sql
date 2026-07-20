-- Link every game AI review to the exact immutable source snapshot it analyzed.
-- Existing rows remain nullable for backward compatibility; all new game reports
-- created by the application populate source_snapshot_id.

ALTER TABLE public.source_snapshots
    ADD COLUMN commit_sha character varying(40);

ALTER TABLE public.ai_review_reports
    ADD COLUMN source_snapshot_id uuid;

ALTER TABLE public.ai_review_reports
    ADD CONSTRAINT fk_ai_review_source_snapshot
        FOREIGN KEY (source_snapshot_id)
        REFERENCES public.source_snapshots(id)
        ON DELETE SET NULL;

CREATE INDEX idx_ai_review_source_snapshot
    ON public.ai_review_reports (source_snapshot_id);

CREATE INDEX idx_source_snapshots_game_created
    ON public.source_snapshots (game_id, created_at DESC);

ALTER TABLE public.ai_review_reports
    DROP CONSTRAINT chk_ai_review_target;

ALTER TABLE public.ai_review_reports
    ADD CONSTRAINT chk_ai_review_target CHECK (
        (game_id IS NOT NULL AND asset_id IS NULL)
        OR (game_id IS NULL AND asset_id IS NOT NULL)
    );

COMMENT ON COLUMN public.source_snapshots.commit_sha IS
    'Exact Git commit analyzed when this immutable source snapshot was created';

COMMENT ON COLUMN public.ai_review_reports.source_snapshot_id IS
    'Exact source snapshot analyzed by this game AI report; NULL for asset reports and legacy rows';
