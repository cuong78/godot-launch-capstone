-- V10: Make every plagiarism result reproducible against immutable source snapshots.
-- The plagiarism pipeline has not been activated yet, so these tables are
-- expected to be empty when this migration is first deployed. NOT NULL is
-- intentional: fabricating a snapshot for a legacy vector would destroy the
-- audit guarantee this migration introduces.

ALTER TABLE public.source_snapshots
    ADD CONSTRAINT uq_source_snapshots_id_game
        UNIQUE (id, game_id);

ALTER TABLE public.code_embeddings
    ADD COLUMN source_snapshot_id uuid,
    ADD COLUMN model_name character varying(100),
    ADD COLUMN model_version character varying(100);

ALTER TABLE public.code_embeddings
    ALTER COLUMN source_snapshot_id SET NOT NULL,
    ALTER COLUMN model_name SET NOT NULL,
    ALTER COLUMN model_version SET NOT NULL;

-- This composite FK guarantees that the snapshot and embedding belong to the
-- same game. A simple FK on source_snapshot_id would not provide that guarantee.
ALTER TABLE public.code_embeddings
    ADD CONSTRAINT fk_code_embeddings_snapshot_game
        FOREIGN KEY (source_snapshot_id, game_id)
        REFERENCES public.source_snapshots (id, game_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT uq_code_embeddings_identity
        UNIQUE (id, game_id, source_snapshot_id, model_name, model_version),
    ADD CONSTRAINT uq_code_embeddings_snapshot_model
        UNIQUE (source_snapshot_id, model_name, model_version);

CREATE INDEX idx_code_embeddings_source_snapshot
    ON public.code_embeddings (source_snapshot_id);

ALTER TABLE public.plagiarism_flags
    ADD COLUMN code_embedding_id uuid,
    ADD COLUMN matched_code_embedding_id uuid,
    ADD COLUMN source_snapshot_id uuid,
    ADD COLUMN matched_source_snapshot_id uuid,
    ADD COLUMN model_name character varying(100),
    ADD COLUMN model_version character varying(100),
    ADD COLUMN review_threshold real,
    ADD COLUMN reject_threshold real;

ALTER TABLE public.plagiarism_flags
    ALTER COLUMN code_embedding_id SET NOT NULL,
    ALTER COLUMN matched_code_embedding_id SET NOT NULL,
    ALTER COLUMN source_snapshot_id SET NOT NULL,
    ALTER COLUMN matched_source_snapshot_id SET NOT NULL,
    ALTER COLUMN model_name SET NOT NULL,
    ALTER COLUMN model_version SET NOT NULL,
    ALTER COLUMN review_threshold SET NOT NULL,
    ALTER COLUMN reject_threshold SET NOT NULL;

-- Each composite FK binds Game -> Snapshot -> Embedding as one consistent
-- audit target, preventing accidental cross-game associations in application code.
ALTER TABLE public.plagiarism_flags
    ADD CONSTRAINT fk_plagiarism_source_embedding
        FOREIGN KEY (
            code_embedding_id,
            game_id,
            source_snapshot_id,
            model_name,
            model_version
        )
        REFERENCES public.code_embeddings (
            id,
            game_id,
            source_snapshot_id,
            model_name,
            model_version
        )
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_plagiarism_matched_embedding
        FOREIGN KEY (
            matched_code_embedding_id,
            matched_game_id,
            matched_source_snapshot_id,
            model_name,
            model_version
        )
        REFERENCES public.code_embeddings (
            id,
            game_id,
            source_snapshot_id,
            model_name,
            model_version
        )
        ON DELETE CASCADE,
    ADD CONSTRAINT chk_plagiarism_embeddings_distinct
        CHECK (code_embedding_id <> matched_code_embedding_id),
    ADD CONSTRAINT chk_plagiarism_snapshots_distinct
        CHECK (source_snapshot_id <> matched_source_snapshot_id),
    ADD CONSTRAINT chk_plagiarism_score_range
        CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0),
    ADD CONSTRAINT chk_plagiarism_thresholds
        CHECK (
            review_threshold >= 0.0
            AND review_threshold <= 1.0
            AND reject_threshold >= 0.0
            AND reject_threshold <= 1.0
            AND review_threshold < reject_threshold
        ),
    ADD CONSTRAINT uq_plagiarism_embedding_pair
        UNIQUE (code_embedding_id, matched_code_embedding_id);

CREATE INDEX idx_plagiarism_source_snapshot
    ON public.plagiarism_flags (source_snapshot_id);

CREATE INDEX idx_plagiarism_matched_source_snapshot
    ON public.plagiarism_flags (matched_source_snapshot_id);

CREATE INDEX idx_plagiarism_code_embedding
    ON public.plagiarism_flags (code_embedding_id);

CREATE INDEX idx_plagiarism_matched_code_embedding
    ON public.plagiarism_flags (matched_code_embedding_id);

COMMENT ON COLUMN public.code_embeddings.source_snapshot_id IS
    'Immutable source snapshot from which this embedding was generated';
COMMENT ON COLUMN public.code_embeddings.model_name IS
    'Embedding model identifier, for example microsoft/codebert-base';
COMMENT ON COLUMN public.code_embeddings.model_version IS
    'Pinned model revision/version used to generate this vector';
COMMENT ON COLUMN public.plagiarism_flags.review_threshold IS
    'Similarity threshold used to create a REVIEW flag in this run';
COMMENT ON COLUMN public.plagiarism_flags.reject_threshold IS
    'Similarity threshold used to recommend REJECT in this run';
