-- ============================================================
--  V23 — disputes: tranh chấp bản quyền source
--  B (reporter) tố A (người bán/seller) đánh cắp source.
--  Workflow: open → investigating → resolved (theo cây quyết định TH1/2/3).
-- ============================================================

CREATE TABLE disputes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- B = người báo cáo
    reporter_id         UUID NOT NULL REFERENCES users(id),
    -- A = người bị tố (seller)
    reported_seller_id  UUID NOT NULL REFERENCES users(id),

    -- sản phẩm bị tố (game HOẶC marketplace item)
    game_id             UUID REFERENCES games(id) ON DELETE SET NULL,
    marketplace_item_id UUID REFERENCES marketplace_items(id) ON DELETE SET NULL,

    reason              TEXT NOT NULL,                    -- lý do tố
    evidence_repo_url   TEXT,                             -- repo B cung cấp làm bằng chứng
    evidence_note       TEXT,                             -- ghi chú bằng chứng thêm

    status              VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'investigating', 'resolved_seller_fault',
                          'resolved_reporter_fault', 'resolved_inconclusive', 'cancelled')),

    resolution_note     TEXT,                             -- admin ghi kết luận
    refund_amount       NUMERIC(15,2),                    -- số tiền A phải hoàn (TH3)
    refund_deadline     TIMESTAMPTZ,                      -- hạn 5 ngày hoàn trả
    resolved_by         UUID REFERENCES users(id),        -- admin xử lý
    resolved_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dispute_target CHECK (
        game_id IS NOT NULL OR marketplace_item_id IS NOT NULL
    )
);

CREATE INDEX idx_disputes_reporter  ON disputes(reporter_id);
CREATE INDEX idx_disputes_seller    ON disputes(reported_seller_id);
CREATE INDEX idx_disputes_status    ON disputes(status);

COMMENT ON TABLE disputes IS 'Tranh chấp bản quyền source: B tố A đánh cắp. Admin phán xử theo cây quyết định.';
