-- ============================================================
--  GodotLaunch — Physical Data Model (PostgreSQL 15+)
--  Version 7.0 | 2025-05-14  |  26 BANG
-- ============================================================


--  CONVENTION:
--    Ten bang : so nhieu, snake_case
--    PK       : UUID DEFAULT gen_random_uuid()
--    Tien     : NUMERIC(15,2)
--    Timestamp: TIMESTAMPTZ
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";


-- ============================================================
--  ENUM TYPES
-- ============================================================

-- publishing_type: cap nhat v6.0
-- community_download → marketplace_listing (ban source code cho developer khac)
CREATE TYPE publishing_type_enum AS ENUM (
    'full_acquisition',    -- ban dut toan bo quyen cho platform → publish len store ngoai
    'co_publishing',       -- chia % doanh thu voi platform → publish len store ngoai
    'marketplace_listing'  -- dang source code len marketplace noi bo, ban cho developer khac
);

CREATE TYPE game_status_enum AS ENUM (
    'draft',       -- dang soan, chua nop
    'pending',     -- cho AI + admin duyet
    'approved',    -- da duyet, cho publish
    'rejected',    -- bi tu choi
    'published'    -- da phat hanh
);

CREATE TYPE security_status_enum  AS ENUM ('clean', 'suspicious', 'malware');
CREATE TYPE ai_rec_enum           AS ENUM ('approve', 'marketplace', 'reject');

CREATE TYPE contract_type_enum    AS ENUM ('full_acquisition', 'co_publishing');
-- community_download KHONG tao contract
CREATE TYPE contract_status_enum  AS ENUM ('pending', 'signed', 'expired', 'cancelled');

CREATE TYPE txn_type_enum AS ENUM (
    'source_code_purchase', -- mua source code / asset tren marketplace
    'withdrawal',           -- rut tien ve ngan hang
    'revenue_share',        -- chia doanh thu co_publishing
    'commission',           -- hoa hong platform tren marketplace
    'refund'                -- hoan tien
);
CREATE TYPE txn_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- order_type: v6.0 — chi con 1 loai don hang tren platform
CREATE TYPE order_type_enum AS ENUM (
    'source_code_purchase'  -- mua source code (game Godot project) hoac asset tren marketplace
);

CREATE TYPE item_type_enum   AS ENUM ('source_code', 'asset');
-- source_code : toan bo Godot project (file .tscn, .gd, assets...)
-- asset       : tai nguyen le (sprite, sound, UI pack, script...)
CREATE TYPE item_status_enum AS ENUM ('active', 'removed');
-- 'sold' khong hop ly voi source code — co the ban cho nhieu nguoi

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
    'source_code_purchase', 'community_chat'
);

CREATE TYPE actor_role_enum AS ENUM ('developer', 'player', 'admin', 'system');


-- ============================================================
--  TABLE 01: roles  [MOI v2.0]
--  Tach role ra khoi enum de quan tri linh hoat hon
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
--  TABLE 02: users  [CAP NHAT v7.0 — them GitHub OAuth]
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

    -- GitHub OAuth — bat buoc de ban source code tren Marketplace
    -- NULL = chua lien ket, chi duoc mua/xem, chua duoc ban source
                       github_id          VARCHAR(50)   UNIQUE,
                       github_username    VARCHAR(100),
                       github_token_enc   TEXT,
    -- encrypted OAuth access token (AES-256 o tang application)
    -- dung de verify repo ownership khi upload
                       github_linked_at   TIMESTAMPTZ,

                       created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                       updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Neu co github_id thi phai co day du cac truong GitHub
                       CONSTRAINT chk_github_fields CHECK (
                           github_id IS NULL
                               OR (github_id IS NOT NULL
                               AND github_username IS NOT NULL
                               AND github_token_enc IS NOT NULL
                               AND github_linked_at IS NOT NULL)
                           )
);

CREATE INDEX idx_users_role_id      ON users(role_id);
CREATE INDEX idx_users_status       ON users(status);
CREATE INDEX idx_users_github_id    ON users(github_id) WHERE github_id IS NOT NULL;

COMMENT ON TABLE  users                  IS 'Nguoi dung. GitHub OAuth bat buoc de ban source code.';
COMMENT ON COLUMN users.role_id          IS 'FK den roles.id';
COMMENT ON COLUMN users.email            IS 'CITEXT: khong phan biet hoa/thuong';
COMMENT ON COLUMN users.password_hash    IS 'bcrypt hash, cost >= 12';
COMMENT ON COLUMN users.github_id        IS 'GitHub user ID — NULL = chua lien ket, khong duoc ban source';
COMMENT ON COLUMN users.github_token_enc IS 'AES-256 encrypted OAuth token — giai ma o tang application khi can verify repo';


-- ============================================================
--  TABLE 03: categories  [MOI v2.0]
--  Ho tro category cha-con: vd Action > RPG > Turn-based
-- ============================================================
parent_id IS 'NULL = top-level category';


-- ============================================================
--  TABLE 04: tags  [MOI v2.0]
-- ============================================================
CREATE TABLE tags (
                      id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                      name       VARCHAR(100) NOT NULL UNIQUE,
                      slug       VARCHAR(100) NOT NULL UNIQUE,
                      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
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
COMMENT ON COLUMN categories.
CREATE INDEX idx_tags_slug ON tags(slug);

COMMENT ON TABLE tags IS 'Tag game: nhieu-nhieu voi games qua bang game_tags';


-- ============================================================
--  TABLE 05: games  [CAP NHAT v6.0]
--  + category_id FK, bo tags[]
--  + is_source_listed (doi ten tu community_available)
--  + xoa download_price (gia nam o marketplace_items)
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

    -- Gia de xuat khi ban dut / chia % (full_acquisition hoac co_publishing)
    -- Gia source code tren marketplace nam o marketplace_items.price, KHONG o day
                       price_proposed      NUMERIC(15,2)        CHECK (price_proposed >= 0),

    -- Cached counter: tong luot tai source code (source_downloads)
    -- + aggregate tu store ngoai (store_download_stats)
    -- Cap nhat qua trigger + cron job. Tranh COUNT(*) moi lan hien thi.
                       download_count      INTEGER              NOT NULL DEFAULT 0 CHECK (download_count >= 0),

    -- TRUE = source code cua game nay dang duoc ban tren Marketplace
    -- Duoc set khi developer tao marketplace_items record tuong ung
                       is_source_listed    BOOLEAN              NOT NULL DEFAULT FALSE,

                       created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
                       updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_games_creator_id      ON games(creator_id);
CREATE INDEX idx_games_category_id     ON games(category_id);
CREATE INDEX idx_games_status          ON games(status);
CREATE INDEX idx_games_publishing_type ON games(publishing_type);
CREATE INDEX idx_games_source_listed   ON games(is_source_listed)
    WHERE is_source_listed = TRUE;

COMMENT ON TABLE  games                    IS 'Game tren nen tang GodotLaunch';
COMMENT ON COLUMN games.price_proposed     IS 'Gia de xuat cho full_acquisition / co_publishing. Gia marketplace nam o marketplace_items.price';
COMMENT ON COLUMN games.download_count     IS 'Cached tong luot tai source code — cap nhat qua trigger + cron, tranh COUNT(*)';
COMMENT ON COLUMN games.is_source_listed   IS 'TRUE = dang co marketplace_items listing cho source code cua game nay';


-- ============================================================
--  TABLE 06: game_tags  [MOI v2.0]
--  Junction table: nhieu-nhieu giua games va tags
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
--  TABLE 08: ai_reports  [FIX v3.0]
--
-- ============================================================
CREATE TABLE ai_reports (
                            id                      UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
                            game_version_id         UUID                 NOT NULL UNIQUE
                                REFERENCES game_versions(id) ON DELETE CASCADE,
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

CREATE INDEX idx_ai_reports_game_version_id ON ai_reports(game_version_id);
CREATE INDEX idx_ai_reports_recommendation  ON ai_reports(recommendation);
CREATE INDEX idx_ai_reports_security_status ON ai_reports(security_status);

COMMENT ON TABLE  ai_reports                  IS 'Moi game_version co 1 bao cao AI (UNIQUE game_version_id)';
COMMENT ON COLUMN ai_reports.game_version_id  IS 'FK → game_versions, KHONG phai games — fix v3.0';


-- ============================================================
--  TABLE 09: contracts  [CAP NHAT v2.0]
--  Chi tao cho full_acquisition va co_publishing
--  community_download KHONG tao contract
-- ============================================================
CREATE TABLE contracts (
                           id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
                           game_id          UUID                 NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
                           seller_id        UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                           buyer_id         UUID                 REFERENCES users(id) ON DELETE RESTRICT,
    -- buyer_id NULL = platform mua dut (platform khong co user account)
                           contract_type    contract_type_enum   NOT NULL,
    -- Chi full_acquisition hoac co_publishing, KHONG co community_download
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
--  TABLE 12: marketplace_items  [CAP NHAT v8.0]
--  item_type: source_code | asset
--  GitHub proof: chi can repo_url + verified_at
--  (commit_hash bo: GitHub repo link da du chung minh quyen so huu)
-- ============================================================
CREATE TABLE marketplace_items (
                                   id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
                                   seller_id       UUID             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                                   category_id     UUID             REFERENCES categories(id) ON DELETE SET NULL,
                                   item_type       item_type_enum   NOT NULL,
    -- source_code : toan bo Godot project (.tscn, .gd, assets...)
    -- asset       : tai nguyen le (sprite, sound, UI pack, shader...)

                                   title           VARCHAR(200)     NOT NULL,
                                   description     TEXT,
                                   price           NUMERIC(15,2)    NOT NULL CHECK (price >= 0),
                                   file_url        TEXT             NOT NULL,
    -- Preview images quan ly qua bang media_files (nhieu anh)
    -- marketplace_items.preview_url da duoc xoa

    -- Phien ban Godot tuong thich — bat buoc voi source_code
                                   godot_version   VARCHAR(20),

    -- Neu la source_code cua 1 game tren Platform → tro ve games.id
    -- NULL = asset doc lap
                                   source_game_id  UUID             REFERENCES games(id) ON DELETE SET NULL,

    -- GitHub Ownership Proof — chi ap dung voi source_code
    -- Repo phai thuoc GitHub account da lien ket voi seller
    -- Fork bi reject o buoc verify API, truoc khi INSERT
                                   github_repo_url    TEXT,
                                   github_verified_at TIMESTAMPTZ,

                                   status          item_status_enum NOT NULL DEFAULT 'active',
                                   created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
                                   updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    -- godot_version bat buoc voi source_code
                                   CONSTRAINT chk_source_needs_godot_version CHECK (
                                       item_type != 'source_code' OR godot_version IS NOT NULL
),

    -- GitHub fields bat buoc voi source_code
    CONSTRAINT chk_source_needs_github CHECK (
        item_type != 'source_code'
        OR (github_repo_url IS NOT NULL AND github_verified_at IS NOT NULL)
    )
);

CREATE INDEX idx_marketplace_seller_id    ON marketplace_items(seller_id);
CREATE INDEX idx_marketplace_category     ON marketplace_items(category_id);
CREATE INDEX idx_marketplace_item_type    ON marketplace_items(item_type);
CREATE INDEX idx_marketplace_status       ON marketplace_items(status);
CREATE INDEX idx_marketplace_source_game  ON marketplace_items(source_game_id)
    WHERE source_game_id IS NOT NULL;
CREATE INDEX idx_marketplace_godot_ver    ON marketplace_items(godot_version)
    WHERE godot_version IS NOT NULL;
CREATE INDEX idx_marketplace_github_repo  ON marketplace_items(github_repo_url)
    WHERE github_repo_url IS NOT NULL;

COMMENT ON TABLE  marketplace_items                 IS 'Cho ban source code Godot (source_code) va asset le';
COMMENT ON COLUMN marketplace_items.item_type       IS 'source_code = Godot project day du | asset = tai nguyen le';
COMMENT ON COLUMN marketplace_items.godot_version   IS 'Phien ban Godot tuong thich — bat buoc voi source_code';
COMMENT ON COLUMN marketplace_items.source_game_id  IS 'FK → games neu ban source cua game tren Platform. NULL = doc lap';
COMMENT ON COLUMN marketplace_items.github_repo_url IS 'URL GitHub repo — bang chung so huu, bat buoc voi source_code';
COMMENT ON COLUMN marketplace_items.file_url        IS 'URL file ZIP: Godot project hoac asset pack';


-- ============================================================
--  TABLE 13: orders
-- ============================================================
CREATE TABLE orders (
                        id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
                        buyer_id            UUID             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                        order_type          order_type_enum  NOT NULL,
                        marketplace_item_id UUID             NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
                        transaction_id      UUID             NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
                        price_paid          NUMERIC(15,2)    NOT NULL CHECK (price_paid >= 0),
                        purchased_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    -- 1 user chi mua 1 marketplace item 1 lan
                        CONSTRAINT uq_order_marketplace UNIQUE (buyer_id, marketplace_item_id)
);

CREATE INDEX idx_orders_buyer_id            ON orders(buyer_id);
CREATE INDEX idx_orders_marketplace_item_id ON orders(marketplace_item_id);
CREATE INDEX idx_orders_transaction_id      ON orders(transaction_id);
CREATE INDEX idx_orders_purchased_at        ON orders(purchased_at DESC);

COMMENT ON TABLE  orders                     IS 'Don hang mua source code hoac asset tren Marketplace';
COMMENT ON COLUMN orders.marketplace_item_id IS 'NOT NULL: source code hoac asset duoc mua';
COMMENT ON COLUMN orders.price_paid          IS 'Gia thuc te thanh toan, co the khac gia niem yet neu co discount';


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
--  TABLE 15: reviews  [CAP NHAT v8.0]
--  Chi review marketplace_item (source_code hoac asset)
--  Loai bo reviewed_game_id: platform khong ban game de choi
-- ============================================================
CREATE TABLE reviews (
                         id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                         user_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                         order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                         marketplace_item_id     UUID        NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
                         rating                  SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
                         comment                 TEXT,
                         is_approved             BOOLEAN     NOT NULL DEFAULT TRUE,
                         created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 1 user chi review 1 lan cho moi san pham
                         CONSTRAINT uq_review_item UNIQUE (user_id, marketplace_item_id)
);

CREATE INDEX idx_reviews_user_id            ON reviews(user_id);
CREATE INDEX idx_reviews_order_id           ON reviews(order_id);
CREATE INDEX idx_reviews_marketplace_item   ON reviews(marketplace_item_id);
CREATE INDEX idx_reviews_rating             ON reviews(rating);

COMMENT ON TABLE  reviews                      IS 'Verified buyer review — chi sau khi mua (order_id bat buoc)';
COMMENT ON COLUMN reviews.order_id             IS 'FK → orders — xac nhan da mua truoc khi review';
COMMENT ON COLUMN reviews.marketplace_item_id  IS 'San pham duoc review (source_code hoac asset)';


-- ============================================================
--  TABLE 16: cart_items  [CAP NHAT v8.0]
--  Chi chua marketplace_item (source_code hoac asset)
-- ============================================================
CREATE TABLE cart_items (
                            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                            user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            marketplace_item_id UUID        NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
                            added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                            CONSTRAINT uq_cart_item UNIQUE (user_id, marketplace_item_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

COMMENT ON TABLE cart_items IS 'Gio hang: source code hoac asset tren Marketplace';


-- ============================================================
--  TABLE 17: favorites  [MOI v2.0]
--  Yeu thich game — luu danh sach game user quan tam
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
--  TABLE 18: community_chats  [MOI v2.0]
--  Chat cong dong — co the theo game cu the hoac kenh chung
--  Ho tro reply thread qua parent_message_id
-- ============================================================
CREATE TABLE community_chats (
                                 id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                 sender_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- NULL = global community chat
    -- NOT NULL = chat theo game cu the
                                 game_id           UUID        REFERENCES games(id) ON DELETE CASCADE,

    -- NULL = tin nhan goc
    -- NOT NULL = reply cho tin nhan cha
                                 parent_message_id UUID        REFERENCES community_chats(id) ON DELETE CASCADE,

                                 message           TEXT        NOT NULL
                                     CHECK (LENGTH(TRIM(message)) > 0 AND LENGTH(message) <= 2000),

    -- Soft delete: giu noi dung de admin kiem tra
    -- User thay "[Tin nhan da bi xoa]", admin thay noi dung goc
                                 is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,

                                 created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                 updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_chats_sender_id         ON community_chats(sender_id);
CREATE INDEX idx_community_chats_game_id           ON community_chats(game_id);
CREATE INDEX idx_community_chats_parent_message_id ON community_chats(parent_message_id);
CREATE INDEX idx_community_chats_created_at        ON community_chats(created_at DESC);

-- Partial index: chi lay tin nhan chua bi xoa (query pho bien nhat)
CREATE INDEX idx_community_chats_active ON community_chats(game_id, created_at DESC)
    WHERE is_deleted = FALSE;

COMMENT ON TABLE  community_chats                  IS 'Chat cong dong: global hoac theo game. Ho tro reply thread.';
COMMENT ON COLUMN community_chats.game_id          IS 'NULL = global chat | NOT NULL = discussion theo game';
COMMENT ON COLUMN community_chats.parent_message_id IS 'NULL = tin nhan goc | NOT NULL = reply';
COMMENT ON COLUMN community_chats.is_deleted       IS 'Soft delete: admin xem duoc noi dung, user thay [da xoa]';


-- ============================================================
--  TABLE 19: audit_logs  [IMMUTABLE]
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
    id           UUID         PRIMARY KEY,
    recipient_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(50)  NOT NULL,
    message      TEXT         NOT NULL,
    target_id    VARCHAR(255),
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read   ON notifications(recipient_id, is_read);

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
--  TABLE 22: external_publishes  [CAP NHAT v9.0]
--  Them game_version_id: biet chinh xac version nao dang live tren store
-- ============================================================
CREATE TABLE external_publishes (
                                    id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
                                    game_id         UUID              NOT NULL REFERENCES games(id) ON DELETE RESTRICT,

    -- Version duoc submit len store lan nay
    -- vd: Google Play dang chay v1.1, App Store dang chay v1.0
                                    game_version_id UUID              NOT NULL REFERENCES game_versions(id) ON DELETE RESTRICT,

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

    -- 1 game chi co 1 ban tren moi platform tai 1 thoi diem
    -- (co the co nhieu record theo lich su, nhung chi 1 record status='live')
                                    CONSTRAINT uq_game_platform UNIQUE (game_id, platform)
);

CREATE INDEX idx_ext_publishes_game_id      ON external_publishes(game_id);
CREATE INDEX idx_ext_publishes_version_id   ON external_publishes(game_version_id);
CREATE INDEX idx_ext_publishes_platform     ON external_publishes(platform);
CREATE INDEX idx_ext_publishes_status       ON external_publishes(status);

COMMENT ON TABLE  external_publishes                 IS 'Theo doi tung lan submit game len Google Play / App Store';
COMMENT ON COLUMN external_publishes.game_version_id IS 'Version cu the duoc submit — biet Google Play/AppStore dang chay version nao';


-- ============================================================
--  TABLE 23: source_downloads  [DOI TEN + CAP NHAT v6.0]
--  (doi ten tu game_downloads)
--
--  Track tung luot tai SOURCE CODE tren Marketplace Platform.
--
--  TAI SAO TACH KHOI orders?
--    orders         = mua 1 lan (payment event)
--    source_downloads = tai ve N lan (download event)
--    Developer mua 1 lan nhung co the tai lai nhieu lan:
--      - Doi may tinh → tai lai
--      - Mat file → tai lai
--      - Seller cap nhat version moi → tai ban moi
--
--  DIEU KIEN DE DOWNLOAD:
--    Phai co order hop le (order_id NOT NULL, order_type = source_code_purchase)
--
--  KHONG co UNIQUE(user_id, marketplace_item_id):
--    Developer duoc phep tai lai nhieu lan (tai ban cu, tai ban update)
--
--  KHAC voi game_downloads cu:
--    game_version_id → marketplace_item_id (source code o marketplace, khong phai game_versions)
-- ============================================================
CREATE TABLE source_downloads (
                                  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                  marketplace_item_id UUID        NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
                                  order_id            UUID        NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    -- phai co order hop le (source_code_purchase) moi duoc tai
                                  ip_address          INET,
                                  device_info         VARCHAR(200),
                                  downloaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- KHONG UNIQUE: developer duoc tai lai nhieu lan
);

CREATE INDEX idx_source_downloads_user_id             ON source_downloads(user_id);
CREATE INDEX idx_source_downloads_marketplace_item_id ON source_downloads(marketplace_item_id);
CREATE INDEX idx_source_downloads_order_id            ON source_downloads(order_id);
CREATE INDEX idx_source_downloads_downloaded_at       ON source_downloads(downloaded_at DESC);

-- Trigger: sau moi INSERT vao source_downloads → tang games.download_count len 1
-- (thong qua marketplace_items.source_game_id)
-- CREATE OR REPLACE FUNCTION inc_source_download_count() RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE games
--   SET download_count = download_count + 1
--   WHERE id = (
--     SELECT mi.source_game_id
--     FROM marketplace_items mi
--     WHERE mi.id = NEW.marketplace_item_id
--       AND mi.source_game_id IS NOT NULL
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_inc_source_download_count
-- AFTER INSERT ON source_downloads
-- FOR EACH ROW EXECUTE FUNCTION inc_source_download_count();

COMMENT ON TABLE  source_downloads                     IS 'Moi luot tai source code / asset — KHONG UNIQUE (tai lai nhieu lan)';
COMMENT ON COLUMN source_downloads.marketplace_item_id IS 'Source code hoac asset duoc tai';
COMMENT ON COLUMN source_downloads.order_id            IS 'Bat buoc: phai co order source_code_purchase hop le';
COMMENT ON COLUMN source_downloads.device_info         IS 'OS + may tinh, ho tro analytics';


-- ============================================================
--  TABLE 24: store_download_stats  [MOI v5.0]
--
--  Luu thong ke luot tai tu Google Play va App Store.
--
--  TAI SAO CAN BANG NAY?
--    Game full_acquisition / co_publishing duoc phat hanh len store ngoai.
--    Luot tai xay ra tren Google Play / App Store — Platform khong
--    the track truc tiep tung nguoi dung tai.
--    Giai phap: cron job chay hang ngay → goi Google Play API
--    va App Store Connect API → pull so lieu aggregate → luu vao day.
--
--  UNIQUE(game_id, platform, stat_date):
--    Moi ngay chi co 1 record cho moi game/platform.
--    Neu cron chay lai (retry) → ON CONFLICT UPDATE thay vi INSERT trung.
--
--  DUNG CHO:
--    Developer Dashboard: bieu do luot tai theo thoi gian.
--    Admin analytics: so sanh hieu suat game tren cac store.
--    Cap nhat games.download_count: cong don tu bang nay
--    (cron job tong hop cuoi ngay).
-- ============================================================
CREATE TABLE store_download_stats (
                                      id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
                                      game_id       UUID              NOT NULL REFERENCES games(id) ON DELETE CASCADE,
                                      platform      ext_platform_enum NOT NULL,
                                      stat_date     DATE              NOT NULL,
                                      downloads     INTEGER           NOT NULL DEFAULT 0 CHECK (downloads >= 0),
    -- luot tai trong ngay stat_date
                                      installs      INTEGER           NOT NULL DEFAULT 0 CHECK (installs >= 0),
    -- luot cai dat moi (co the khac downloads)
                                      revenue       NUMERIC(15,2)     NOT NULL DEFAULT 0.00,
    -- doanh thu trong ngay (tu store)
                                      fetched_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    -- lan cuoi pull tu API

                                      CONSTRAINT uq_store_stat UNIQUE (game_id, platform, stat_date)
);

CREATE INDEX idx_store_stats_game_id    ON store_download_stats(game_id);
CREATE INDEX idx_store_stats_platform   ON store_download_stats(platform);
CREATE INDEX idx_store_stats_stat_date  ON store_download_stats(stat_date DESC);
CREATE INDEX idx_store_stats_game_date  ON store_download_stats(game_id, stat_date DESC);

COMMENT ON TABLE  store_download_stats           IS 'Aggregate stats tu Google Play / App Store API — cron job pull hang ngay';
COMMENT ON COLUMN store_download_stats.downloads IS 'Luot tai trong ngay stat_date';
COMMENT ON COLUMN store_download_stats.installs  IS 'Luot cai dat moi (Google Play phan biet downloads vs installs)';
COMMENT ON COLUMN store_download_stats.revenue   IS 'Doanh thu trong ngay tu store, dung doi soat voi transactions';
COMMENT ON COLUMN store_download_stats.fetched_at IS 'Thoi diem pull tu API, de biet data co fresh khong';


-- ============================================================
--  TABLE 25: user_ip_logs  [MOI v7.0]
--
--  Ghi lai IP cua moi hanh dong quan trong cua user.
--
--  MUC DICH:
--    - Detect spam account (nhieu account tu 1 IP)
--    - Detect spam review (nhieu review tu 1 IP)
--    - Khi ban 1 account → query bang nay → lay tat ca IP → ban het
--    - Admin co the xem hanh vi bat thuong (login nhieu lan, upload lien tuc)
--
--  KHONG luu moi request (qua nhieu) — chi log cac action quan trong:
--    register, login, upload_source, submit_game, post_review, post_chat
--
--  user_id co the NULL: log ca cac attempt dang ky that bai / spam dang ky
-- ============================================================
CREATE TABLE user_ip_logs (
                              id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                              user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    -- NULL = anonymous (vd: ai do spam trang dang ky)
                              ip_address  INET         NOT NULL,
                              action      VARCHAR(50)  NOT NULL
                                  CHECK (action IN (
                                  'register',       -- tao tai khoan
                                  'login',          -- dang nhap
                                  'upload_source',  -- upload source code len marketplace
                                  'submit_game',    -- nop game len platform
                                  'post_review',    -- dang review
                                  'post_chat',      -- gui tin nhan chat
                                  'checkout'        -- thanh toan don hang
                                  )),
    user_agent  TEXT,
    -- OS, browser, de phat hien bot
    logged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ip_logs_user_id    ON user_ip_logs(user_id);
CREATE INDEX idx_ip_logs_ip_address ON user_ip_logs(ip_address);
CREATE INDEX idx_ip_logs_action     ON user_ip_logs(action);
CREATE INDEX idx_ip_logs_logged_at  ON user_ip_logs(logged_at DESC);

-- Partial index: detect spam review (query pho bien nhat)
CREATE INDEX idx_ip_logs_review_spam ON user_ip_logs(ip_address, logged_at DESC)
    WHERE action = 'post_review';

COMMENT ON TABLE  user_ip_logs            IS 'Log IP cho cac action quan trong — phat hien spam va ho tro ban IP';
COMMENT ON COLUMN user_ip_logs.user_id    IS 'NULL = anonymous attempt (spam dang ky, brute force...)';
COMMENT ON COLUMN user_ip_logs.action     IS 'Chi log action quan trong, khong log moi request';
COMMENT ON COLUMN user_ip_logs.user_agent IS 'Giup phan biet bot vs nguoi that';


-- ============================================================
--  TABLE 26: banned_ips  [MOI v7.0]
--
--  Danh sach IP bi chan — check tai tang middleware/API gateway.
--
--  CACH DUNG:
--    Khi ban account vi pham: query user_ip_logs → lay tat ca IP →
--    insert vao banned_ips voi related_user_id = account bi ban.
--
--  expires_at:
--    NULL    = ban vinh vien (vi pham nghiem trong: spam, ip gia mao)
--    NOT NULL = ban co thoi han (vi pham nhe, spam review...)
--
--  UNIQUE(ip_address): 1 IP chi can 1 record, update neu can thay doi.
-- ============================================================
CREATE TABLE banned_ips (
                            id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                            ip_address       INET         NOT NULL UNIQUE,
                            reason           VARCHAR(200) NOT NULL,
    -- vd: 'Spam review', 'Copyright violation - account devB', 'Brute force login'
                            related_user_id  UUID         REFERENCES users(id) ON DELETE SET NULL,
    -- Account da gay ra lenh ban nay (de truy vet)
                            banned_by        UUID         REFERENCES users(id) ON DELETE SET NULL,
    -- Admin thuc hien lenh ban
                            banned_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                            expires_at       TIMESTAMPTZ,
    -- NULL = ban vinh vien
    -- NOT NULL = tu dong go ban sau thoi diem nay (xu ly o app/cron)
                            notes            TEXT
    -- Ghi chu them cua admin
);

CREATE INDEX idx_banned_ips_ip          ON banned_ips(ip_address);
CREATE INDEX idx_banned_ips_related_user ON banned_ips(related_user_id);
-- Index cho check het han (cron job cleanup)
CREATE INDEX idx_banned_ips_expires     ON banned_ips(expires_at)
    WHERE expires_at IS NOT NULL;

COMMENT ON TABLE  banned_ips                  IS 'IP bi chan — check tai API gateway truoc khi xu ly request';
COMMENT ON COLUMN banned_ips.ip_address       IS 'INET: ho tro ca IPv4 va IPv6. UNIQUE: 1 IP 1 record.';
COMMENT ON COLUMN banned_ips.related_user_id  IS 'Account da dan den lenh ban — de admin tra vet';
COMMENT ON COLUMN banned_ips.expires_at       IS 'NULL = vinh vien | NOT NULL = co thoi han';


-- ============================================================
--  TABLE 27: media_files  [DOI TEN + MO RONG v9.0]
--  (doi ten tu game_media)
--
--  Luu nhieu anh / video cho ca GAME lan MARKETPLACE_ITEM.
--
--  OWNER: game_id XOR marketplace_item_id (CHECK constraint)
--
--  Voi GAME:
--    screenshot : anh chup man hinh (Google Play >= 2, App Store >= 3)
--    video      : gameplay trailer
--    thumbnail  : anh dai dien game (1 per game)
--    banner     : anh banner rong tren trang chu
--
--  Voi MARKETPLACE_ITEM (source_code / asset):
--    screenshot : preview san pham (buyer xem truoc khi mua)
--    video      : demo video
--    thumbnail  : anh dai dien listing
--
--  Media o cap GAME, khong o cap game_version:
--    Khi developer update version moi + doi anh, ho chi can
--    update media_files. Lich su anh theo version khong can thiet.
--    (Neu sau nay can → them game_version_id nullable)
-- ============================================================
CREATE TABLE media_files (
                             id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Exactly 1 trong 2 phai co gia tri (CHECK ben duoi)
                             game_id             UUID         REFERENCES games(id) ON DELETE CASCADE,
                             marketplace_item_id UUID         REFERENCES marketplace_items(id) ON DELETE CASCADE,

                             media_type    VARCHAR(20)  NOT NULL
                                 CHECK (media_type IN ('screenshot', 'video', 'thumbnail', 'banner')),
                             url           TEXT         NOT NULL,
                             display_order SMALLINT     NOT NULL DEFAULT 0,
                             alt_text      VARCHAR(200),
                             created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Bắt buộc chi co 1 owner
                             CONSTRAINT chk_media_one_owner CHECK (
                                 (game_id IS NOT NULL AND marketplace_item_id IS NULL)
                                     OR
                                 (game_id IS NULL AND marketplace_item_id IS NOT NULL)
                                 )
);

CREATE INDEX idx_media_files_game_id        ON media_files(game_id)
    WHERE game_id IS NOT NULL;
CREATE INDEX idx_media_files_marketplace_id ON media_files(marketplace_item_id)
    WHERE marketplace_item_id IS NOT NULL;
CREATE INDEX idx_media_files_type_game      ON media_files(game_id, media_type)
    WHERE game_id IS NOT NULL;
CREATE INDEX idx_media_files_type_market    ON media_files(marketplace_item_id, media_type)
    WHERE marketplace_item_id IS NOT NULL;
CREATE INDEX idx_media_files_order_game     ON media_files(game_id, display_order)
    WHERE game_id IS NOT NULL;

-- Partial index: lay thumbnail nhanh (query pho bien nhat)
CREATE INDEX idx_media_files_thumb_game     ON media_files(game_id)
    WHERE media_type = 'thumbnail' AND game_id IS NOT NULL;
CREATE INDEX idx_media_files_thumb_market   ON media_files(marketplace_item_id)
    WHERE media_type = 'thumbnail' AND marketplace_item_id IS NOT NULL;

COMMENT ON TABLE  media_files                      IS 'Anh/video cho games VA marketplace_items — game_id XOR marketplace_item_id';
COMMENT ON COLUMN media_files.game_id              IS 'FK → games. NULL neu owner la marketplace_item';
COMMENT ON COLUMN media_files.marketplace_item_id  IS 'FK → marketplace_items. NULL neu owner la game';
COMMENT ON COLUMN media_files.media_type           IS 'screenshot | video | thumbnail | banner';
COMMENT ON COLUMN media_files.display_order        IS 'Thu tu hien thi — Google Play / App Store dung thu tu nay';


-- ============================================================
--  TONG KET — 27 BANG
-- ============================================================
--
--  NHOM              BANG                       TRANG THAI
--  ─────────────────────────────────────────────────────────
--  Identity          roles                      v2.0
--                    users                      v7.0 (+GitHub OAuth)
--  ─────────────────────────────────────────────────────────
--  Content Org       categories                 v2.0
--                    tags                       v2.0
--                    game_tags                  v2.0
--  ─────────────────────────────────────────────────────────
--  Game Core         games                      v6.0
--                    game_versions              giu nguyen
--                    media_files                v9.0 (doi ten game_media, mo rong cho marketplace_item)
--                    ai_reports                 FIX v3.0 (game_version_id)
--  ─────────────────────────────────────────────────────────
--  Legal & Finance   contracts                  v2.0
--                    wallets                    giu nguyen
--                    transactions               giu nguyen
--                    orders                     FIX v8.0
--                    withdrawal_requests        giu nguyen
--  ─────────────────────────────────────────────────────────
--  Marketplace       marketplace_items          v9.0 (xoa preview_url → dung media_files)
--                    cart_items                 FIX v8.0
--                    favorites                  v2.0
--  ─────────────────────────────────────────────────────────
--  Community         reviews                    FIX v8.0
--                    community_chats            v2.0
--  ─────────────────────────────────────────────────────────
--  Download          source_downloads           v6.0
--                    store_download_stats       v5.0
--  ─────────────────────────────────────────────────────────
--  Security          user_ip_logs               v7.0
--                    banned_ips                 v7.0
--  ─────────────────────────────────────────────────────────
--  Operations        audit_logs                 IMMUTABLE
--                    notifications              giu nguyen
--                    publishing_guides          giu nguyen
--                    external_publishes         v9.0 (+game_version_id)
--  ─────────────────────────────────────────────────────────
--  TONG              27 bang
--                    v1→15 | v2→22 | v5→24 | v7→26 | v8→27 | v9→27
--
--  QUAN HE game_versions:
--    game_versions → games              (parent game)
--    ai_reports    → game_versions      (AI phan tich tung version)
--    external_publishes → game_versions (version nao dang live tren store)
-- ============================================================
-- ============================================================
--  ─────────────────────────────────────────────────────────
--  Content Org       categories                 MOI v2.0
--                    tags                       MOI v2.0
--                    game_tags                  MOI v2.0 (junction)
--  ─────────────────────────────────────────────────────────
--  Game Core         games                      Cap nhat v6.0 (+is_source_listed)
--                    game_versions              Giu nguyen
--                    ai_reports                 FIX v3.0 (game_version_id)
--  ─────────────────────────────────────────────────────────
--  Legal & Finance   contracts                  Cap nhat (full_acq + co_pub only)
--                    wallets                    Giu nguyen
--                    transactions               Giu nguyen
--                    orders                     Cap nhat v4.0+v6.0
--                    withdrawal_requests        Giu nguyen
--  ─────────────────────────────────────────────────────────
--  Marketplace       marketplace_items          Cap nhat v7.0 (+GitHub proof fields)
--                    cart_items                 MOI v2.0
--                    favorites                  MOI v2.0
--  ─────────────────────────────────────────────────────────
--  Community         reviews                    Cap nhat v4.0 (order_id)
--                    community_chats            MOI v2.0
--  ─────────────────────────────────────────────────────────
--  Download          source_downloads           Cap nhat v6.0
--                    store_download_stats       MOI v5.0
--  ─────────────────────────────────────────────────────────
--  Security          user_ip_logs               MOI v7.0 (log IP action quan trong)
--                    banned_ips                 MOI v7.0 (chan IP spam/vi pham)
--  ─────────────────────────────────────────────────────────
--  Operations        audit_logs                 Giu nguyen (IMMUTABLE)
--                    notifications              Giu nguyen
--                    publishing_guides          Giu nguyen
--                    external_publishes         Giu nguyen
--  ─────────────────────────────────────────────────────────
--  TONG              26 bang
--                    v1→15 | v2→22 | v3→22 | v4→22 | v5→24 | v6→24 | v7→26
-- ============================================================