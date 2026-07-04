-- Module 5 của AI Review: phát hiện đạo văn chủ động (so sánh chéo với toàn
-- bộ kho, khác 4 tiêu chí AI review hiện có vốn chỉ kiểm tra nội tại 1 sản
-- phẩm). Xem docs/plagiarism-detection-plan.md.

CREATE TABLE public.code_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL,
    embedding public.vector(768) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_code_embeddings_game FOREIGN KEY (game_id)
        REFERENCES public.games(id) ON DELETE CASCADE
);

CREATE INDEX idx_code_embeddings_game_id ON public.code_embeddings USING btree (game_id);
CREATE INDEX idx_code_embeddings_vector ON public.code_embeddings
    USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');

CREATE TABLE public.plagiarism_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL,
    matched_game_id uuid NOT NULL,
    similarity_score real NOT NULL,
    severity character varying(20) NOT NULL,
    reviewed_by_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_plagiarism_flags_game FOREIGN KEY (game_id)
        REFERENCES public.games(id) ON DELETE CASCADE,
    CONSTRAINT fk_plagiarism_flags_matched_game FOREIGN KEY (matched_game_id)
        REFERENCES public.games(id) ON DELETE CASCADE,
    CONSTRAINT chk_plagiarism_flags_distinct CHECK (game_id <> matched_game_id)
);

CREATE INDEX idx_plagiarism_flags_game_id ON public.plagiarism_flags USING btree (game_id);
CREATE INDEX idx_plagiarism_flags_matched_game_id ON public.plagiarism_flags USING btree (matched_game_id);
