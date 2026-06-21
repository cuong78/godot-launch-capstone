--
-- PostgreSQL database dump
--

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg12+1)
-- Dumped by pg_dump version 17.5

-- Started on 2026-06-22 00:31:47

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3 (class 3079 OID 16435)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- TOC entry 2 (class 3079 OID 16398)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 4380 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 4 (class 3079 OID 17624)
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- TOC entry 4381 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- TOC entry 1223 (class 1247 OID 17524)
-- Name: actor_role_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.actor_role_enum AS ENUM (
    'developer',
    'admin',
    'customer'
);


ALTER TYPE public.actor_role_enum OWNER TO user_godot_launch;

--
-- TOC entry 1088 (class 1247 OID 16568)
-- Name: ai_rec_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.ai_rec_enum AS ENUM (
    'approve',
    'marketplace',
    'reject'
);


ALTER TYPE public.ai_rec_enum OWNER TO user_godot_launch;

--
-- TOC entry 1124 (class 1247 OID 16682)
-- Name: audit_action_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

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
    'security_alert'
);


ALTER TYPE public.audit_action_enum OWNER TO user_godot_launch;

--
-- TOC entry 1127 (class 1247 OID 16726)
-- Name: audit_target_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

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
    'community_chat'
);


ALTER TYPE public.audit_target_enum OWNER TO user_godot_launch;

--
-- TOC entry 1211 (class 1247 OID 17432)
-- Name: chat_media_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.chat_media_type_enum AS ENUM (
    'image',
    'video'
);


ALTER TYPE public.chat_media_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1094 (class 1247 OID 16582)
-- Name: contract_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.contract_status_enum AS ENUM (
    'pending',
    'signed',
    'expired',
    'cancelled',
    'negotiating',
    're_issued'
);


ALTER TYPE public.contract_status_enum OWNER TO user_godot_launch;

--
-- TOC entry 1091 (class 1247 OID 16576)
-- Name: contract_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.contract_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing'
);


ALTER TYPE public.contract_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1115 (class 1247 OID 16640)
-- Name: ext_platform_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.ext_platform_enum AS ENUM (
    'google_play',
    'app_store'
);


ALTER TYPE public.ext_platform_enum OWNER TO user_godot_launch;

--
-- TOC entry 1118 (class 1247 OID 16646)
-- Name: ext_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.ext_status_enum AS ENUM (
    'pending',
    'submitted',
    'live',
    'rejected',
    'removed'
);


ALTER TYPE public.ext_status_enum OWNER TO user_godot_launch;

--
-- TOC entry 1082 (class 1247 OID 16548)
-- Name: game_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.game_status_enum AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'published'
);


ALTER TYPE public.game_status_enum OWNER TO user_godot_launch;

--
-- TOC entry 1109 (class 1247 OID 16624)
-- Name: item_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.item_status_enum AS ENUM (
    'active',
    'removed',
    'pending',
    'rejected'
);


ALTER TYPE public.item_status_enum OWNER TO user_godot_launch;

--
-- TOC entry 1106 (class 1247 OID 16618)
-- Name: item_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.item_type_enum AS ENUM (
    'source_code',
    'asset'
);


ALTER TYPE public.item_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1121 (class 1247 OID 16658)
-- Name: notif_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.notif_type_enum AS ENUM (
    'game_submitted',
    'game_approved',
    'game_rejected',
    'game_published',
    'contract_ready',
    'payment_received',
    'withdrawal_processed',
    'new_review',
    'security_alert',
    'system_message',
    'new_chat_message'
);


ALTER TYPE public.notif_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1103 (class 1247 OID 16614)
-- Name: order_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.order_type_enum AS ENUM (
    'source_code_purchase'
);


ALTER TYPE public.order_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1079 (class 1247 OID 16541)
-- Name: publishing_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.publishing_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing',
    'marketplace_listing'
);


ALTER TYPE public.publishing_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1208 (class 1247 OID 17418)
-- Name: reaction_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.reaction_type_enum AS ENUM (
    'like',
    'love',
    'haha',
    'wow',
    'sad',
    'angry'
);


ALTER TYPE public.reaction_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1085 (class 1247 OID 16560)
-- Name: security_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.security_status_enum AS ENUM (
    'clean',
    'suspicious',
    'malware'
);


ALTER TYPE public.security_status_enum OWNER TO user_godot_launch;

--
-- TOC entry 1100 (class 1247 OID 16604)
-- Name: txn_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.txn_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE public.txn_status_enum OWNER TO user_godot_launch;

--
-- TOC entry 1097 (class 1247 OID 16592)
-- Name: txn_type_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.txn_type_enum AS ENUM (
    'source_code_purchase',
    'withdrawal',
    'revenue_share',
    'commission',
    'refund'
);


ALTER TYPE public.txn_type_enum OWNER TO user_godot_launch;

--
-- TOC entry 1112 (class 1247 OID 16630)
-- Name: withdrawal_status_enum; Type: TYPE; Schema: public; Owner: user_godot_launch
--

CREATE TYPE public.withdrawal_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);


ALTER TYPE public.withdrawal_status_enum OWNER TO user_godot_launch;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16898)
-- Name: ai_reports; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.ai_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_version_id uuid NOT NULL,
    quality_score smallint,
    originality_score smallint,
    security_status public.security_status_enum DEFAULT 'clean'::public.security_status_enum NOT NULL,
    trend_score smallint,
    recommendation public.ai_rec_enum NOT NULL,
    suggested_price numeric(15,2),
    suggested_revenue_split smallint,
    raw_result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_reports_originality_score_check CHECK (((originality_score >= 0) AND (originality_score <= 100))),
    CONSTRAINT ai_reports_quality_score_check CHECK (((quality_score >= 0) AND (quality_score <= 100))),
    CONSTRAINT ai_reports_suggested_price_check CHECK ((suggested_price >= (0)::numeric)),
    CONSTRAINT ai_reports_suggested_revenue_split_check CHECK (((suggested_revenue_split >= 0) AND (suggested_revenue_split <= 100))),
    CONSTRAINT ai_reports_trend_score_check CHECK (((trend_score >= 0) AND (trend_score <= 100)))
);


ALTER TABLE public.ai_reports OWNER TO user_godot_launch;

--
-- TOC entry 4382 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE ai_reports; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.ai_reports IS 'Moi game_version co 1 bao cao AI (UNIQUE game_version_id)';


--
-- TOC entry 4383 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN ai_reports.game_version_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.ai_reports.game_version_id IS 'FK → game_versions, KHONG phai games — fix v3.0';


--
-- TOC entry 237 (class 1259 OID 17203)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_role public.actor_role_enum NOT NULL,
    action public.audit_action_enum NOT NULL,
    target_type public.audit_target_enum NOT NULL,
    target_id uuid NOT NULL,
    old_value jsonb,
    new_value jsonb,
    note text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO user_godot_launch;

--
-- TOC entry 4384 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.audit_logs IS 'IMMUTABLE — REVOKE UPDATE/DELETE. actor_id NULL = AI/system tu dong.';


--
-- TOC entry 243 (class 1259 OID 17364)
-- Name: banned_ips; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.banned_ips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address inet NOT NULL,
    reason character varying(200) NOT NULL,
    related_user_id uuid,
    banned_by uuid,
    banned_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    notes text
);


ALTER TABLE public.banned_ips OWNER TO user_godot_launch;

--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE banned_ips; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.banned_ips IS 'IP bi chan — check tai API gateway truoc khi xu ly request';


--
-- TOC entry 4386 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN banned_ips.ip_address; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.banned_ips.ip_address IS 'INET: ho tro ca IPv4 va IPv6. UNIQUE: 1 IP 1 record.';


--
-- TOC entry 4387 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN banned_ips.related_user_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.banned_ips.related_user_id IS 'Account da dan den lenh ban — de admin tra vet';


--
-- TOC entry 4388 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN banned_ips.expires_at; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.banned_ips.expires_at IS 'NULL = vinh vien | NOT NULL = co thoi han';


--
-- TOC entry 234 (class 1259 OID 17134)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    marketplace_item_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cart_items OWNER TO user_godot_launch;

--
-- TOC entry 4389 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE cart_items; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.cart_items IS 'Gio hang: source code hoac asset tren Marketplace';


--
-- TOC entry 221 (class 1259 OID 16801)
-- Name: categories; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO user_godot_launch;

--
-- TOC entry 4390 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.categories IS 'Danh muc game, ho tro cha-con qua parent_id';


--
-- TOC entry 4391 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN categories.slug; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.categories.slug IS 'URL-friendly, vd: action-rpg';


--
-- TOC entry 4392 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN categories.parent_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.categories.parent_id IS 'NULL = top-level category';


--
-- TOC entry 245 (class 1259 OID 17447)
-- Name: chat_media; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.chat_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    url text NOT NULL,
    media_type public.chat_media_type_enum NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_media OWNER TO user_godot_launch;

--
-- TOC entry 248 (class 1259 OID 17541)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO user_godot_launch;

--
-- TOC entry 246 (class 1259 OID 17462)
-- Name: chat_reactions; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type public.reaction_type_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_reactions OWNER TO user_godot_launch;

--
-- TOC entry 236 (class 1259 OID 17171)
-- Name: community_chats; Type: TABLE; Schema: public; Owner: user_godot_launch
--

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


ALTER TABLE public.community_chats OWNER TO user_godot_launch;

--
-- TOC entry 4393 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE community_chats; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.community_chats IS 'Chat cong dong: global hoac theo game. Ho tro reply thread.';


--
-- TOC entry 4394 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN community_chats.game_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.community_chats.game_id IS 'NULL = global chat | NOT NULL = discussion theo game';


--
-- TOC entry 4395 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN community_chats.parent_message_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.community_chats.parent_message_id IS 'NULL = tin nhan goc | NOT NULL = reply';


--
-- TOC entry 4396 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN community_chats.is_deleted; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.community_chats.is_deleted IS 'Soft delete: admin xem duoc noi dung, user thay [da xoa]';


--
-- TOC entry 227 (class 1259 OID 16923)
-- Name: contracts; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid,
    contract_type public.contract_type_enum NOT NULL,
    terms_hash character varying(64) NOT NULL,
    pdf_url text NOT NULL,
    status public.contract_status_enum DEFAULT 'pending'::public.contract_status_enum NOT NULL,
    revenue_split smallint,
    signed_at_seller timestamp with time zone,
    signed_at_buyer timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lump_sum_amount character varying(255),
    dispute_resolution_clause text,
    additional_terms text,
    buyer_representative character varying(255),
    buyer_position character varying(255),
    seller_representative character varying(255),
    seller_address text,
    seller_tax_code character varying(100),
    seller_signature_base64 text,
    buyer_signature_base64 text,
    rejection_reason text,
    CONSTRAINT contracts_revenue_split_check CHECK (((revenue_split >= 0) AND (revenue_split <= 100)))
);


ALTER TABLE public.contracts OWNER TO user_godot_launch;

--
-- TOC entry 4397 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE contracts; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.contracts IS 'Hop dong phap ly — CHI cho full_acquisition va co_publishing';


--
-- TOC entry 4398 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN contracts.buyer_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.contracts.buyer_id IS 'NULL = platform mua dut';


--
-- TOC entry 4399 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN contracts.revenue_split; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.contracts.revenue_split IS '% cho developer (chi co_publishing)';


--
-- TOC entry 239 (class 1259 OID 17261)
-- Name: external_publishes; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.external_publishes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    game_version_id uuid NOT NULL,
    platform public.ext_platform_enum NOT NULL,
    status public.ext_status_enum DEFAULT 'pending'::public.ext_status_enum NOT NULL,
    external_app_id character varying(200),
    store_url text,
    submitted_at timestamp with time zone,
    live_at timestamp with time zone,
    rejected_reason text,
    submitted_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.external_publishes OWNER TO user_godot_launch;

--
-- TOC entry 4400 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE external_publishes; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.external_publishes IS 'Theo doi tung lan submit game len Google Play / App Store';


--
-- TOC entry 4401 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN external_publishes.game_version_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.external_publishes.game_version_id IS 'Version cu the duoc submit — biet Google Play/AppStore dang chay version nao';


--
-- TOC entry 253 (class 1259 OID 17952)
-- Name: face_embeddings; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.face_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    embedding public.vector(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.face_embeddings OWNER TO user_godot_launch;

--
-- TOC entry 235 (class 1259 OID 17154)
-- Name: favorites; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    game_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.favorites OWNER TO user_godot_launch;

--
-- TOC entry 4402 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE favorites; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.favorites IS 'Danh sach game yeu thich / wishlist cua user';


--
-- TOC entry 218 (class 1259 OID 16389)
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO user_godot_launch;

--
-- TOC entry 247 (class 1259 OID 17485)
-- Name: game_media; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.game_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    media_type character varying(20) NOT NULL,
    media_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT game_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[])))
);


ALTER TABLE public.game_media OWNER TO user_godot_launch;

--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE game_media; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.game_media IS 'Lưu trữ các hình ảnh chụp màn hình (screenshots) và video gameplay của game';


--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN game_media.media_type; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.game_media.media_type IS 'Loại tài nguyên: image hoặc video';


--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN game_media.media_url; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.game_media.media_url IS 'Đường dẫn URL tệp tin lưu trữ trên S3';


--
-- TOC entry 224 (class 1259 OID 16863)
-- Name: game_tags; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.game_tags (
    game_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.game_tags OWNER TO user_godot_launch;

--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE game_tags; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.game_tags IS 'Nhieu-nhieu: 1 game co nhieu tag, 1 tag thuoc nhieu game';


--
-- TOC entry 225 (class 1259 OID 16879)
-- Name: game_versions; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.game_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    version_number character varying(50) NOT NULL,
    changelog text,
    file_url text NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    released_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_versions OWNER TO user_godot_launch;

--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE game_versions; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.game_versions IS 'Lich su phien ban game — 1 phien ban la current tai 1 thoi diem';


--
-- TOC entry 223 (class 1259 OID 16833)
-- Name: games; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    category_id uuid,
    title character varying(200) NOT NULL,
    description text,
    thumbnail_url text,
    file_url text,
    status public.game_status_enum DEFAULT 'draft'::public.game_status_enum NOT NULL,
    publishing_type public.publishing_type_enum,
    price_proposed numeric(15,2),
    download_count integer DEFAULT 0 NOT NULL,
    is_source_listed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT games_download_count_check CHECK ((download_count >= 0)),
    CONSTRAINT games_price_proposed_check CHECK ((price_proposed >= (0)::numeric))
);


ALTER TABLE public.games OWNER TO user_godot_launch;

--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE games; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.games IS 'Game tren nen tang GodotLaunch';


--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN games.price_proposed; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.games.price_proposed IS 'Gia de xuat cho full_acquisition / co_publishing. Gia marketplace nam o marketplace_items.price';


--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN games.download_count; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.games.download_count IS 'Cached tong luot tai source code — cap nhat qua trigger + cron, tranh COUNT(*)';


--
-- TOC entry 4411 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN games.is_source_listed; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.games.is_source_listed IS 'TRUE = dang co marketplace_items listing cho source code cua game nay';


--
-- TOC entry 230 (class 1259 OID 17002)
-- Name: marketplace_items; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.marketplace_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    category_id uuid,
    item_type public.item_type_enum NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    price numeric(15,2) NOT NULL,
    file_url text NOT NULL,
    godot_version character varying(20),
    source_game_id uuid,
    github_repo_url text,
    github_verified_at timestamp with time zone,
    status public.item_status_enum DEFAULT 'active'::public.item_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_source_needs_github CHECK (((item_type <> 'source_code'::public.item_type_enum) OR ((github_repo_url IS NOT NULL) AND (github_verified_at IS NOT NULL)))),
    CONSTRAINT chk_source_needs_godot_version CHECK (((item_type <> 'source_code'::public.item_type_enum) OR (godot_version IS NOT NULL))),
    CONSTRAINT marketplace_items_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.marketplace_items OWNER TO user_godot_launch;

--
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE marketplace_items; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.marketplace_items IS 'Cho ban source code Godot (source_code) va asset le';


--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN marketplace_items.item_type; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.marketplace_items.item_type IS 'source_code = Godot project day du | asset = tai nguyen le';


--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN marketplace_items.file_url; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.marketplace_items.file_url IS 'URL file ZIP: Godot project hoac asset pack';


--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN marketplace_items.godot_version; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.marketplace_items.godot_version IS 'Phien ban Godot tuong thich — bat buoc voi source_code';


--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN marketplace_items.source_game_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.marketplace_items.source_game_id IS 'FK → games neu ban source cua game tren Platform. NULL = doc lap';


--
-- TOC entry 4417 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN marketplace_items.github_repo_url; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.marketplace_items.github_repo_url IS 'URL GitHub repo — bang chung so huu, bat buoc voi source_code';


--
-- TOC entry 244 (class 1259 OID 17388)
-- Name: media_files; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.media_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid,
    marketplace_item_id uuid,
    media_type character varying(20) NOT NULL,
    url text NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    alt_text character varying(200),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_media_one_owner CHECK ((((game_id IS NOT NULL) AND (marketplace_item_id IS NULL)) OR ((game_id IS NULL) AND (marketplace_item_id IS NOT NULL)))),
    CONSTRAINT media_files_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['screenshot'::character varying, 'video'::character varying, 'thumbnail'::character varying, 'banner'::character varying])::text[])))
);


ALTER TABLE public.media_files OWNER TO user_godot_launch;

--
-- TOC entry 4418 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE media_files; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.media_files IS 'Anh/video cho games VA marketplace_items — game_id XOR marketplace_item_id';


--
-- TOC entry 4419 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN media_files.game_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.media_files.game_id IS 'FK → games. NULL neu owner la marketplace_item';


--
-- TOC entry 4420 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN media_files.marketplace_item_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.media_files.marketplace_item_id IS 'FK → marketplace_items. NULL neu owner la game';


--
-- TOC entry 4421 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN media_files.media_type; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.media_files.media_type IS 'screenshot | video | thumbnail | banner';


--
-- TOC entry 4422 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN media_files.display_order; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.media_files.display_order IS 'Thu tu hien thi — Google Play / App Store dung thu tu nay';


--
-- TOC entry 249 (class 1259 OID 17565)
-- Name: notifications; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    target_id character varying(255),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO user_godot_launch;

--
-- TOC entry 231 (class 1259 OID 17038)
-- Name: orders; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid NOT NULL,
    order_type public.order_type_enum NOT NULL,
    marketplace_item_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    price_paid numeric(15,2) NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_price_paid_check CHECK ((price_paid >= (0)::numeric))
);


ALTER TABLE public.orders OWNER TO user_godot_launch;

--
-- TOC entry 4423 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.orders IS 'Don hang mua source code hoac asset tren Marketplace';


--
-- TOC entry 4424 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN orders.marketplace_item_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.orders.marketplace_item_id IS 'NOT NULL: source code hoac asset duoc mua';


--
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN orders.price_paid; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.orders.price_paid IS 'Gia thuc te thanh toan, co the khac gia niem yet neu co discount';


--
-- TOC entry 238 (class 1259 OID 17241)
-- Name: publishing_guides; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.publishing_guides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    step_order smallint NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    tip text,
    video_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT publishing_guides_step_order_check CHECK ((step_order > 0))
);


ALTER TABLE public.publishing_guides OWNER TO user_godot_launch;

--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE publishing_guides; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.publishing_guides IS 'Noi dung tung buoc Publishing Wizard — admin tao va chinh sua';


--
-- TOC entry 233 (class 1259 OID 17102)
-- Name: reviews; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    marketplace_item_id uuid NOT NULL,
    rating smallint NOT NULL,
    comment text,
    is_approved boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO user_godot_launch;

--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.reviews IS 'Verified buyer review — chi sau khi mua (order_id bat buoc)';


--
-- TOC entry 4428 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN reviews.order_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.reviews.order_id IS 'FK → orders — xac nhan da mua truoc khi review';


--
-- TOC entry 4429 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN reviews.marketplace_item_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.reviews.marketplace_item_id IS 'San pham duoc review (source_code hoac asset)';


--
-- TOC entry 219 (class 1259 OID 16765)
-- Name: roles; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO user_godot_launch;

--
-- TOC entry 4430 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.roles IS 'Bang role tach khoi enum: de them role moi ma khong can ALTER TYPE';


--
-- TOC entry 240 (class 1259 OID 17293)
-- Name: source_downloads; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.source_downloads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    marketplace_item_id uuid NOT NULL,
    order_id uuid NOT NULL,
    ip_address inet,
    device_info character varying(200),
    downloaded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.source_downloads OWNER TO user_godot_launch;

--
-- TOC entry 4431 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE source_downloads; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.source_downloads IS 'Moi luot tai source code / asset — KHONG UNIQUE (tai lai nhieu lan)';


--
-- TOC entry 4432 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN source_downloads.marketplace_item_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.source_downloads.marketplace_item_id IS 'Source code hoac asset duoc tai';


--
-- TOC entry 4433 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN source_downloads.order_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.source_downloads.order_id IS 'Bat buoc: phai co order source_code_purchase hop le';


--
-- TOC entry 4434 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN source_downloads.device_info; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.source_downloads.device_info IS 'OS + may tinh, ho tro analytics';


--
-- TOC entry 250 (class 1259 OID 17585)
-- Name: storage_accounts; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.storage_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    provider character varying(20) NOT NULL,
    config text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT storage_accounts_provider_check CHECK (((provider)::text = ANY ((ARRAY['aws_s3'::character varying, 'seaweedfs'::character varying])::text[])))
);


ALTER TABLE public.storage_accounts OWNER TO user_godot_launch;

--
-- TOC entry 251 (class 1259 OID 17597)
-- Name: storage_buckets; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.storage_buckets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    region character varying(50),
    public_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_buckets OWNER TO user_godot_launch;

--
-- TOC entry 252 (class 1259 OID 17611)
-- Name: storage_routing; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.storage_routing (
    file_type character varying(50) NOT NULL,
    bucket_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_routing OWNER TO user_godot_launch;

--
-- TOC entry 241 (class 1259 OID 17321)
-- Name: store_download_stats; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.store_download_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    platform public.ext_platform_enum NOT NULL,
    stat_date date NOT NULL,
    downloads integer DEFAULT 0 NOT NULL,
    installs integer DEFAULT 0 NOT NULL,
    revenue numeric(15,2) DEFAULT 0.00 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_download_stats_downloads_check CHECK ((downloads >= 0)),
    CONSTRAINT store_download_stats_installs_check CHECK ((installs >= 0))
);


ALTER TABLE public.store_download_stats OWNER TO user_godot_launch;

--
-- TOC entry 4435 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE store_download_stats; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.store_download_stats IS 'Aggregate stats tu Google Play / App Store API — cron job pull hang ngay';


--
-- TOC entry 4436 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN store_download_stats.downloads; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.store_download_stats.downloads IS 'Luot tai trong ngay stat_date';


--
-- TOC entry 4437 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN store_download_stats.installs; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.store_download_stats.installs IS 'Luot cai dat moi (Google Play phan biet downloads vs installs)';


--
-- TOC entry 4438 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN store_download_stats.revenue; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.store_download_stats.revenue IS 'Doanh thu trong ngay tu store, dung doi soat voi transactions';


--
-- TOC entry 4439 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN store_download_stats.fetched_at; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.store_download_stats.fetched_at IS 'Thoi diem pull tu API, de biet data co fresh khong';


--
-- TOC entry 222 (class 1259 OID 16821)
-- Name: tags; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tags OWNER TO user_godot_launch;

--
-- TOC entry 4440 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE tags; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.tags IS 'Tag game: nhieu-nhieu voi games qua bang game_tags';


--
-- TOC entry 229 (class 1259 OID 16970)
-- Name: transactions; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    related_user_id uuid,
    game_id uuid,
    amount numeric(15,2) NOT NULL,
    platform_commission numeric(15,2) DEFAULT 0.00 NOT NULL,
    net_amount numeric(15,2) NOT NULL,
    type public.txn_type_enum NOT NULL,
    status public.txn_status_enum DEFAULT 'pending'::public.txn_status_enum NOT NULL,
    reference_id character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_txn_net CHECK ((net_amount = (amount - platform_commission))),
    CONSTRAINT transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transactions_net_amount_check CHECK ((net_amount >= (0)::numeric)),
    CONSTRAINT transactions_platform_commission_check CHECK ((platform_commission >= (0)::numeric))
);


ALTER TABLE public.transactions OWNER TO user_godot_launch;

--
-- TOC entry 4441 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE transactions; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.transactions IS 'Moi giao dich tai chinh. net_amount = amount - commission (CHECK)';


--
-- TOC entry 242 (class 1259 OID 17344)
-- Name: user_ip_logs; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.user_ip_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address inet NOT NULL,
    action character varying(50) NOT NULL,
    user_agent text,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_ip_logs_action_check CHECK (((action)::text = ANY ((ARRAY['register'::character varying, 'login'::character varying, 'upload_source'::character varying, 'submit_game'::character varying, 'post_review'::character varying, 'post_chat'::character varying, 'checkout'::character varying])::text[])))
);


ALTER TABLE public.user_ip_logs OWNER TO user_godot_launch;

--
-- TOC entry 4442 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE user_ip_logs; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.user_ip_logs IS 'Log IP cho cac action quan trong — phat hien spam va ho tro ban IP';


--
-- TOC entry 4443 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_ip_logs.user_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.user_ip_logs.user_id IS 'NULL = anonymous attempt (spam dang ky, brute force...)';


--
-- TOC entry 4444 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_ip_logs.action; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.user_ip_logs.action IS 'Chi log action quan trong, khong log moi request';


--
-- TOC entry 4445 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_ip_logs.user_agent; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.user_ip_logs.user_agent IS 'Giup phan biet bot vs nguoi that';


--
-- TOC entry 220 (class 1259 OID 16776)
-- Name: users; Type: TABLE; Schema: public; Owner: user_godot_launch
--

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
    CONSTRAINT chk_github_fields CHECK (((github_id IS NULL) OR ((github_id IS NOT NULL) AND (github_username IS NOT NULL) AND (github_token_enc IS NOT NULL) AND (github_linked_at IS NOT NULL)))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'banned'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO user_godot_launch;

--
-- TOC entry 4446 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.users IS 'Nguoi dung. GitHub OAuth bat buoc de ban source code.';


--
-- TOC entry 4447 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users.role_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.users.role_id IS 'FK den roles.id';


--
-- TOC entry 4448 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.users.email IS 'CITEXT: khong phan biet hoa/thuong';


--
-- TOC entry 4449 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hash, cost >= 12';


--
-- TOC entry 4450 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users.github_id; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.users.github_id IS 'GitHub user ID — NULL = chua lien ket, khong duoc ban source';


--
-- TOC entry 4451 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users.github_token_enc; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.users.github_token_enc IS 'AES-256 encrypted OAuth token — giai ma o tang application khi can verify repo';


--
-- TOC entry 228 (class 1259 OID 16953)
-- Name: wallets; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_balance_check CHECK ((balance >= (0)::numeric))
);


ALTER TABLE public.wallets OWNER TO user_godot_launch;

--
-- TOC entry 4452 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE wallets; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.wallets IS '1 user co 1 wallet (UNIQUE user_id)';


--
-- TOC entry 232 (class 1259 OID 17067)
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: user_godot_launch
--

CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    bank_name character varying(200) NOT NULL,
    bank_account character varying(100) NOT NULL,
    account_holder character varying(200) NOT NULL,
    status public.withdrawal_status_enum DEFAULT 'pending'::public.withdrawal_status_enum NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    reject_reason text,
    transaction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.withdrawal_requests OWNER TO user_godot_launch;

--
-- TOC entry 4453 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE withdrawal_requests; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON TABLE public.withdrawal_requests IS 'Admin duyet thu cong truoc khi xu ly rut tien';


--
-- TOC entry 4454 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN withdrawal_requests.bank_account; Type: COMMENT; Schema: public; Owner: user_godot_launch
--

COMMENT ON COLUMN public.withdrawal_requests.bank_account IS 'Ma hoa o tang application truoc khi luu';


--
-- TOC entry 4017 (class 2606 OID 16914)
-- Name: ai_reports ai_reports_game_version_id_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_game_version_id_key UNIQUE (game_version_id);


--
-- TOC entry 4019 (class 2606 OID 16912)
-- Name: ai_reports ai_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4085 (class 2606 OID 17211)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4125 (class 2606 OID 17374)
-- Name: banned_ips banned_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_ip_address_key UNIQUE (ip_address);


--
-- TOC entry 4127 (class 2606 OID 17372)
-- Name: banned_ips banned_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_pkey PRIMARY KEY (id);


--
-- TOC entry 4069 (class 2606 OID 17140)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3986 (class 2606 OID 16811)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 3988 (class 2606 OID 16809)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3990 (class 2606 OID 16813)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 4141 (class 2606 OID 17456)
-- Name: chat_media chat_media_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_media
    ADD CONSTRAINT chat_media_pkey PRIMARY KEY (id);


--
-- TOC entry 4153 (class 2606 OID 17548)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4144 (class 2606 OID 17469)
-- Name: chat_reactions chat_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4077 (class 2606 OID 17182)
-- Name: community_chats community_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_pkey PRIMARY KEY (id);


--
-- TOC entry 4024 (class 2606 OID 16933)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 4096 (class 2606 OID 17271)
-- Name: external_publishes external_publishes_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_pkey PRIMARY KEY (id);


--
-- TOC entry 4169 (class 2606 OID 17960)
-- Name: face_embeddings face_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.face_embeddings
    ADD CONSTRAINT face_embeddings_pkey PRIMARY KEY (id);


--
-- TOC entry 4074 (class 2606 OID 17159)
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, game_id);


--
-- TOC entry 3970 (class 2606 OID 16396)
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- TOC entry 4150 (class 2606 OID 17494)
-- Name: game_media game_media_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_media
    ADD CONSTRAINT game_media_pkey PRIMARY KEY (id);


--
-- TOC entry 4008 (class 2606 OID 16867)
-- Name: game_tags game_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_pkey PRIMARY KEY (game_id, tag_id);


--
-- TOC entry 4011 (class 2606 OID 16888)
-- Name: game_versions game_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT game_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 4001 (class 2606 OID 16847)
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- TOC entry 4047 (class 2606 OID 17015)
-- Name: marketplace_items marketplace_items_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4139 (class 2606 OID 17399)
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- TOC entry 4159 (class 2606 OID 17572)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4053 (class 2606 OID 17045)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4092 (class 2606 OID 17252)
-- Name: publishing_guides publishing_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.publishing_guides
    ADD CONSTRAINT publishing_guides_pkey PRIMARY KEY (id);


--
-- TOC entry 4094 (class 2606 OID 17254)
-- Name: publishing_guides publishing_guides_step_order_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.publishing_guides
    ADD CONSTRAINT publishing_guides_step_order_key UNIQUE (step_order);


--
-- TOC entry 4065 (class 2606 OID 17112)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 3973 (class 2606 OID 16775)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 3975 (class 2606 OID 16773)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4108 (class 2606 OID 17301)
-- Name: source_downloads source_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_pkey PRIMARY KEY (id);


--
-- TOC entry 4161 (class 2606 OID 17596)
-- Name: storage_accounts storage_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.storage_accounts
    ADD CONSTRAINT storage_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 4164 (class 2606 OID 17605)
-- Name: storage_buckets storage_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.storage_buckets
    ADD CONSTRAINT storage_buckets_pkey PRIMARY KEY (id);


--
-- TOC entry 4166 (class 2606 OID 17616)
-- Name: storage_routing storage_routing_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.storage_routing
    ADD CONSTRAINT storage_routing_pkey PRIMARY KEY (file_type);


--
-- TOC entry 4114 (class 2606 OID 17332)
-- Name: store_download_stats store_download_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT store_download_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 3995 (class 2606 OID 16829)
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- TOC entry 3997 (class 2606 OID 16827)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 3999 (class 2606 OID 16831)
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- TOC entry 4038 (class 2606 OID 16982)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4072 (class 2606 OID 17142)
-- Name: cart_items uq_cart_item; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT uq_cart_item UNIQUE (user_id, marketplace_item_id);


--
-- TOC entry 4148 (class 2606 OID 17471)
-- Name: chat_reactions uq_chat_reaction; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT uq_chat_reaction UNIQUE (chat_id, user_id);


--
-- TOC entry 4102 (class 2606 OID 17273)
-- Name: external_publishes uq_game_platform; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT uq_game_platform UNIQUE (game_id, platform);


--
-- TOC entry 4015 (class 2606 OID 16890)
-- Name: game_versions uq_game_version; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT uq_game_version UNIQUE (game_id, version_number);


--
-- TOC entry 4055 (class 2606 OID 17047)
-- Name: orders uq_order_marketplace; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT uq_order_marketplace UNIQUE (buyer_id, marketplace_item_id);


--
-- TOC entry 4067 (class 2606 OID 17114)
-- Name: reviews uq_review_item; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_review_item UNIQUE (user_id, marketplace_item_id);


--
-- TOC entry 4116 (class 2606 OID 17334)
-- Name: store_download_stats uq_store_stat; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT uq_store_stat UNIQUE (game_id, platform, stat_date);


--
-- TOC entry 4123 (class 2606 OID 17353)
-- Name: user_ip_logs user_ip_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.user_ip_logs
    ADD CONSTRAINT user_ip_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3980 (class 2606 OID 16790)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3982 (class 2606 OID 16792)
-- Name: users users_github_id_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_github_id_key UNIQUE (github_id);


--
-- TOC entry 3984 (class 2606 OID 16788)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4030 (class 2606 OID 16962)
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 4032 (class 2606 OID 16964)
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- TOC entry 4059 (class 2606 OID 17079)
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4167 (class 1259 OID 17966)
-- Name: face_embeddings_embedding_idx; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX face_embeddings_embedding_idx ON public.face_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- TOC entry 3971 (class 1259 OID 16397)
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- TOC entry 4020 (class 1259 OID 16920)
-- Name: idx_ai_reports_game_version_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ai_reports_game_version_id ON public.ai_reports USING btree (game_version_id);


--
-- TOC entry 4021 (class 1259 OID 16921)
-- Name: idx_ai_reports_recommendation; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ai_reports_recommendation ON public.ai_reports USING btree (recommendation);


--
-- TOC entry 4022 (class 1259 OID 16922)
-- Name: idx_ai_reports_security_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ai_reports_security_status ON public.ai_reports USING btree (security_status);


--
-- TOC entry 4086 (class 1259 OID 17218)
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- TOC entry 4087 (class 1259 OID 17217)
-- Name: idx_audit_logs_actor_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);


--
-- TOC entry 4088 (class 1259 OID 17220)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- TOC entry 4089 (class 1259 OID 17219)
-- Name: idx_audit_logs_target; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_audit_logs_target ON public.audit_logs USING btree (target_type, target_id);


--
-- TOC entry 4128 (class 1259 OID 17387)
-- Name: idx_banned_ips_expires; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_banned_ips_expires ON public.banned_ips USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- TOC entry 4129 (class 1259 OID 17385)
-- Name: idx_banned_ips_ip; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_banned_ips_ip ON public.banned_ips USING btree (ip_address);


--
-- TOC entry 4130 (class 1259 OID 17386)
-- Name: idx_banned_ips_related_user; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_banned_ips_related_user ON public.banned_ips USING btree (related_user_id);


--
-- TOC entry 4070 (class 1259 OID 17153)
-- Name: idx_cart_items_user_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);


--
-- TOC entry 3991 (class 1259 OID 16819)
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- TOC entry 3992 (class 1259 OID 16820)
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- TOC entry 4142 (class 1259 OID 17484)
-- Name: idx_chat_media_chat_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_chat_media_chat_id ON public.chat_media USING btree (chat_id);


--
-- TOC entry 4154 (class 1259 OID 17559)
-- Name: idx_chat_messages_conversation; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (sender_id, recipient_id);


--
-- TOC entry 4155 (class 1259 OID 17560)
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);


--
-- TOC entry 4145 (class 1259 OID 17482)
-- Name: idx_chat_reactions_chat_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_chat_reactions_chat_id ON public.chat_reactions USING btree (chat_id);


--
-- TOC entry 4146 (class 1259 OID 17483)
-- Name: idx_chat_reactions_user_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_chat_reactions_user_id ON public.chat_reactions USING btree (user_id);


--
-- TOC entry 4078 (class 1259 OID 17202)
-- Name: idx_community_chats_active; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_community_chats_active ON public.community_chats USING btree (game_id, created_at DESC) WHERE (is_deleted = false);


--
-- TOC entry 4079 (class 1259 OID 17201)
-- Name: idx_community_chats_created_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_community_chats_created_at ON public.community_chats USING btree (created_at DESC);


--
-- TOC entry 4080 (class 1259 OID 17199)
-- Name: idx_community_chats_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_community_chats_game_id ON public.community_chats USING btree (game_id);


--
-- TOC entry 4081 (class 1259 OID 17446)
-- Name: idx_community_chats_original_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_community_chats_original_id ON public.community_chats USING btree (original_chat_id) WHERE (original_chat_id IS NOT NULL);


--
-- TOC entry 4082 (class 1259 OID 17200)
-- Name: idx_community_chats_parent_message_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_community_chats_parent_message_id ON public.community_chats USING btree (parent_message_id);


--
-- TOC entry 4083 (class 1259 OID 17198)
-- Name: idx_community_chats_sender_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_community_chats_sender_id ON public.community_chats USING btree (sender_id);


--
-- TOC entry 4025 (class 1259 OID 16951)
-- Name: idx_contracts_buyer_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_contracts_buyer_id ON public.contracts USING btree (buyer_id);


--
-- TOC entry 4026 (class 1259 OID 16949)
-- Name: idx_contracts_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_contracts_game_id ON public.contracts USING btree (game_id);


--
-- TOC entry 4027 (class 1259 OID 16950)
-- Name: idx_contracts_seller_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_contracts_seller_id ON public.contracts USING btree (seller_id);


--
-- TOC entry 4028 (class 1259 OID 16952)
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- TOC entry 4097 (class 1259 OID 17289)
-- Name: idx_ext_publishes_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ext_publishes_game_id ON public.external_publishes USING btree (game_id);


--
-- TOC entry 4098 (class 1259 OID 17291)
-- Name: idx_ext_publishes_platform; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ext_publishes_platform ON public.external_publishes USING btree (platform);


--
-- TOC entry 4099 (class 1259 OID 17292)
-- Name: idx_ext_publishes_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ext_publishes_status ON public.external_publishes USING btree (status);


--
-- TOC entry 4100 (class 1259 OID 17290)
-- Name: idx_ext_publishes_version_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ext_publishes_version_id ON public.external_publishes USING btree (game_version_id);


--
-- TOC entry 4075 (class 1259 OID 17170)
-- Name: idx_favorites_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_favorites_game_id ON public.favorites USING btree (game_id);


--
-- TOC entry 4151 (class 1259 OID 17500)
-- Name: idx_game_media_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_game_media_game_id ON public.game_media USING btree (game_id);


--
-- TOC entry 4009 (class 1259 OID 16878)
-- Name: idx_game_tags_tag_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_game_tags_tag_id ON public.game_tags USING btree (tag_id);


--
-- TOC entry 4012 (class 1259 OID 16896)
-- Name: idx_game_versions_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_game_versions_game_id ON public.game_versions USING btree (game_id);


--
-- TOC entry 4013 (class 1259 OID 16897)
-- Name: idx_game_versions_is_current; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_game_versions_is_current ON public.game_versions USING btree (game_id, is_current) WHERE (is_current = true);


--
-- TOC entry 4002 (class 1259 OID 16859)
-- Name: idx_games_category_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_games_category_id ON public.games USING btree (category_id);


--
-- TOC entry 4003 (class 1259 OID 16858)
-- Name: idx_games_creator_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_games_creator_id ON public.games USING btree (creator_id);


--
-- TOC entry 4004 (class 1259 OID 16861)
-- Name: idx_games_publishing_type; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_games_publishing_type ON public.games USING btree (publishing_type);


--
-- TOC entry 4005 (class 1259 OID 16862)
-- Name: idx_games_source_listed; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_games_source_listed ON public.games USING btree (is_source_listed) WHERE (is_source_listed = true);


--
-- TOC entry 4006 (class 1259 OID 16860)
-- Name: idx_games_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_games_status ON public.games USING btree (status);


--
-- TOC entry 4117 (class 1259 OID 17361)
-- Name: idx_ip_logs_action; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ip_logs_action ON public.user_ip_logs USING btree (action);


--
-- TOC entry 4118 (class 1259 OID 17360)
-- Name: idx_ip_logs_ip_address; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ip_logs_ip_address ON public.user_ip_logs USING btree (ip_address);


--
-- TOC entry 4119 (class 1259 OID 17362)
-- Name: idx_ip_logs_logged_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ip_logs_logged_at ON public.user_ip_logs USING btree (logged_at DESC);


--
-- TOC entry 4120 (class 1259 OID 17363)
-- Name: idx_ip_logs_review_spam; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ip_logs_review_spam ON public.user_ip_logs USING btree (ip_address, logged_at DESC) WHERE ((action)::text = 'post_review'::text);


--
-- TOC entry 4121 (class 1259 OID 17359)
-- Name: idx_ip_logs_user_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_ip_logs_user_id ON public.user_ip_logs USING btree (user_id);


--
-- TOC entry 4039 (class 1259 OID 17032)
-- Name: idx_marketplace_category; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_category ON public.marketplace_items USING btree (category_id);


--
-- TOC entry 4040 (class 1259 OID 17037)
-- Name: idx_marketplace_github_repo; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_github_repo ON public.marketplace_items USING btree (github_repo_url) WHERE (github_repo_url IS NOT NULL);


--
-- TOC entry 4041 (class 1259 OID 17036)
-- Name: idx_marketplace_godot_ver; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_godot_ver ON public.marketplace_items USING btree (godot_version) WHERE (godot_version IS NOT NULL);


--
-- TOC entry 4042 (class 1259 OID 17033)
-- Name: idx_marketplace_item_type; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_item_type ON public.marketplace_items USING btree (item_type);


--
-- TOC entry 4043 (class 1259 OID 17031)
-- Name: idx_marketplace_seller_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_seller_id ON public.marketplace_items USING btree (seller_id);


--
-- TOC entry 4044 (class 1259 OID 17035)
-- Name: idx_marketplace_source_game; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_source_game ON public.marketplace_items USING btree (source_game_id) WHERE (source_game_id IS NOT NULL);


--
-- TOC entry 4045 (class 1259 OID 17034)
-- Name: idx_marketplace_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_marketplace_status ON public.marketplace_items USING btree (status);


--
-- TOC entry 4131 (class 1259 OID 17410)
-- Name: idx_media_files_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_game_id ON public.media_files USING btree (game_id) WHERE (game_id IS NOT NULL);


--
-- TOC entry 4132 (class 1259 OID 17411)
-- Name: idx_media_files_marketplace_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_marketplace_id ON public.media_files USING btree (marketplace_item_id) WHERE (marketplace_item_id IS NOT NULL);


--
-- TOC entry 4133 (class 1259 OID 17414)
-- Name: idx_media_files_order_game; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_order_game ON public.media_files USING btree (game_id, display_order) WHERE (game_id IS NOT NULL);


--
-- TOC entry 4134 (class 1259 OID 17415)
-- Name: idx_media_files_thumb_game; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_thumb_game ON public.media_files USING btree (game_id) WHERE (((media_type)::text = 'thumbnail'::text) AND (game_id IS NOT NULL));


--
-- TOC entry 4135 (class 1259 OID 17416)
-- Name: idx_media_files_thumb_market; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_thumb_market ON public.media_files USING btree (marketplace_item_id) WHERE (((media_type)::text = 'thumbnail'::text) AND (marketplace_item_id IS NOT NULL));


--
-- TOC entry 4136 (class 1259 OID 17412)
-- Name: idx_media_files_type_game; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_type_game ON public.media_files USING btree (game_id, media_type) WHERE (game_id IS NOT NULL);


--
-- TOC entry 4137 (class 1259 OID 17413)
-- Name: idx_media_files_type_market; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_media_files_type_market ON public.media_files USING btree (marketplace_item_id, media_type) WHERE (marketplace_item_id IS NOT NULL);


--
-- TOC entry 4156 (class 1259 OID 17584)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (recipient_id, is_read);


--
-- TOC entry 4157 (class 1259 OID 17583)
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);


--
-- TOC entry 4048 (class 1259 OID 17063)
-- Name: idx_orders_buyer_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_orders_buyer_id ON public.orders USING btree (buyer_id);


--
-- TOC entry 4049 (class 1259 OID 17064)
-- Name: idx_orders_marketplace_item_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_orders_marketplace_item_id ON public.orders USING btree (marketplace_item_id);


--
-- TOC entry 4050 (class 1259 OID 17066)
-- Name: idx_orders_purchased_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_orders_purchased_at ON public.orders USING btree (purchased_at DESC);


--
-- TOC entry 4051 (class 1259 OID 17065)
-- Name: idx_orders_transaction_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_orders_transaction_id ON public.orders USING btree (transaction_id);


--
-- TOC entry 4090 (class 1259 OID 17260)
-- Name: idx_publishing_guides_active; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_publishing_guides_active ON public.publishing_guides USING btree (step_order) WHERE (is_active = true);


--
-- TOC entry 4060 (class 1259 OID 17132)
-- Name: idx_reviews_marketplace_item; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_reviews_marketplace_item ON public.reviews USING btree (marketplace_item_id);


--
-- TOC entry 4061 (class 1259 OID 17131)
-- Name: idx_reviews_order_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);


--
-- TOC entry 4062 (class 1259 OID 17133)
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- TOC entry 4063 (class 1259 OID 17130)
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- TOC entry 4103 (class 1259 OID 17320)
-- Name: idx_source_downloads_downloaded_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_source_downloads_downloaded_at ON public.source_downloads USING btree (downloaded_at DESC);


--
-- TOC entry 4104 (class 1259 OID 17318)
-- Name: idx_source_downloads_marketplace_item_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_source_downloads_marketplace_item_id ON public.source_downloads USING btree (marketplace_item_id);


--
-- TOC entry 4105 (class 1259 OID 17319)
-- Name: idx_source_downloads_order_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_source_downloads_order_id ON public.source_downloads USING btree (order_id);


--
-- TOC entry 4106 (class 1259 OID 17317)
-- Name: idx_source_downloads_user_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_source_downloads_user_id ON public.source_downloads USING btree (user_id);


--
-- TOC entry 4162 (class 1259 OID 17622)
-- Name: idx_storage_buckets_account; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_storage_buckets_account ON public.storage_buckets USING btree (account_id);


--
-- TOC entry 4109 (class 1259 OID 17343)
-- Name: idx_store_stats_game_date; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_store_stats_game_date ON public.store_download_stats USING btree (game_id, stat_date DESC);


--
-- TOC entry 4110 (class 1259 OID 17340)
-- Name: idx_store_stats_game_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_store_stats_game_id ON public.store_download_stats USING btree (game_id);


--
-- TOC entry 4111 (class 1259 OID 17341)
-- Name: idx_store_stats_platform; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_store_stats_platform ON public.store_download_stats USING btree (platform);


--
-- TOC entry 4112 (class 1259 OID 17342)
-- Name: idx_store_stats_stat_date; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_store_stats_stat_date ON public.store_download_stats USING btree (stat_date DESC);


--
-- TOC entry 3993 (class 1259 OID 16832)
-- Name: idx_tags_slug; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);


--
-- TOC entry 4033 (class 1259 OID 17001)
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);


--
-- TOC entry 4034 (class 1259 OID 17000)
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- TOC entry 4035 (class 1259 OID 16999)
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- TOC entry 4036 (class 1259 OID 16998)
-- Name: idx_transactions_wallet_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_transactions_wallet_id ON public.transactions USING btree (wallet_id);


--
-- TOC entry 3976 (class 1259 OID 16800)
-- Name: idx_users_github_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_users_github_id ON public.users USING btree (github_id) WHERE (github_id IS NOT NULL);


--
-- TOC entry 3977 (class 1259 OID 16798)
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- TOC entry 3978 (class 1259 OID 16799)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 4056 (class 1259 OID 17101)
-- Name: idx_withdrawal_status; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_withdrawal_status ON public.withdrawal_requests USING btree (status);


--
-- TOC entry 4057 (class 1259 OID 17100)
-- Name: idx_withdrawal_user_id; Type: INDEX; Schema: public; Owner: user_godot_launch
--

CREATE INDEX idx_withdrawal_user_id ON public.withdrawal_requests USING btree (user_id);


--
-- TOC entry 4177 (class 2606 OID 16915)
-- Name: ai_reports ai_reports_game_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_game_version_id_fkey FOREIGN KEY (game_version_id) REFERENCES public.game_versions(id) ON DELETE CASCADE;


--
-- TOC entry 4206 (class 2606 OID 17212)
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4216 (class 2606 OID 17380)
-- Name: banned_ips banned_ips_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4217 (class 2606 OID 17375)
-- Name: banned_ips banned_ips_related_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4198 (class 2606 OID 17148)
-- Name: cart_items cart_items_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 4199 (class 2606 OID 17143)
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4171 (class 2606 OID 16814)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4220 (class 2606 OID 17457)
-- Name: chat_media chat_media_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_media
    ADD CONSTRAINT chat_media_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;


--
-- TOC entry 4224 (class 2606 OID 17554)
-- Name: chat_messages chat_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4225 (class 2606 OID 17549)
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4221 (class 2606 OID 17472)
-- Name: chat_reactions chat_reactions_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;


--
-- TOC entry 4222 (class 2606 OID 17477)
-- Name: chat_reactions chat_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4202 (class 2606 OID 17188)
-- Name: community_chats community_chats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4203 (class 2606 OID 17441)
-- Name: community_chats community_chats_original_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_original_chat_id_fkey FOREIGN KEY (original_chat_id) REFERENCES public.community_chats(id) ON DELETE SET NULL;


--
-- TOC entry 4204 (class 2606 OID 17193)
-- Name: community_chats community_chats_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;


--
-- TOC entry 4205 (class 2606 OID 17183)
-- Name: community_chats community_chats_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4178 (class 2606 OID 16944)
-- Name: contracts contracts_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4179 (class 2606 OID 16934)
-- Name: contracts contracts_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;


--
-- TOC entry 4180 (class 2606 OID 16939)
-- Name: contracts contracts_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4208 (class 2606 OID 17274)
-- Name: external_publishes external_publishes_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;


--
-- TOC entry 4209 (class 2606 OID 17279)
-- Name: external_publishes external_publishes_game_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_game_version_id_fkey FOREIGN KEY (game_version_id) REFERENCES public.game_versions(id) ON DELETE RESTRICT;


--
-- TOC entry 4210 (class 2606 OID 17284)
-- Name: external_publishes external_publishes_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4230 (class 2606 OID 17961)
-- Name: face_embeddings face_embeddings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.face_embeddings
    ADD CONSTRAINT face_embeddings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4200 (class 2606 OID 17165)
-- Name: favorites favorites_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4201 (class 2606 OID 17160)
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4223 (class 2606 OID 17495)
-- Name: game_media game_media_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_media
    ADD CONSTRAINT game_media_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4174 (class 2606 OID 16868)
-- Name: game_tags game_tags_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4175 (class 2606 OID 16873)
-- Name: game_tags game_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 4176 (class 2606 OID 16891)
-- Name: game_versions game_versions_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT game_versions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4172 (class 2606 OID 16853)
-- Name: games games_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4173 (class 2606 OID 16848)
-- Name: games games_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4185 (class 2606 OID 17021)
-- Name: marketplace_items marketplace_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4186 (class 2606 OID 17016)
-- Name: marketplace_items marketplace_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4187 (class 2606 OID 17026)
-- Name: marketplace_items marketplace_items_source_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_source_game_id_fkey FOREIGN KEY (source_game_id) REFERENCES public.games(id) ON DELETE SET NULL;


--
-- TOC entry 4218 (class 2606 OID 17400)
-- Name: media_files media_files_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4219 (class 2606 OID 17405)
-- Name: media_files media_files_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 4226 (class 2606 OID 17573)
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4227 (class 2606 OID 17578)
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4188 (class 2606 OID 17048)
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4189 (class 2606 OID 17053)
-- Name: orders orders_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE RESTRICT;


--
-- TOC entry 4190 (class 2606 OID 17058)
-- Name: orders orders_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE RESTRICT;


--
-- TOC entry 4207 (class 2606 OID 17255)
-- Name: publishing_guides publishing_guides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.publishing_guides
    ADD CONSTRAINT publishing_guides_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4195 (class 2606 OID 17125)
-- Name: reviews reviews_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 4196 (class 2606 OID 17120)
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4197 (class 2606 OID 17115)
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4211 (class 2606 OID 17307)
-- Name: source_downloads source_downloads_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 4212 (class 2606 OID 17312)
-- Name: source_downloads source_downloads_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- TOC entry 4213 (class 2606 OID 17302)
-- Name: source_downloads source_downloads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4228 (class 2606 OID 17606)
-- Name: storage_buckets storage_buckets_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.storage_buckets
    ADD CONSTRAINT storage_buckets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.storage_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 4229 (class 2606 OID 17617)
-- Name: storage_routing storage_routing_bucket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.storage_routing
    ADD CONSTRAINT storage_routing_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES public.storage_buckets(id);


--
-- TOC entry 4214 (class 2606 OID 17335)
-- Name: store_download_stats store_download_stats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT store_download_stats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4182 (class 2606 OID 16993)
-- Name: transactions transactions_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;


--
-- TOC entry 4183 (class 2606 OID 16988)
-- Name: transactions transactions_related_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4184 (class 2606 OID 16983)
-- Name: transactions transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


--
-- TOC entry 4215 (class 2606 OID 17354)
-- Name: user_ip_logs user_ip_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.user_ip_logs
    ADD CONSTRAINT user_ip_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4170 (class 2606 OID 16793)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- TOC entry 4181 (class 2606 OID 16965)
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4191 (class 2606 OID 17090)
-- Name: withdrawal_requests withdrawal_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4192 (class 2606 OID 17095)
-- Name: withdrawal_requests withdrawal_requests_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- TOC entry 4193 (class 2606 OID 17080)
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4194 (class 2606 OID 17085)
-- Name: withdrawal_requests withdrawal_requests_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user_godot_launch
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


-- Completed on 2026-06-22 00:31:47

--
-- PostgreSQL database dump complete
--

