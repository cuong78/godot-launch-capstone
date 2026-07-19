-- ============================================================
--  V1 (CONSOLIDATED): Full schema — gộp V1 đến V39
--  Mọi thay đổi incremental đã được áp dụng trực tiếp vào đây.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';

-- ============================================================
--  ENUM TYPES (trạng thái cuối cùng sau V1–V39)
-- ============================================================

CREATE TYPE public.actor_role_enum AS ENUM (
    'developer',
    'admin',
    'customer'
);

CREATE TYPE public.audit_action_enum AS ENUM (
    'game_submitted',
    'game_approved',
    'game_rejected',
    'game_published',
    'game_community_enabled',
    'game_updated',
    'user_banned',
    'user_unbanned',
    'user_role_changed',
    'contract_created',
    'contract_signed',
    'contract_cancelled',
    'transaction_completed',
    'transaction_failed',
    'withdrawal_approved',
    'withdrawal_rejected',
    'marketplace_item_removed',
    'review_removed',
    'chat_removed',
    'ai_report_generated',
    'security_alert',
    'user_registered',
    'user_login_success',
    'user_login_failed',
    'user_logged_out',
    'post_created',
    'comment_created',
    'reaction_created',
    'chat_message_sent'
);

CREATE TYPE public.audit_target_enum AS ENUM (
    'user',
    'game',
    'game_version',
    'contract',
    'transaction',
    'wallet',
    'marketplace_item',
    'review',
    'ai_report',
    'withdrawal_request',
    'external_publish',
    'notification',
    'source_code_purchase',
    'community_chat',
    'chat_message'
);

CREATE TYPE public.chat_media_type_enum AS ENUM (
    'image',
    'video'
);

-- V21: thu gọn còn pending/signed/expired/cancelled (bỏ negotiating, re_issued)
CREATE TYPE public.contract_status_enum AS ENUM (
    'pending',
    'signed',
    'expired',
    'cancelled'
);

CREATE TYPE public.contract_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing'
);

-- Dùng cho store_download_stats (V7 đã bỏ cột platform khỏi bảng nhưng giữ type)
CREATE TYPE public.ext_platform_enum AS ENUM (
    'google_play',
    'app_store'
);

CREATE TYPE public.ext_status_enum AS ENUM (
    'pending',
    'submitted',
    'live',
    'rejected',
    'removed'
);

-- V32: thêm 'awaiting_store_build'
CREATE TYPE public.game_status_enum AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'published',
    'awaiting_store_build'
);

CREATE TYPE public.item_status_enum AS ENUM (
    'active',
    'removed',
    'pending',
    'rejected'
);

-- V13: DROP order_status_enum (không còn dùng)
-- (không tạo ở đây)

-- V14: DROP payment_method_enum (không còn dùng)
-- (không tạo ở đây)

-- V19: bỏ WAITING_VERIFICATION, REJECTED
CREATE TYPE public.payment_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

CREATE TYPE public.publishing_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing',
    'marketplace_listing'
);

CREATE TYPE public.reaction_type_enum AS ENUM (
    'like',
    'love',
    'haha',
    'wow',
    'sad',
    'angry'
);

-- V9: bỏ transactions.status (không còn txn_status_enum được dùng trong transactions)
-- Giữ type để không phá các FK / code khác nếu cần
CREATE TYPE public.txn_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);

-- V18: thêm wallet_topup
CREATE TYPE public.txn_type_enum AS ENUM (
    'source_code_purchase',
    'withdrawal',
    'revenue_share',
    'commission',
    'refund',
    'asset_purchase',
    'wallet_topup'
);

CREATE TYPE public.withdrawal_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed',
    'processing',
    'cancelled',
    'failed'
);

-- V20: notif_type_enum bị DROP (không tạo ở đây)

-- ============================================================
--  TABLES
-- ============================================================

-- V30/V37: thêm tags_match_score
CREATE TABLE public.ai_review_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid,
    asset_id uuid,
    code_quality_score integer,
    media_match_score integer,
    description_match_score integer,
    tags_match_score integer,
    nsfw_flag boolean DEFAULT false NOT NULL,
    overall_recommendation character varying(20) DEFAULT 'review'::character varying NOT NULL,
    flags jsonb,
    raw_output jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    suggested_price numeric(15,2),
    suggested_revenue_split smallint,
    pricing_rationale text,
    CONSTRAINT ai_review_reports_suggested_price_check CHECK ((suggested_price >= (0)::numeric)),
    CONSTRAINT ai_review_reports_suggested_revenue_split_check CHECK (((suggested_revenue_split >= 0) AND (suggested_revenue_split <= 100))),
    CONSTRAINT chk_ai_review_target CHECK (((game_id IS NOT NULL) OR (asset_id IS NOT NULL)))
);

COMMENT ON TABLE public.ai_review_reports IS 'AI review multimodal — ĐỀ XUẤT cho admin, không phải phán quyết';
COMMENT ON COLUMN public.ai_review_reports.overall_recommendation IS 'approve|review|reject — chỉ gợi ý, admin quyết định cuối';
COMMENT ON COLUMN public.ai_review_reports.flags IS 'JSONB list cảnh báo + bằng chứng (NSFW index, secret, mismatch)';
COMMENT ON COLUMN public.ai_review_reports.suggested_price IS 'Giá AI gợi ý (đề xuất, admin quyết định)';
COMMENT ON COLUMN public.ai_review_reports.suggested_revenue_split IS '% chia doanh thu AI gợi ý 0-100 (game co-publishing)';
COMMENT ON COLUMN public.ai_review_reports.pricing_rationale IS 'Lý do AI đề xuất mức giá đó';

CREATE TABLE public.asset_tags (
    asset_id uuid NOT NULL,
    tag_id uuid NOT NULL
);

COMMENT ON TABLE public.asset_tags IS 'Nhiều-nhiều: marketplace item ↔ tags';

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    category_id uuid,
    title character varying(200) NOT NULL,
    description text,
    price numeric(15,2) NOT NULL,
    file_url text NOT NULL,
    status public.item_status_enum DEFAULT 'active'::public.item_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    thumbnail_url text,
    CONSTRAINT marketplace_items_price_check CHECK ((price >= (0)::numeric))
);

COMMENT ON TABLE public.assets IS 'Asset = tài nguyên lẻ ở marketplace (3D/sprite/audio/plugin). Không chứa source code game.';
COMMENT ON COLUMN public.assets.file_url IS 'URL file ZIP: Godot project hoac asset pack';

-- V10: DROP banned_ips (không tạo)

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_id uuid,
    game_id uuid,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_cart_items_target CHECK (
        (asset_id IS NOT NULL AND game_id IS NULL) OR
        (asset_id IS NULL AND game_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.cart_items IS 'Gio hang: source code hoac asset tren Marketplace';

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    type character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_type_check CHECK (((type)::text = ANY (ARRAY[('game'::character varying)::text, ('asset'::character varying)::text])))
);

COMMENT ON TABLE public.categories IS 'Danh muc game, ho tro cha-con qua parent_id';
COMMENT ON COLUMN public.categories.slug IS 'URL-friendly, vd: action-rpg';
COMMENT ON COLUMN public.categories.parent_id IS 'NULL = top-level category';
COMMENT ON COLUMN public.categories.type IS 'Phan loai: game (the loai game) hoac asset (loai marketplace item)';

CREATE TABLE public.chat_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    url text NOT NULL,
    media_type public.chat_media_type_enum NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL
);

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type public.reaction_type_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- V23: bảng phát hiện đạo văn
CREATE TABLE public.code_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL,
    embedding public.vector(768) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.community_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    game_id uuid,
    parent_message_id uuid,
    message text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reaction_count integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    share_count integer DEFAULT 0 NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    original_chat_id uuid,
    CONSTRAINT community_chats_message_check CHECK (((length(TRIM(BOTH FROM message)) > 0) AND (length(message) <= 2000)))
);

COMMENT ON TABLE public.community_chats IS 'Chat cong dong: global hoac theo game. Ho tro reply thread.';
COMMENT ON COLUMN public.community_chats.game_id IS 'NULL = global chat | NOT NULL = discussion theo game';
COMMENT ON COLUMN public.community_chats.parent_message_id IS 'NULL = tin nhan goc | NOT NULL = reply';
COMMENT ON COLUMN public.community_chats.is_deleted IS 'Soft delete: admin xem duoc noi dung, user thay [da xoa]';

-- V21: thêm UNIQUE game_id; V6: bỏ dispute_resolution_clause, additional_terms,
--      buyer_representative, buyer_position, signed_at_buyer (buyer_signature_base64 bỏ V6, thêm lại V31/V38)
CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    contract_type public.contract_type_enum NOT NULL,
    terms_hash character varying(64) NOT NULL,
    pdf_url text NOT NULL,
    status public.contract_status_enum DEFAULT 'pending'::public.contract_status_enum NOT NULL,
    revenue_split smallint,
    signed_at_seller timestamp with time zone,
    -- V31/V38: thêm lại buyer_signature_base64 và signed_at_buyer
    buyer_signature_base64 text,
    signed_at_buyer timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lump_sum_amount character varying(255),
    seller_representative character varying(255),
    seller_address text,
    seller_tax_code character varying(100),
    seller_signature_base64 text,
    rejection_reason text,
    CONSTRAINT contracts_revenue_split_check CHECK (((revenue_split >= 0) AND (revenue_split <= 100)))
);

COMMENT ON TABLE public.contracts IS 'Hop dong phap ly — CHI cho full_acquisition va co_publishing';
COMMENT ON COLUMN public.contracts.revenue_split IS '% cho developer (chi co_publishing)';

-- V11: device fingerprint & risk events (thay banned_ips)
CREATE TABLE public.device_fingerprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    fingerprint_hash character varying(128) NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'normal' NOT NULL,
    CONSTRAINT uq_device_fingerprints_hash UNIQUE (fingerprint_hash)
);

CREATE TABLE public.disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_seller_id uuid NOT NULL,
    game_id uuid NOT NULL,
    reason text NOT NULL,
    evidence_repo_url text,
    evidence_note text,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    resolution_note text,
    refund_amount numeric(15,2),
    refund_deadline timestamp with time zone,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT disputes_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('investigating'::character varying)::text, ('resolved_seller_fault'::character varying)::text, ('resolved_reporter_fault'::character varying)::text, ('resolved_inconclusive'::character varying)::text, ('cancelled'::character varying)::text])))
);

COMMENT ON TABLE public.disputes IS 'Tranh chấp bản quyền source: B tố A đánh cắp. Admin phán xử theo cây quyết định.';

-- V39: bảng embeddings hợp nhất (thay face_embeddings)
CREATE TABLE public.embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    embedding_128 public.vector(128),
    embedding_512 public.vector(512),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_embeddings_type CHECK (type IN ('face', 'kyc_front', 'kyc_back')),
    CONSTRAINT chk_embeddings_vector_matches_type CHECK (
        (type = 'face' AND embedding_128 IS NOT NULL AND embedding_512 IS NULL)
        OR (type IN ('kyc_front', 'kyc_back') AND embedding_512 IS NOT NULL AND embedding_128 IS NULL)
    )
);

CREATE TABLE public.external_publishes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    game_version_id uuid NOT NULL,
    status public.ext_status_enum DEFAULT 'pending'::public.ext_status_enum NOT NULL,
    external_app_id character varying(200),
    store_url text,
    submitted_at timestamp with time zone,
    live_at timestamp with time zone,
    rejected_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.external_publishes IS 'Theo doi tung lan submit game len store (mac dinh Google Play)';
COMMENT ON COLUMN public.external_publishes.game_version_id IS 'Version cu the duoc submit — biet store dang chay version nao';

CREATE TABLE public.game_tags (
    game_id uuid NOT NULL,
    tag_id uuid NOT NULL
);

COMMENT ON TABLE public.game_tags IS 'Nhieu-nhieu: 1 game co nhieu tag, 1 tag thuoc nhieu game';

CREATE TABLE public.game_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    version_number character varying(50) NOT NULL,
    changelog text,
    file_url text NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    released_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.game_versions IS 'Lich su phien ban game — 1 phien ban la current tai 1 thoi diem';

-- V2: bỏ file_url; V22: thêm web_demo_url
CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    category_id uuid,
    title character varying(200) NOT NULL,
    description text,
    thumbnail_url text,
    -- file_url đã bị bỏ (V2)
    status public.game_status_enum DEFAULT 'draft'::public.game_status_enum NOT NULL,
    publishing_type public.publishing_type_enum,
    price_proposed numeric(15,2),
    download_count integer DEFAULT 0 NOT NULL,
    is_source_listed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    github_repo_url text,
    github_branch character varying(100),
    github_verified_at timestamp with time zone,
    web_demo_url text,
    CONSTRAINT games_download_count_check CHECK ((download_count >= 0)),
    CONSTRAINT games_price_proposed_check CHECK ((price_proposed >= (0)::numeric))
);

COMMENT ON TABLE public.games IS 'Game tren nen tang GodotLaunch';
COMMENT ON COLUMN public.games.price_proposed IS 'Gia de xuat cho full_acquisition / co_publishing. Gia marketplace nam o marketplace_items.price';
COMMENT ON COLUMN public.games.download_count IS 'Cached tong luot tai source code — cap nhat qua trigger + cron, tranh COUNT(*)';
COMMENT ON COLUMN public.games.is_source_listed IS 'TRUE = dang co marketplace_items listing cho source code cua game nay';
COMMENT ON COLUMN public.games.github_repo_url IS 'Repo GitHub của game — nguồn pull code (thay cho game.zip)';
COMMENT ON COLUMN public.games.github_branch IS 'Branch để pull (null = default branch)';
COMMENT ON COLUMN public.games.github_verified_at IS 'Thời điểm verify owner repo khớp account';
COMMENT ON COLUMN public.games.web_demo_url IS 'Live Preview: buyer chơi thử bản Web build trước khi mua (V22)';

-- V25/V26: game_id, asset_id đã có; V29: bỏ owner_type, owner_id
CREATE TABLE public.media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid,
    asset_id uuid,
    media_type character varying(20) NOT NULL,
    media_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_media_one_owner CHECK ((num_nonnulls(game_id, asset_id) = 1))
);

COMMENT ON TABLE public.media IS 'Media cho game + asset — game_id XOR asset_id (FK that)';

-- V16: bỏ sender_id
CREATE TABLE public.notifications (
    id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    target_id character varying(255),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL
);

-- V13: bỏ order_status, transaction_id; V36: thêm UNIQUE (buyer_id, game_id)
CREATE TYPE public.order_type_enum AS ENUM (
    'source_code_purchase',
    'asset_purchase'
);

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid NOT NULL,
    order_type public.order_type_enum NOT NULL,
    asset_id uuid,
    game_id uuid,
    price_paid numeric(15,2) NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_price_paid_check CHECK ((price_paid >= (0)::numeric)),
    CONSTRAINT chk_orders_target CHECK (
        (asset_id IS NOT NULL AND game_id IS NULL) OR
        (asset_id IS NULL AND game_id IS NOT NULL)
    )
);

-- V14: bỏ order_id, payment_method, receipt_url, payer_name, payer_bank,
--       transfer_reference, verified_by, verified_at, rejection_reason
-- V24: thêm wallet_id
CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_status public.payment_status_enum DEFAULT 'PENDING'::public.payment_status_enum NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payos_order_code bigint,
    payos_payment_link_id character varying(120),
    payos_transaction_id character varying(120),
    checkout_url text,
    payment_reference character varying(120),
    paid_at timestamp with time zone,
    wallet_id uuid,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE public.plagiarism_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL,
    matched_game_id uuid NOT NULL,
    similarity_score real NOT NULL,
    severity character varying(20) NOT NULL,
    reviewed_by_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_plagiarism_flags_distinct CHECK (game_id <> matched_game_id)
);

CREATE TABLE public.platform_settings (
    id smallint NOT NULL,
    commission_rate numeric(5,2) DEFAULT 10.00 NOT NULL,
    maintenance_mode boolean DEFAULT false NOT NULL,
    announcement_banner text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_settings_commission_rate_check CHECK (((commission_rate >= (0)::numeric) AND (commission_rate <= (100)::numeric))),
    CONSTRAINT platform_settings_id_check CHECK ((id = 1))
);

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    asset_id uuid,
    game_id uuid,
    rating smallint NOT NULL,
    comment text,
    is_approved boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT chk_reviews_target CHECK (
        (asset_id IS NOT NULL AND game_id IS NULL) OR
        (asset_id IS NULL AND game_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.reviews IS 'Verified buyer review — chi sau khi mua (order_id bat buoc)';
COMMENT ON COLUMN public.reviews.order_id IS 'FK → orders — xac nhan da mua truoc khi review';
COMMENT ON COLUMN public.reviews.asset_id IS 'San pham duoc review (source_code hoac asset)';

CREATE TABLE public.risk_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    device_fingerprint_id uuid NOT NULL,
    user_id uuid,
    ip_address inet NOT NULL,
    event_type character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_risk_events_device FOREIGN KEY (device_fingerprint_id)
        REFERENCES public.device_fingerprints(id) ON DELETE CASCADE
);

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.roles IS 'Bang role tach khoi enum: de them role moi ma khong can ALTER TYPE';

-- V17: bảng source_commits
CREATE TABLE public.source_commits (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL,
    commit_sha character varying(40) NOT NULL,
    commit_pushed_at timestamp with time zone,
    code_snapshot_url text,
    context_match_status character varying(20) DEFAULT 'pending' NOT NULL,
    ai_note text,
    ai_evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- V15: bỏ submitted_by, repo_url, commit_sha, file_count, file_hashes
CREATE TABLE public.source_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid,
    bundle_hash character varying(64) NOT NULL,
    is_godot_project boolean DEFAULT false NOT NULL,
    virus_clean boolean DEFAULT true NOT NULL,
    virus_scanned boolean DEFAULT false NOT NULL,
    secrets_found jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    bundle_url text
);

COMMENT ON TABLE public.source_snapshots IS 'Bằng chứng bất biến mỗi lần submit source game (anti-theft + due diligence)';
COMMENT ON COLUMN public.source_snapshots.bundle_url IS 'Link source code đã zip lên storage (AI đọc lại + admin/người mua tải)';

-- V7: bỏ cột platform khỏi bảng (ext_platform_enum vẫn giữ)
CREATE TABLE public.store_download_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    stat_date date NOT NULL,
    downloads integer DEFAULT 0 NOT NULL,
    installs integer DEFAULT 0 NOT NULL,
    revenue numeric(15,2) DEFAULT 0.00 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_download_stats_downloads_check CHECK ((downloads >= 0)),
    CONSTRAINT store_download_stats_installs_check CHECK ((installs >= 0))
);

COMMENT ON TABLE public.store_download_stats IS 'Aggregate stats tu Google Play / App Store API — cron job pull hang ngay';
COMMENT ON COLUMN public.store_download_stats.downloads IS 'Luot tai trong ngay stat_date';
COMMENT ON COLUMN public.store_download_stats.installs IS 'Luot cai dat moi (Google Play phan biet downloads vs installs)';
COMMENT ON COLUMN public.store_download_stats.revenue IS 'Doanh thu trong ngay tu store, dung doi soat voi transactions';
COMMENT ON COLUMN public.store_download_stats.fetched_at IS 'Thoi diem pull tu API, de biet data co fresh khong';

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.tags IS 'Tag game: nhieu-nhieu voi games qua bang game_tags';

-- V8: bỏ platform_commission, net_amount; V9: bỏ status; V21: thêm contract_id;
-- V27: thêm order_id; V28: thêm payment_id;
-- V34+V35: constraint amount (<= 0 / >= 0)
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    related_user_id uuid,
    game_id uuid,
    asset_id uuid,
    amount numeric(15,2) NOT NULL,
    type public.txn_type_enum NOT NULL,
    reference_id character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    contract_id uuid,
    order_id uuid,
    payment_id uuid,
    CONSTRAINT transactions_payment_id_key UNIQUE (payment_id),
    CONSTRAINT transactions_amount_check CHECK (
        ((type IN ('withdrawal', 'source_code_purchase', 'asset_purchase')) AND (amount <= 0)) OR
        ((type NOT IN ('withdrawal', 'source_code_purchase', 'asset_purchase')) AND (amount >= 0))
    )
);

COMMENT ON TABLE public.transactions IS 'Moi giao dich tai chinh. Moi row ghi 1 bien dong so du tren 1 wallet.';

CREATE TABLE public.user_ip_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address inet NOT NULL,
    action character varying(50) NOT NULL,
    user_agent text,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_ip_logs_action_check CHECK (((action)::text = ANY (ARRAY[('register'::character varying)::text, ('login'::character varying)::text, ('upload_source'::character varying)::text, ('submit_game'::character varying)::text, ('post_review'::character varying)::text, ('post_chat'::character varying)::text, ('checkout'::character varying)::text])))
);

COMMENT ON TABLE public.user_ip_logs IS 'Log IP cho cac action quan trong — phat hien spam va ho tro ban IP';
COMMENT ON COLUMN public.user_ip_logs.user_id IS 'NULL = anonymous attempt (spam dang ky, brute force...)';
COMMENT ON COLUMN public.user_ip_logs.action IS 'Chi log action quan trong, khong log moi request';
COMMENT ON COLUMN public.user_ip_logs.user_agent IS 'Giup phan biet bot vs nguoi that';

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    email public.citext NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    avatar_url text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    github_id character varying(50),
    github_username character varying(100),
    github_token_enc text,
    github_linked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    session_hash text,
    face_verified boolean DEFAULT false NOT NULL,
    kyc_verified boolean DEFAULT false NOT NULL,
    kyc_full_name text,
    kyc_id_number text,
    kyc_date_of_birth date,
    kyc_address text,
    kyc_document_type text,
    kyc_verified_at timestamp with time zone,
    preferred_language character varying(10) DEFAULT 'vi'::character varying NOT NULL,
    kyc_front_image_url text,
    kyc_back_image_url text,
    -- V41: bank account co dinh cua developer (de rut tien + lam nguon ban cho banned_identities)
    bank_name character varying(200),
    bank_account character varying(100),
    bank_account_holder character varying(200),
    CONSTRAINT check_users_preferred_language CHECK (((preferred_language)::text = ANY (ARRAY[('vi'::character varying)::text, ('en'::character varying)::text, ('ja'::character varying)::text]))),
    CONSTRAINT chk_github_fields CHECK (((github_id IS NULL) OR ((github_id IS NOT NULL) AND (github_username IS NOT NULL) AND (github_token_enc IS NOT NULL) AND (github_linked_at IS NOT NULL)))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('banned'::character varying)::text])))
);

COMMENT ON TABLE public.users IS 'Nguoi dung. GitHub OAuth bat buoc de ban source code.';
COMMENT ON COLUMN public.users.role_id IS 'FK den roles.id';
COMMENT ON COLUMN public.users.email IS 'CITEXT: khong phan biet hoa/thuong';
COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hash, cost >= 12';
COMMENT ON COLUMN public.users.github_id IS 'GitHub user ID — NULL = chua lien ket, khong duoc ban source';
COMMENT ON COLUMN public.users.github_token_enc IS 'AES-256 encrypted OAuth token — giai ma o tang application khi can verify repo';

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_balance_check CHECK ((balance >= (0)::numeric))
);

COMMENT ON TABLE public.wallets IS '1 user co 1 wallet (UNIQUE user_id)';

-- V42: Blacklist da tang: face + CCCD + bank — chan user bi ban dang ky/them bank lai
CREATE TABLE public.banned_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    face_embedding public.vector(128),
    kyc_id_number text,
    bank_account text,
    reason character varying(50) NOT NULL,
    note text,
    banned_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.banned_identities IS 'Blacklist da tang: face + CCCD + bank — chan user bi ban dang ky/them bank lai.';

-- V33: bỏ processed_by
CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    status public.withdrawal_status_enum DEFAULT 'pending'::public.withdrawal_status_enum NOT NULL,
    processed_at timestamp with time zone,
    remark text,
    transaction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    transfer_reference character varying(120),
    payos_payout_id character varying(120),
    payos_reference_id character varying(120),
    payos_status character varying(50),
    payos_created_at text,
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric))
);

COMMENT ON TABLE public.withdrawal_requests IS 'Admin duyet thu cong truoc khi xu ly rut tien';

-- ============================================================
--  REQUIRED SYSTEM DATA
-- ============================================================

INSERT INTO public.platform_settings (id, commission_rate, maintenance_mode, announcement_banner, updated_at) VALUES (1, 10.00, false, 'GodotLaunch Matrix Engine Upgrade is complete!', '2026-06-29 17:24:26.445727+00');

INSERT INTO public.roles (id, name, description, created_at) VALUES ('12c4e654-c6d6-479b-9ed6-f017c0c4dc5b', 'admin', 'Quan tri vien nen tang — toan quyen', '2026-06-29 17:24:18.826633+00');
INSERT INTO public.roles (id, name, description, created_at) VALUES ('68c3e028-491a-4722-b768-3efbccc06283', 'developer', 'Nha phat trien — dang va quan ly game', '2026-06-29 17:24:18.826633+00');
INSERT INTO public.roles (id, name, description, created_at) VALUES ('300652b1-bf50-41de-92d5-3b01e3a9c90e', 'customer', 'Khách hàng — xem và mua game, asset, tham gia cộng đồng', '2026-06-29 17:24:20.186384+00');

-- ============================================================
--  PRIMARY KEYS
-- ============================================================

ALTER TABLE ONLY public.ai_review_reports ADD CONSTRAINT ai_review_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_tags ADD CONSTRAINT asset_tags_pkey PRIMARY KEY (asset_id, tag_id);
ALTER TABLE ONLY public.assets ADD CONSTRAINT assets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cart_items ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_name_key UNIQUE (name);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.chat_media ADD CONSTRAINT chat_media_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_reactions ADD CONSTRAINT chat_reactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.community_chats ADD CONSTRAINT community_chats_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.disputes ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.external_publishes ADD CONSTRAINT external_publishes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.game_tags ADD CONSTRAINT game_tags_pkey PRIMARY KEY (game_id, tag_id);
ALTER TABLE ONLY public.game_versions ADD CONSTRAINT game_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.games ADD CONSTRAINT games_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.media ADD CONSTRAINT media_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_settings ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.source_snapshots ADD CONSTRAINT source_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.store_download_stats ADD CONSTRAINT store_download_stats_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tags ADD CONSTRAINT tags_name_key UNIQUE (name);
ALTER TABLE ONLY public.tags ADD CONSTRAINT tags_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tags ADD CONSTRAINT tags_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_ip_logs ADD CONSTRAINT user_ip_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_github_id_key UNIQUE (github_id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wallets ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);

-- ============================================================
--  UNIQUE CONSTRAINTS
-- ============================================================

-- V4: Order-Transaction 1:1 (dùng qua payment_id thay transaction_id, nhưng giữ để tương thích)
ALTER TABLE ONLY public.cart_items ADD CONSTRAINT uq_cart_item UNIQUE (user_id, asset_id);
ALTER TABLE ONLY public.chat_reactions ADD CONSTRAINT uq_chat_reaction UNIQUE (chat_id, user_id);
-- V21: 1 game chỉ có 1 contract
ALTER TABLE ONLY public.contracts ADD CONSTRAINT uq_contracts_game_id UNIQUE (game_id);
ALTER TABLE ONLY public.game_versions ADD CONSTRAINT uq_game_version UNIQUE (game_id, version_number);
-- V36: thêm unique (buyer_id, game_id)
ALTER TABLE ONLY public.orders ADD CONSTRAINT uq_order_game UNIQUE (buyer_id, game_id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT uq_order_marketplace UNIQUE (buyer_id, asset_id);
ALTER TABLE ONLY public.reviews ADD CONSTRAINT uq_review_item UNIQUE (user_id, asset_id);
ALTER TABLE ONLY public.store_download_stats ADD CONSTRAINT uq_store_stat UNIQUE (game_id, stat_date);
ALTER TABLE ONLY public.withdrawal_requests ADD CONSTRAINT uq_withdrawal_requests_transaction UNIQUE (transaction_id);

-- ============================================================
--  INDEXES
-- ============================================================

CREATE INDEX idx_ai_review_created ON public.ai_review_reports USING btree (created_at DESC);
CREATE INDEX idx_ai_review_game ON public.ai_review_reports USING btree (game_id);
CREATE INDEX idx_ai_review_item ON public.ai_review_reports USING btree (asset_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);
CREATE INDEX idx_cart_items_game_id ON public.cart_items USING btree (game_id);
CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);
CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);
CREATE INDEX idx_chat_media_chat_id ON public.chat_media USING btree (chat_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (sender_id, recipient_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);
CREATE INDEX idx_chat_reactions_chat_id ON public.chat_reactions USING btree (chat_id);
CREATE INDEX idx_chat_reactions_user_id ON public.chat_reactions USING btree (user_id);
CREATE INDEX idx_code_embeddings_game_id ON public.code_embeddings USING btree (game_id);
CREATE INDEX idx_code_embeddings_vector ON public.code_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_community_chats_active ON public.community_chats USING btree (game_id, created_at DESC) WHERE (is_deleted = false);
CREATE INDEX idx_community_chats_created_at ON public.community_chats USING btree (created_at DESC);
CREATE INDEX idx_community_chats_game_id ON public.community_chats USING btree (game_id);
CREATE INDEX idx_community_chats_original_id ON public.community_chats USING btree (original_chat_id) WHERE (original_chat_id IS NOT NULL);
CREATE INDEX idx_community_chats_parent_message_id ON public.community_chats USING btree (parent_message_id);
CREATE INDEX idx_community_chats_sender_id ON public.community_chats USING btree (sender_id);
CREATE INDEX idx_contracts_game_id ON public.contracts USING btree (game_id);
CREATE INDEX idx_contracts_seller_id ON public.contracts USING btree (seller_id);
CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX idx_disputes_reporter ON public.disputes USING btree (reporter_id);
CREATE INDEX idx_disputes_seller ON public.disputes USING btree (reported_seller_id);
CREATE INDEX idx_disputes_status ON public.disputes USING btree (status);
-- V39: index cho embeddings
CREATE UNIQUE INDEX uq_embeddings_user_face ON public.embeddings (user_id) WHERE type = 'face';
CREATE INDEX idx_embeddings_user_id ON public.embeddings USING btree (user_id);
CREATE INDEX idx_embeddings_type ON public.embeddings USING btree (type);
CREATE INDEX idx_embeddings_vector_128 ON public.embeddings USING ivfflat (embedding_128 public.vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_embeddings_vector_512 ON public.embeddings USING ivfflat (embedding_512 public.vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_ext_publishes_game_id ON public.external_publishes USING btree (game_id);
CREATE INDEX idx_ext_publishes_status ON public.external_publishes USING btree (status);
CREATE INDEX idx_ext_publishes_version_id ON public.external_publishes USING btree (game_version_id);
CREATE INDEX idx_game_tags_tag_id ON public.game_tags USING btree (tag_id);
CREATE INDEX idx_game_versions_game_id ON public.game_versions USING btree (game_id);
CREATE INDEX idx_game_versions_is_current ON public.game_versions USING btree (game_id, is_current) WHERE (is_current = true);
CREATE INDEX idx_games_category_id ON public.games USING btree (category_id);
CREATE INDEX idx_games_creator_id ON public.games USING btree (creator_id);
CREATE INDEX idx_games_publishing_type ON public.games USING btree (publishing_type);
CREATE INDEX idx_games_source_listed ON public.games USING btree (is_source_listed) WHERE (is_source_listed = true);
CREATE INDEX idx_games_status ON public.games USING btree (status);
CREATE INDEX idx_ip_logs_action ON public.user_ip_logs USING btree (action);
CREATE INDEX idx_ip_logs_ip_address ON public.user_ip_logs USING btree (ip_address);
CREATE INDEX idx_ip_logs_logged_at ON public.user_ip_logs USING btree (logged_at DESC);
CREATE INDEX idx_ip_logs_review_spam ON public.user_ip_logs USING btree (ip_address, logged_at DESC) WHERE ((action)::text = 'post_review'::text);
CREATE INDEX idx_ip_logs_user_id ON public.user_ip_logs USING btree (user_id);
CREATE INDEX idx_marketplace_category ON public.assets USING btree (category_id);
CREATE INDEX idx_marketplace_item_tags_tag ON public.asset_tags USING btree (tag_id);
CREATE INDEX idx_marketplace_item_tags_tag_id ON public.asset_tags USING btree (tag_id);
CREATE INDEX idx_marketplace_seller_id ON public.assets USING btree (seller_id);
CREATE INDEX idx_marketplace_status ON public.assets USING btree (status);
CREATE INDEX idx_media_game ON public.media USING btree (game_id) WHERE (game_id IS NOT NULL);
CREATE INDEX idx_media_asset ON public.media USING btree (asset_id) WHERE (asset_id IS NOT NULL);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (recipient_id, is_read);
CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);
CREATE INDEX idx_orders_buyer_id ON public.orders USING btree (buyer_id);
CREATE INDEX idx_orders_marketplace_item_id ON public.orders USING btree (asset_id);
CREATE INDEX idx_orders_purchased_at ON public.orders USING btree (purchased_at DESC);
CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at DESC);
CREATE INDEX idx_payments_status ON public.payments USING btree (payment_status);
CREATE INDEX idx_plagiarism_flags_game_id ON public.plagiarism_flags USING btree (game_id);
CREATE INDEX idx_plagiarism_flags_matched_game_id ON public.plagiarism_flags USING btree (matched_game_id);
CREATE INDEX idx_reviews_marketplace_item ON public.reviews USING btree (asset_id);
CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);
CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);
CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);
CREATE INDEX idx_risk_events_device_id ON public.risk_events USING btree (device_fingerprint_id);
CREATE INDEX idx_risk_events_ip_address ON public.risk_events USING btree (ip_address);
CREATE INDEX idx_risk_events_created_at ON public.risk_events USING btree (created_at);
CREATE INDEX idx_source_commits_game_id ON public.source_commits USING btree (game_id);
CREATE INDEX idx_source_snapshots_bundle ON public.source_snapshots USING btree (bundle_hash);
CREATE INDEX idx_source_snapshots_game ON public.source_snapshots USING btree (game_id);
CREATE INDEX idx_store_stats_game_date ON public.store_download_stats USING btree (game_id, stat_date DESC);
CREATE INDEX idx_store_stats_game_id ON public.store_download_stats USING btree (game_id);
CREATE INDEX idx_store_stats_stat_date ON public.store_download_stats USING btree (stat_date DESC);
CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);
CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);
CREATE INDEX idx_transactions_asset_id ON public.transactions USING btree (asset_id);
CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);
CREATE INDEX idx_transactions_wallet_id ON public.transactions USING btree (wallet_id);
CREATE INDEX idx_users_github_id ON public.users USING btree (github_id) WHERE (github_id IS NOT NULL);
CREATE INDEX idx_users_preferred_language ON public.users USING btree (preferred_language);
CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);
CREATE INDEX idx_users_status ON public.users USING btree (status);
CREATE INDEX idx_withdrawal_status ON public.withdrawal_requests USING btree (status);
CREATE INDEX idx_withdrawal_user_id ON public.withdrawal_requests USING btree (user_id);

CREATE UNIQUE INDEX uq_payments_payos_order_code ON public.payments USING btree (payos_order_code) WHERE (payos_order_code IS NOT NULL);
CREATE UNIQUE INDEX uq_payments_payos_payment_link_id ON public.payments USING btree (payos_payment_link_id) WHERE (payos_payment_link_id IS NOT NULL);

-- ============================================================
--  FOREIGN KEYS
-- ============================================================

ALTER TABLE ONLY public.ai_review_reports
    ADD CONSTRAINT ai_review_reports_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_review_reports
    ADD CONSTRAINT ai_review_reports_marketplace_item_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_marketplace_item_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.chat_media
    ADD CONSTRAINT chat_media_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_original_chat_id_fkey FOREIGN KEY (original_chat_id) REFERENCES public.community_chats(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_reported_seller_id_fkey FOREIGN KEY (reported_seller_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_game_version_id_fkey FOREIGN KEY (game_version_id) REFERENCES public.game_versions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT game_versions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.asset_tags
    ADD CONSTRAINT marketplace_item_tags_marketplace_item_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.asset_tags
    ADD CONSTRAINT marketplace_item_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT marketplace_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT marketplace_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_marketplace_item_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_marketplace_item_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.source_snapshots
    ADD CONSTRAINT source_snapshots_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT store_download_stats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_transactions_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_ip_logs
    ADD CONSTRAINT user_ip_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

-- Consolidated constraints & indexes for new tables
ALTER TABLE ONLY public.code_embeddings
    ADD CONSTRAINT fk_code_embeddings_game FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.embeddings
    ADD CONSTRAINT fk_embeddings_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.plagiarism_flags
    ADD CONSTRAINT fk_plagiarism_flags_game FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.plagiarism_flags
    ADD CONSTRAINT fk_plagiarism_flags_matched_game FOREIGN KEY (matched_game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.source_commits
    ADD CONSTRAINT fk_source_commits_game FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

CREATE INDEX idx_banned_bank ON public.banned_identities USING btree (bank_account);
CREATE INDEX idx_banned_kyc ON public.banned_identities USING btree (kyc_id_number);
CREATE INDEX idx_banned_face ON public.banned_identities USING ivfflat (face_embedding public.vector_cosine_ops) WITH (lists='100');

ALTER TABLE ONLY public.banned_identities
    ADD CONSTRAINT banned_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

