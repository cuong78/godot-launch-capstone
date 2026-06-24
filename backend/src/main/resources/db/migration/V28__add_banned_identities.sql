-- ============================================================
--  V24 — banned_identities: blacklist đa tầng chống đăng ký lại
--  Khi ban (đạo nhái / spam report): lưu face + CCCD + bank để chặn
--  tạo tài khoản mới hoặc thêm bank account mới.
--  pgvector extension đã được tạo ở V16.
-- ============================================================

CREATE TABLE banned_identities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,  -- tài khoản gốc bị ban
    face_embedding  vector(128),                  -- FaceID (Tier 1) — chặn đăng ký lại
    kyc_id_number   TEXT,                          -- số CCCD/passport (đã encrypt)
    bank_account    TEXT,                          -- số tài khoản ngân hàng (đã encrypt)
    reason          VARCHAR(50) NOT NULL,          -- 'copyright_theft' | 'spam_report' | ...
    note            TEXT,
    banned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index cho face similarity search khi đăng ký lại
CREATE INDEX idx_banned_face ON banned_identities
    USING ivfflat (face_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_banned_kyc  ON banned_identities(kyc_id_number);
CREATE INDEX idx_banned_bank ON banned_identities(bank_account);

COMMENT ON TABLE banned_identities IS 'Blacklist đa tầng: face + CCCD + bank — chặn user bị ban đăng ký/thêm bank lại.';
