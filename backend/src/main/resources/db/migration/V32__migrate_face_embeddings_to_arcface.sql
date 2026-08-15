-- ArcFace buffalo_l produces normalized 512-dimensional vectors.
-- Keep embedding_128/face_embedding temporarily so existing dlib data remains auditable;
-- users with legacy vectors must perform the new liveness enrollment once.

ALTER TABLE public.embeddings
    DROP CONSTRAINT IF EXISTS chk_embeddings_vector_matches_type;

ALTER TABLE public.embeddings
    ADD CONSTRAINT chk_embeddings_vector_matches_type CHECK (
        (type = 'face' AND (
            (embedding_128 IS NOT NULL AND embedding_512 IS NULL)
            OR (embedding_128 IS NULL AND embedding_512 IS NOT NULL)
        ))
        OR (type IN ('kyc_front', 'kyc_back')
            AND embedding_512 IS NOT NULL AND embedding_128 IS NULL)
    );

ALTER TABLE public.banned_identities
    ADD COLUMN IF NOT EXISTS face_embedding_512 public.vector(512);

CREATE INDEX IF NOT EXISTS idx_banned_face_512
    ON public.banned_identities
    USING ivfflat (face_embedding_512 public.vector_cosine_ops)
    WITH (lists='100');

COMMENT ON COLUMN public.embeddings.embedding_128
    IS 'Legacy dlib face embedding; retained only for audit/migration.';
COMMENT ON COLUMN public.embeddings.embedding_512
    IS 'ArcFace vector for type=face; CLIP vector for KYC image types.';
COMMENT ON COLUMN public.banned_identities.face_embedding_512
    IS 'Normalized ArcFace blacklist embedding compared with cosine distance.';
