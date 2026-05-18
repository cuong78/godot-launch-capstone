-- ============================================================
--  GodotLaunch — Physical Data Model (PostgreSQL 15+)
--  Version 2.0 | 2025-05-14  |  22 BANG
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
--  ENUM TYPES
-- ============================================================

CREATE TYPE publishing_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing',
    'community_download'
);

CREATE TYPE game_status_enum AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'published'
);

CREATE TYPE security_status_enum  AS ENUM ('clean', 'suspicious', 'malware');
CREATE TYPE ai_rec_enum           AS ENUM ('approve', 'marketplace', 'reject');

CREATE TYPE contract_type_enum    AS ENUM ('full_acquisition', 'co_publishing');
CREATE TYPE contract_status_enum  AS ENUM ('pending', 'signed', 'expired', 'cancelled');

CREATE TYPE txn_type_enum AS ENUM (
    'game_purchase',
    'marketplace_purchase',
    'withdrawal',
    'revenue_share',
    'commission',
    'refund'
);
CREATE TYPE txn_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TYPE item_type_enum   AS ENUM ('game', 'asset');
CREATE TYPE item_status_enum AS ENUM ('active', 'sold', 'removed');

CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TYPE ext_platform_enum AS ENUM ('google_play', 'app_store');
CREATE TYPE ext_status_enum   AS ENUM ('pending', 'submitted', 'live', 'rejected', 'removed');

CREATE TYPE notif_type_enum AS ENUM (
    'game_submitted', 'game_approved', 'game_rejected', 'game_published',
    'contract_ready', 'payment_received', 'withdrawal_processed',
    'new_review', 'security_alert', 'system_message', 'new_chat_message'
);

CREATE TYPE audit_action_enum AS ENUM (
    'game_submitted', 'game_approved', 'game_rejected', 'game_published',
    'game_community_enabled', 'game_updated',
    'user_banned', 'user_unbanned', 'user_role_changed',
    'contract_created', 'contract_signed', 'contract_cancelled',
    'transaction_completed', 'transaction_failed',
    'withdrawal_approved', 'withdrawal_rejected',
    'marketplace_item_removed', 'review_removed', 'chat_removed',
    'ai_report_generated', 'security_alert'
);

CREATE TYPE audit_target_enum AS ENUM (
    'user', 'game', 'game_version', 'contract', 'transaction',
    'wallet', 'marketplace_item', 'review', 'ai_report',
    'withdrawal_request', 'external_publish', 'notification',
    'game_purchase', 'community_chat'
);

CREATE TYPE actor_role_enum AS ENUM ('developer', 'player', 'admin', 'system');


-- ============================================================
--  TABLE 01: roles
-- ============================================================
CREATE TABLE roles (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Du lieu mac dinh
INSERT INTO roles (name, description) VALUES
    ('admin',     'Quan tri vien nen tang — toan quyen'),
    ('developer', 'Nha phat trien — dang va quan ly game'),
    ('player',    'Nguoi choi — mua va choi game tren community');

COMMENT ON TABLE roles IS 'Bang role tach khoi enum: de them role moi ma khong can ALTER TYPE';


-- ============================================================
--  TABLE 02: users
-- ============================================================
CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID          NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email         CITEXT        NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(150)  NOT NULL,
    avatar_url    TEXT,
    status        VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'banned')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status  ON users(status);

COMMENT ON TABLE  users            IS 'Nguoi dung: role_id FK den bang roles';
COMMENT ON COLUMN users.role_id    IS 'FK den roles.id — thay the user_role_enum';
COMMENT ON COLUMN users.email      IS 'CITEXT: khong phan biet hoa/thuong';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash, cost >= 12';


-- ============================================================
--  TABLE 03: categories
-- ============================================================
CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug      ON categories(slug);

-- Du lieu mac dinh
INSERT INTO categories (name, slug) VALUES
    ('Action',    'action'),
    ('Puzzle',    'puzzle'),
    ('RPG',       'rpg'),
    ('Platformer','platformer'),
    ('Simulation','simulation'),
    ('Strategy',  'strategy'),
    ('Casual',    'casual');

COMMENT ON TABLE  categories           IS 'Danh muc game, ho tro cha-con qua parent_id';
COMMENT ON COLUMN categories.slug      IS 'URL-friendly, vd: action-rpg';
COMMENT ON COLUMN categories.parent_id IS 'NULL = top-level category';


-- ============================================================
--  TABLE 04: tags
-- ============================================================
CREATE TABLE tags (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);

COMMENT ON TABLE tags IS 'Tag game: nhieu-nhieu voi games qua bang game_tags';


-- ============================================================
--  TABLE 05: games
-- ============================================================
CREATE TABLE games (
    id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id         UUID                 REFERENCES categories(id) ON DELETE SET NULL,
    title               VARCHAR(200)         NOT NULL,
    description         TEXT,
    thumbnail_url       TEXT,
    file_url            TEXT,
    status              game_status_enum     NOT NULL DEFAULT 'draft',
    publishing_type     publishing_type_enum,

    price_proposed      NUMERIC(15,2)        CHECK (price_proposed >= 0),
    download_price      NUMERIC(15,2)        CHECK (download_price >= 0),
    community_available BOOLEAN              NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_community_price CHECK (
        publishing_type != 'community_download'
        OR (publishing_type = 'community_download' AND download_price IS NOT NULL)
    )
);

CREATE INDEX idx_games_creator_id         ON games(creator_id);
CREATE INDEX idx_games_category_id        ON games(category_id);
CREATE INDEX idx_games_status             ON games(status);
CREATE INDEX idx_games_publishing_type    ON games(publishing_type);
CREATE INDEX idx_games_community_available ON games(community_available)
    WHERE community_available = TRUE;

COMMENT ON TABLE  games                      IS 'Game tren nen tang GodotLaunch';
COMMENT ON COLUMN games.download_price       IS 'Gia moi luot tai — dung cho community_download va full_acq/community';
COMMENT ON COLUMN games.community_available  IS 'TRUE = hien thi o community store de mua choi';
COMMENT ON COLUMN games.price_proposed       IS 'Gia de xuat khi ban dut hoac chia %';


-- ============================================================
--  TABLE 06: game_tags
-- ============================================================
CREATE TABLE game_tags (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (game_id, tag_id)
);

CREATE INDEX idx_game_tags_tag_id ON game_tags(tag_id);

COMMENT ON TABLE game_tags IS 'Nhieu-nhieu: 1 game co nhieu tag, 1 tag thuoc nhieu game';


-- ============================================================
--  TABLE 07: game_versions
-- ============================================================
CREATE TABLE game_versions (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id        UUID         NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    version_number VARCHAR(50)  NOT NULL,
    changelog      TEXT,
    file_url       TEXT         NOT NULL,
    is_current     BOOLEAN      NOT NULL DEFAULT FALSE,
    released_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_game_version UNIQUE (game_id, version_number)
);

CREATE INDEX idx_game_versions_game_id    ON game_versions(game_id);
CREATE INDEX idx_game_versions_is_current ON game_versions(game_id, is_current)
    WHERE is_current = TRUE;

COMMENT ON TABLE game_versions IS 'Lich su phien ban game — 1 phien ban la current tai 1 thoi diem';


-- ============================================================
--  TABLE 08: ai_reports
-- ============================================================
CREATE TABLE ai_reports (
    id                      UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id                 UUID                 NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE,
    quality_score           SMALLINT             CHECK (quality_score BETWEEN 0 AND 100),
    originality_score       SMALLINT             CHECK (originality_score BETWEEN 0 AND 100),
    security_status         security_status_enum NOT NULL DEFAULT 'clean',
    trend_score             SMALLINT             CHECK (trend_score BETWEEN 0 AND 100),
    recommendation          ai_rec_enum          NOT NULL,
    suggested_price         NUMERIC(15,2)        CHECK (suggested_price >= 0),
    suggested_revenue_split SMALLINT             CHECK (suggested_revenue_split BETWEEN 0 AND 100),
    raw_result              JSONB,
    created_at              TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_reports_recommendation  ON ai_reports(recommendation);
CREATE INDEX idx_ai_reports_security_status ON ai_reports(security_status);

COMMENT ON TABLE ai_reports IS '1 game co dung 1 bao cao AI (UNIQUE game_id)';


-- ============================================================
--  TABLE 09: contracts
-- ============================================================
CREATE TABLE contracts (
    id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id          UUID                 NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
    seller_id        UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    buyer_id         UUID                 REFERENCES users(id) ON DELETE RESTRICT,
    contract_type    contract_type_enum   NOT NULL,
    terms_hash       VARCHAR(64)          NOT NULL,
    pdf_url          TEXT                 NOT NULL,
    status           contract_status_enum NOT NULL DEFAULT 'pending',
    revenue_split    SMALLINT             CHECK (revenue_split BETWEEN 0 AND 100),
    signed_at_seller TIMESTAMPTZ,
    signed_at_buyer  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_game_id   ON contracts(game_id);
CREATE INDEX idx_contracts_seller_id ON contracts(seller_id);
CREATE INDEX idx_contracts_buyer_id  ON contracts(buyer_id);
CREATE INDEX idx_contracts_status    ON contracts(status);

COMMENT ON TABLE  contracts             IS 'Hop dong phap ly — CHI cho full_acquisition va co_publishing';
COMMENT ON COLUMN contracts.buyer_id    IS 'NULL = platform mua dut';
COMMENT ON COLUMN contracts.revenue_split IS '% cho developer (chi co_publishing)';


-- ============================================================
--  TABLE 10: wallets
-- ============================================================
CREATE TABLE wallets (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    balance    NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    currency   CHAR(3)       NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wallets IS '1 user co 1 wallet (UNIQUE user_id)';


-- ============================================================
--  TABLE 11: transactions
-- ============================================================
CREATE TABLE transactions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id           UUID            NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    related_user_id     UUID            REFERENCES users(id) ON DELETE SET NULL,
    game_id             UUID            REFERENCES games(id) ON DELETE SET NULL,
    amount              NUMERIC(15,2)   NOT NULL CHECK (amount > 0),
    platform_commission NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (platform_commission >= 0),
    net_amount          NUMERIC(15,2)   NOT NULL CHECK (net_amount >= 0),
    type                txn_type_enum   NOT NULL,
    status              txn_status_enum NOT NULL DEFAULT 'pending',
    reference_id        VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_txn_net CHECK (net_amount = amount - platform_commission)
);

CREATE INDEX idx_transactions_wallet_id   ON transactions(wallet_id);
CREATE INDEX idx_transactions_type        ON transactions(type);
CREATE INDEX idx_transactions_status      ON transactions(status);
CREATE INDEX idx_transactions_created_at  ON transactions(created_at DESC);

COMMENT ON TABLE transactions IS 'Moi giao dich tai chinh. net_amount = amount - commission (CHECK)';


-- ============================================================
--  TABLE 12: marketplace_items
-- ============================================================
CREATE TABLE marketplace_items (
    id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id   UUID             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID             REFERENCES categories(id) ON DELETE SET NULL,
    item_type   item_type_enum   NOT NULL,
    title       VARCHAR(200)     NOT NULL,
    description TEXT,
    price       NUMERIC(15,2)    NOT NULL CHECK (price >= 0),
    file_url    TEXT             NOT NULL,
    preview_url TEXT,
    status      item_status_enum NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_seller_id  ON marketplace_items(seller_id);
CREATE INDEX idx_marketplace_category   ON marketplace_items(category_id);
CREATE INDEX idx_marketplace_item_type  ON marketplace_items(item_type);
CREATE INDEX idx_marketplace_status     ON marketplace_items(status);

COMMENT ON TABLE marketplace_items IS 'San pham P2P: game source hoac asset (sprite, sound, UI pack)';


-- ============================================================
--  TABLE 13: game_purchases
-- ============================================================
CREATE TABLE game_purchases (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    game_id        UUID          NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
    transaction_id UUID          NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    price_paid     NUMERIC(15,2) NOT NULL CHECK (price_paid >= 0),
    purchased_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_game_purchase UNIQUE (buyer_id, game_id)
);

CREATE INDEX idx_game_purchases_buyer_id ON game_purchases(buyer_id);
CREATE INDEX idx_game_purchases_game_id  ON game_purchases(game_id);

COMMENT ON TABLE  game_purchases IS 'User mua game de CHOI — khong co quyen lay source hoac ban lai';
COMMENT ON COLUMN game_purchases.price_paid IS 'Gia thuc te thanh toan luc mua';


-- ============================================================
--  TABLE 14: withdrawal_requests
-- ============================================================
CREATE TABLE withdrawal_requests (
    id              UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                   NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    wallet_id       UUID                   NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount          NUMERIC(15,2)          NOT NULL CHECK (amount > 0),
    currency        CHAR(3)                NOT NULL DEFAULT 'USD',
    bank_name       VARCHAR(200)           NOT NULL,
    bank_account    VARCHAR(100)           NOT NULL,
    account_holder  VARCHAR(200)           NOT NULL,
    status          withdrawal_status_enum NOT NULL DEFAULT 'pending',
    reviewed_by     UUID                   REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    transaction_id  UUID                   REFERENCES transactions(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawal_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status  ON withdrawal_requests(status);

COMMENT ON TABLE  withdrawal_requests            IS 'Admin duyet thu cong truoc khi xu ly rut tien';
COMMENT ON COLUMN withdrawal_requests.bank_account IS 'Ma hoa o tang application truoc khi luu';


-- ============================================================
--  TABLE 15: reviews
-- ============================================================
CREATE TABLE reviews (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purchase_id             UUID        REFERENCES game_purchases(id) ON DELETE SET NULL,
    reviewed_game_id        UUID        REFERENCES games(id) ON DELETE CASCADE,
    reviewed_marketplace_id UUID        REFERENCES marketplace_items(id) ON DELETE CASCADE,
    rating                  SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment                 TEXT,
    is_approved             BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_review_one_target CHECK (
        (reviewed_game_id IS NOT NULL AND reviewed_marketplace_id IS NULL)
        OR
        (reviewed_game_id IS NULL AND reviewed_marketplace_id IS NOT NULL)
    ),

    CONSTRAINT chk_game_review_needs_purchase CHECK (
        reviewed_game_id IS NULL OR purchase_id IS NOT NULL
    ),

    CONSTRAINT uq_review_game        UNIQUE (user_id, reviewed_game_id),
    CONSTRAINT uq_review_marketplace UNIQUE (user_id, reviewed_marketplace_id)
);

CREATE INDEX idx_reviews_user_id               ON reviews(user_id);
CREATE INDEX idx_reviews_reviewed_game_id      ON reviews(reviewed_game_id);
CREATE INDEX idx_reviews_reviewed_marketplace  ON reviews(reviewed_marketplace_id);
CREATE INDEX idx_reviews_purchase_id           ON reviews(purchase_id);
CREATE INDEX idx_reviews_rating                ON reviews(rating);

COMMENT ON TABLE  reviews IS 'Game review: bat buoc co purchase_id (verified buyer). Marketplace review: kiem tra o app level.';
COMMENT ON COLUMN reviews.purchase_id IS 'FK den game_purchases — chung minh da mua game truoc khi review';


-- ============================================================
--  TABLE 16: cart_items
-- ============================================================
CREATE TABLE cart_items (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id             UUID        REFERENCES games(id) ON DELETE CASCADE,
    marketplace_item_id UUID        REFERENCES marketplace_items(id) ON DELETE CASCADE,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_cart_one_target CHECK (
        (game_id IS NOT NULL AND marketplace_item_id IS NULL)
        OR
        (game_id IS NULL AND marketplace_item_id IS NOT NULL)
    ),

    CONSTRAINT uq_cart_game        UNIQUE (user_id, game_id),
    CONSTRAINT uq_cart_marketplace UNIQUE (user_id, marketplace_item_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

COMMENT ON TABLE  cart_items IS 'Gio hang: game (community_download) hoac marketplace item';
COMMENT ON COLUMN cart_items.game_id IS 'Chi game co community_available = TRUE moi them vao gio duoc (enforce o app level)';


-- ============================================================
--  TABLE 17: favorites
-- ============================================================
CREATE TABLE favorites (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id    UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

CREATE INDEX idx_favorites_game_id ON favorites(game_id);

COMMENT ON TABLE favorites IS 'Danh sach game yeu thich / wishlist cua user';


-- ============================================================
--  TABLE 18: community_chats
-- ============================================================
CREATE TABLE community_chats (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id           UUID        REFERENCES games(id) ON DELETE CASCADE,
    parent_message_id UUID        REFERENCES community_chats(id) ON DELETE CASCADE,
    message           TEXT        NOT NULL
                      CHECK (LENGTH(TRIM(message)) > 0 AND LENGTH(message) <= 2000),
    is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_chats_sender_id         ON community_chats(sender_id);
CREATE INDEX idx_community_chats_game_id           ON community_chats(game_id);
CREATE INDEX idx_community_chats_parent_message_id ON community_chats(parent_message_id);
CREATE INDEX idx_community_chats_created_at        ON community_chats(created_at DESC);

CREATE INDEX idx_community_chats_active ON community_chats(game_id, created_at DESC)
    WHERE is_deleted = FALSE;

COMMENT ON TABLE  community_chats                  IS 'Chat cong dong: global hoac theo game. Ho tro reply thread.';
COMMENT ON COLUMN community_chats.game_id          IS 'NULL = global chat | NOT NULL = discussion theo game';
COMMENT ON COLUMN community_chats.parent_message_id IS 'NULL = tin nhan goc | NOT NULL = reply';
COMMENT ON COLUMN community_chats.is_deleted       IS 'Soft delete: admin xem duoc noi dung, user thay [da xoa]';


-- ============================================================
--  TABLE 19: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID               REFERENCES users(id) ON DELETE SET NULL,
    actor_role  actor_role_enum    NOT NULL,
    action      audit_action_enum  NOT NULL,
    target_type audit_target_enum  NOT NULL,
    target_id   UUID               NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    note        TEXT,
    ip_address  INET,
    created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX idx_audit_logs_target     ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

COMMENT ON TABLE audit_logs IS 'IMMUTABLE — REVOKE UPDATE/DELETE. actor_id NULL = AI/system tu dong.';


-- ============================================================
--  TABLE 20: notifications
-- ============================================================
CREATE TABLE notifications (
    id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         notif_type_enum NOT NULL,
    title        VARCHAR(200)    NOT NULL,
    message      TEXT            NOT NULL,
    is_read      BOOLEAN         NOT NULL DEFAULT FALSE,
    related_id   UUID,
    related_type VARCHAR(50),
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;

COMMENT ON TABLE notifications IS 'Thong bao in-app. Email gui qua service ngoai (SendGrid/SES).';


-- ============================================================
--  TABLE 21: publishing_guides
-- ============================================================
CREATE TABLE publishing_guides (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    step_order   SMALLINT     NOT NULL UNIQUE CHECK (step_order > 0),
    title        VARCHAR(200) NOT NULL,
    description  TEXT         NOT NULL,
    tip          TEXT,
    video_url    TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by   UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publishing_guides_active ON publishing_guides(step_order)
    WHERE is_active = TRUE;

COMMENT ON TABLE publishing_guides IS 'Noi dung tung buoc Publishing Wizard — admin tao va chinh sua';


-- ============================================================
--  TABLE 22: external_publishes
-- ============================================================
CREATE TABLE external_publishes (
    id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id         UUID              NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
    platform        ext_platform_enum NOT NULL,
    status          ext_status_enum   NOT NULL DEFAULT 'pending',
    external_app_id VARCHAR(200),
    store_url       TEXT,
    submitted_at    TIMESTAMPTZ,
    live_at         TIMESTAMPTZ,
    rejected_reason TEXT,
    submitted_by    UUID              NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_game_platform UNIQUE (game_id, platform)
);

CREATE INDEX idx_ext_publishes_game_id  ON external_publishes(game_id);
CREATE INDEX idx_ext_publishes_platform ON external_publishes(platform);
CREATE INDEX idx_ext_publishes_status   ON external_publishes(status);

COMMENT ON TABLE external_publishes IS 'Theo doi ket qua submit game len Google Play / App Store';
