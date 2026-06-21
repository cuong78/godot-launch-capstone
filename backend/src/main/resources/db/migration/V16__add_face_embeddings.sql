CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE face_embeddings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding   vector(128) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON face_embeddings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
