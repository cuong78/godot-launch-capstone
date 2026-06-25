-- ============================================================
--  V32: ai_review_reports — báo cáo AI review multimodal (ĐỀ XUẤT cho admin)
-- ============================================================
--  AI đánh giá source code + media (frame video + ảnh) → tạo report.
--  AI KHÔNG quyết định cuối — admin xem điểm + flags + bằng chứng rồi quyết định.
--  Bảng ai_reports cũ (V1, gắn game_version_id, thiên định giá) KHÔNG tái dùng.
-- ============================================================

CREATE TABLE ai_review_reports (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- gắn 1 trong 2 (game HOẶC marketplace item)
    game_id                  UUID REFERENCES games(id) ON DELETE CASCADE,
    marketplace_item_id      UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,

    -- điểm từng tiêu chí (0-100, NULL = module skip/lỗi)
    code_quality_score       INT,
    media_match_score        INT,
    description_match_score  INT,
    nsfw_flag                BOOLEAN NOT NULL DEFAULT FALSE,

    overall_recommendation   VARCHAR(20) NOT NULL DEFAULT 'review',  -- approve | review | reject
    flags                    JSONB,    -- [{type, severity, detail, evidenceIndex?}]
    raw_output               JSONB,    -- output thô từng module python (debug/admin)

    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_ai_review_target CHECK (
        game_id IS NOT NULL OR marketplace_item_id IS NOT NULL
    )
);

CREATE INDEX idx_ai_review_game        ON ai_review_reports(game_id);
CREATE INDEX idx_ai_review_item        ON ai_review_reports(marketplace_item_id);
CREATE INDEX idx_ai_review_created     ON ai_review_reports(created_at DESC);

COMMENT ON TABLE  ai_review_reports IS 'AI review multimodal — ĐỀ XUẤT cho admin, không phải phán quyết';
COMMENT ON COLUMN ai_review_reports.overall_recommendation IS 'approve|review|reject — chỉ gợi ý, admin quyết định cuối';
COMMENT ON COLUMN ai_review_reports.flags IS 'JSONB list cảnh báo + bằng chứng (NSFW index, secret, mismatch)';
