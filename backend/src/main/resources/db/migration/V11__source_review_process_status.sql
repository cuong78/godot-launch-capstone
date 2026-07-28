-- Durable status for the two asynchronous analyses that consume a SourceSnapshot.
-- A missing PlagiarismFlag must not be confused with a job that never ran.

ALTER TABLE public.source_snapshots
    ADD COLUMN ai_review_status character varying(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN ai_review_error text,
    ADD COLUMN ai_review_completed_at timestamp with time zone,
    ADD COLUMN plagiarism_status character varying(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN plagiarism_error text,
    ADD COLUMN plagiarism_completed_at timestamp with time zone;

UPDATE public.source_snapshots snapshot
SET ai_review_status = 'completed',
    ai_review_completed_at = (
        SELECT MAX(report.created_at)
        FROM public.ai_review_reports report
        WHERE report.source_snapshot_id = snapshot.id
    )
WHERE EXISTS (
    SELECT 1
    FROM public.ai_review_reports report
    WHERE report.source_snapshot_id = snapshot.id
);

ALTER TABLE public.source_snapshots
    ADD CONSTRAINT chk_source_snapshots_ai_review_status
        CHECK (ai_review_status IN ('pending', 'running', 'completed', 'failed')),
    ADD CONSTRAINT chk_source_snapshots_plagiarism_status
        CHECK (plagiarism_status IN ('pending', 'running', 'completed', 'failed'));

CREATE INDEX idx_source_snapshots_review_status
    ON public.source_snapshots (ai_review_status, plagiarism_status);

COMMENT ON COLUMN public.source_snapshots.ai_review_status IS
    'Lifecycle of internal AI review for this exact immutable source snapshot';
COMMENT ON COLUMN public.source_snapshots.plagiarism_status IS
    'Lifecycle of code embedding and similarity search for this exact snapshot';
