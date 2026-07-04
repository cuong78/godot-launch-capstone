-- Lịch sử commit theo game — ghi rẻ mọi lần push (chỉ commitSha + timestamp).
-- codeSnapshotUrl/AI fields chỉ được điền lazy khi có Dispute (xem SourceCommit.java).
CREATE TABLE public.source_commits (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL,
    commit_sha character varying(40) NOT NULL,
    commit_pushed_at timestamp with time zone,
    code_snapshot_url text,
    context_match_status character varying(20) DEFAULT 'pending' NOT NULL,
    ai_note text,
    ai_evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_source_commits_game FOREIGN KEY (game_id)
        REFERENCES public.games(id) ON DELETE CASCADE
);

CREATE INDEX idx_source_commits_game_id ON public.source_commits USING btree (game_id);
