--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2026-06-20 10:38:48

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
-- TOC entry 7 (class 2615 OID 56659)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5618 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 3 (class 3079 OID 56707)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- TOC entry 5620 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- TOC entry 2 (class 3079 OID 56670)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5621 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 1109 (class 1247 OID 57794)
-- Name: actor_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.actor_role_enum AS ENUM (
    'developer',
    'admin',
    'customer'
);


ALTER TYPE public.actor_role_enum OWNER TO postgres;

--
-- TOC entry 974 (class 1247 OID 56840)
-- Name: ai_rec_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_rec_enum AS ENUM (
    'approve',
    'marketplace',
    'reject'
);


ALTER TYPE public.ai_rec_enum OWNER TO postgres;

--
-- TOC entry 1010 (class 1247 OID 56954)
-- Name: audit_action_enum; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.audit_action_enum OWNER TO postgres;

--
-- TOC entry 1013 (class 1247 OID 56998)
-- Name: audit_target_enum; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.audit_target_enum OWNER TO postgres;

--
-- TOC entry 1097 (class 1247 OID 57700)
-- Name: chat_media_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_media_type_enum AS ENUM (
    'image',
    'video'
);


ALTER TYPE public.chat_media_type_enum OWNER TO postgres;

--
-- TOC entry 1118 (class 1247 OID 58287)
-- Name: chatmediatype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chatmediatype AS ENUM (
    'image',
    'video'
);


ALTER TYPE public.chatmediatype OWNER TO postgres;

--
-- TOC entry 980 (class 1247 OID 56854)
-- Name: contract_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contract_status_enum AS ENUM (
    'pending',
    'signed',
    'expired',
    'cancelled',
    'negotiating',
    're_issued'
);


ALTER TYPE public.contract_status_enum OWNER TO postgres;

--
-- TOC entry 977 (class 1247 OID 56848)
-- Name: contract_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contract_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing'
);


ALTER TYPE public.contract_type_enum OWNER TO postgres;

--
-- TOC entry 1127 (class 1247 OID 58318)
-- Name: contractstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contractstatus AS ENUM (
    'cancelled',
    'expired',
    'negotiating',
    'pending',
    're_issued',
    'signed'
);


ALTER TYPE public.contractstatus OWNER TO postgres;

--
-- TOC entry 1124 (class 1247 OID 58310)
-- Name: contracttype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contracttype AS ENUM (
    'co_publishing',
    'full_acquisition'
);


ALTER TYPE public.contracttype OWNER TO postgres;

--
-- TOC entry 1001 (class 1247 OID 56912)
-- Name: ext_platform_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ext_platform_enum AS ENUM (
    'google_play',
    'app_store'
);


ALTER TYPE public.ext_platform_enum OWNER TO postgres;

--
-- TOC entry 1004 (class 1247 OID 56918)
-- Name: ext_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ext_status_enum AS ENUM (
    'pending',
    'submitted',
    'live',
    'rejected',
    'removed'
);


ALTER TYPE public.ext_status_enum OWNER TO postgres;

--
-- TOC entry 968 (class 1247 OID 56820)
-- Name: game_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_status_enum AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'published'
);


ALTER TYPE public.game_status_enum OWNER TO postgres;

--
-- TOC entry 1133 (class 1247 OID 58344)
-- Name: gamestatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gamestatus AS ENUM (
    'approved',
    'draft',
    'pending',
    'published',
    'rejected'
);


ALTER TYPE public.gamestatus OWNER TO postgres;

--
-- TOC entry 995 (class 1247 OID 56896)
-- Name: item_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.item_status_enum AS ENUM (
    'active',
    'removed',
    'pending',
    'rejected'
);


ALTER TYPE public.item_status_enum OWNER TO postgres;

--
-- TOC entry 992 (class 1247 OID 56890)
-- Name: item_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.item_type_enum AS ENUM (
    'source_code',
    'asset'
);


ALTER TYPE public.item_type_enum OWNER TO postgres;

--
-- TOC entry 1139 (class 1247 OID 58366)
-- Name: itemstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.itemstatus AS ENUM (
    'active',
    'pending',
    'rejected',
    'removed'
);


ALTER TYPE public.itemstatus OWNER TO postgres;

--
-- TOC entry 1136 (class 1247 OID 58358)
-- Name: itemtype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.itemtype AS ENUM (
    'asset',
    'source_code'
);


ALTER TYPE public.itemtype OWNER TO postgres;

--
-- TOC entry 1007 (class 1247 OID 56930)
-- Name: notif_type_enum; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.notif_type_enum OWNER TO postgres;

--
-- TOC entry 989 (class 1247 OID 56886)
-- Name: order_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_type_enum AS ENUM (
    'source_code_purchase'
);


ALTER TYPE public.order_type_enum OWNER TO postgres;

--
-- TOC entry 1142 (class 1247 OID 58378)
-- Name: ordertype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ordertype AS ENUM (
    'source_code_purchase'
);


ALTER TYPE public.ordertype OWNER TO postgres;

--
-- TOC entry 965 (class 1247 OID 56813)
-- Name: publishing_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.publishing_type_enum AS ENUM (
    'full_acquisition',
    'co_publishing',
    'marketplace_listing'
);


ALTER TYPE public.publishing_type_enum OWNER TO postgres;

--
-- TOC entry 1130 (class 1247 OID 58334)
-- Name: publishingtype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.publishingtype AS ENUM (
    'co_publishing',
    'full_acquisition',
    'marketplace_listing'
);


ALTER TYPE public.publishingtype OWNER TO postgres;

--
-- TOC entry 1094 (class 1247 OID 57687)
-- Name: reaction_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reaction_type_enum AS ENUM (
    'like',
    'love',
    'haha',
    'wow',
    'sad',
    'angry'
);


ALTER TYPE public.reaction_type_enum OWNER TO postgres;

--
-- TOC entry 1121 (class 1247 OID 58294)
-- Name: reactiontype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reactiontype AS ENUM (
    'angry',
    'haha',
    'like',
    'love',
    'sad',
    'wow'
);


ALTER TYPE public.reactiontype OWNER TO postgres;

--
-- TOC entry 971 (class 1247 OID 56832)
-- Name: security_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.security_status_enum AS ENUM (
    'clean',
    'suspicious',
    'malware'
);


ALTER TYPE public.security_status_enum OWNER TO postgres;

--
-- TOC entry 986 (class 1247 OID 56876)
-- Name: txn_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.txn_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE public.txn_status_enum OWNER TO postgres;

--
-- TOC entry 983 (class 1247 OID 56864)
-- Name: txn_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.txn_type_enum AS ENUM (
    'source_code_purchase',
    'withdrawal',
    'revenue_share',
    'commission',
    'refund'
);


ALTER TYPE public.txn_type_enum OWNER TO postgres;

--
-- TOC entry 998 (class 1247 OID 56902)
-- Name: withdrawal_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.withdrawal_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);


ALTER TYPE public.withdrawal_status_enum OWNER TO postgres;

--
-- TOC entry 5088 (class 2605 OID 58292)
-- Name: CAST (public.chatmediatype AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.chatmediatype AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5091 (class 2605 OID 58332)
-- Name: CAST (public.contractstatus AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.contractstatus AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5090 (class 2605 OID 58316)
-- Name: CAST (public.contracttype AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.contracttype AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5093 (class 2605 OID 58356)
-- Name: CAST (public.gamestatus AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.gamestatus AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5095 (class 2605 OID 58376)
-- Name: CAST (public.itemstatus AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.itemstatus AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5094 (class 2605 OID 58364)
-- Name: CAST (public.itemtype AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.itemtype AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5096 (class 2605 OID 58382)
-- Name: CAST (public.ordertype AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.ordertype AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5092 (class 2605 OID 58342)
-- Name: CAST (public.publishingtype AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.publishingtype AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5089 (class 2605 OID 58308)
-- Name: CAST (public.reactiontype AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.reactiontype AS character varying) WITH INOUT AS IMPLICIT;


--
-- TOC entry 4997 (class 2605 OID 58291)
-- Name: CAST (character varying AS public.chatmediatype); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.chatmediatype) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5000 (class 2605 OID 58331)
-- Name: CAST (character varying AS public.contractstatus); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.contractstatus) WITH INOUT AS IMPLICIT;


--
-- TOC entry 4999 (class 2605 OID 58315)
-- Name: CAST (character varying AS public.contracttype); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.contracttype) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5002 (class 2605 OID 58355)
-- Name: CAST (character varying AS public.gamestatus); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.gamestatus) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5004 (class 2605 OID 58375)
-- Name: CAST (character varying AS public.itemstatus); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.itemstatus) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5003 (class 2605 OID 58363)
-- Name: CAST (character varying AS public.itemtype); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.itemtype) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5005 (class 2605 OID 58381)
-- Name: CAST (character varying AS public.ordertype); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.ordertype) WITH INOUT AS IMPLICIT;


--
-- TOC entry 5001 (class 2605 OID 58341)
-- Name: CAST (character varying AS public.publishingtype); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.publishingtype) WITH INOUT AS IMPLICIT;


--
-- TOC entry 4998 (class 2605 OID 58307)
-- Name: CAST (character varying AS public.reactiontype); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.reactiontype) WITH INOUT AS IMPLICIT;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 57170)
-- Name: ai_reports; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ai_reports OWNER TO postgres;

--
-- TOC entry 5622 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE ai_reports; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_reports IS 'Moi game_version co 1 bao cao AI (UNIQUE game_version_id)';


--
-- TOC entry 5623 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN ai_reports.game_version_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_reports.game_version_id IS 'FK → game_versions, KHONG phai games — fix v3.0';


--
-- TOC entry 238 (class 1259 OID 57475)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 5624 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'IMMUTABLE — REVOKE UPDATE/DELETE. actor_id NULL = AI/system tu dong.';


--
-- TOC entry 244 (class 1259 OID 57633)
-- Name: banned_ips; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.banned_ips OWNER TO postgres;

--
-- TOC entry 5625 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE banned_ips; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.banned_ips IS 'IP bi chan — check tai API gateway truoc khi xu ly request';


--
-- TOC entry 5626 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN banned_ips.ip_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.banned_ips.ip_address IS 'INET: ho tro ca IPv4 va IPv6. UNIQUE: 1 IP 1 record.';


--
-- TOC entry 5627 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN banned_ips.related_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.banned_ips.related_user_id IS 'Account da dan den lenh ban — de admin tra vet';


--
-- TOC entry 5628 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN banned_ips.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.banned_ips.expires_at IS 'NULL = vinh vien | NOT NULL = co thoi han';


--
-- TOC entry 235 (class 1259 OID 57406)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    marketplace_item_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- TOC entry 5629 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE cart_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.cart_items IS 'Gio hang: source code hoac asset tren Marketplace';


--
-- TOC entry 222 (class 1259 OID 57073)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 5630 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.categories IS 'Danh muc game, ho tro cha-con qua parent_id';


--
-- TOC entry 5631 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN categories.slug; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.categories.slug IS 'URL-friendly, vd: action-rpg';


--
-- TOC entry 5632 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN categories.parent_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.categories.parent_id IS 'NULL = top-level category';


--
-- TOC entry 246 (class 1259 OID 57715)
-- Name: chat_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    url text NOT NULL,
    media_type public.chat_media_type_enum NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_media OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 57847)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 57730)
-- Name: chat_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type public.reaction_type_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_reactions OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 57443)
-- Name: community_chats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.community_chats OWNER TO postgres;

--
-- TOC entry 5633 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE community_chats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.community_chats IS 'Chat cong dong: global hoac theo game. Ho tro reply thread.';


--
-- TOC entry 5634 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN community_chats.game_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.community_chats.game_id IS 'NULL = global chat | NOT NULL = discussion theo game';


--
-- TOC entry 5635 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN community_chats.parent_message_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.community_chats.parent_message_id IS 'NULL = tin nhan goc | NOT NULL = reply';


--
-- TOC entry 5636 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN community_chats.is_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.community_chats.is_deleted IS 'Soft delete: admin xem duoc noi dung, user thay [da xoa]';


--
-- TOC entry 228 (class 1259 OID 57195)
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.contracts OWNER TO postgres;

--
-- TOC entry 5637 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE contracts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.contracts IS 'Hop dong phap ly — CHI cho full_acquisition va co_publishing';


--
-- TOC entry 5638 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN contracts.buyer_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contracts.buyer_id IS 'NULL = platform mua dut';


--
-- TOC entry 5639 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN contracts.revenue_split; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contracts.revenue_split IS '% cho developer (chi co_publishing)';


--
-- TOC entry 240 (class 1259 OID 57530)
-- Name: external_publishes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.external_publishes OWNER TO postgres;

--
-- TOC entry 5640 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE external_publishes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.external_publishes IS 'Theo doi tung lan submit game len Google Play / App Store';


--
-- TOC entry 5641 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN external_publishes.game_version_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.external_publishes.game_version_id IS 'Version cu the duoc submit — biet Google Play/AppStore dang chay version nao';


--
-- TOC entry 236 (class 1259 OID 57426)
-- Name: favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    game_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.favorites OWNER TO postgres;

--
-- TOC entry 5642 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE favorites; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.favorites IS 'Danh sach game yeu thich / wishlist cua user';


--
-- TOC entry 219 (class 1259 OID 56661)
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.flyway_schema_history OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 57755)
-- Name: game_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    media_type character varying(20) NOT NULL,
    media_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT game_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[])))
);


ALTER TABLE public.game_media OWNER TO postgres;

--
-- TOC entry 5643 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE game_media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.game_media IS 'Lưu trữ các hình ảnh chụp màn hình (screenshots) và video gameplay của game';


--
-- TOC entry 5644 (class 0 OID 0)
-- Dependencies: 248
-- Name: COLUMN game_media.media_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.game_media.media_type IS 'Loại tài nguyên: image hoặc video';


--
-- TOC entry 5645 (class 0 OID 0)
-- Dependencies: 248
-- Name: COLUMN game_media.media_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.game_media.media_url IS 'Đường dẫn URL tệp tin lưu trữ trên S3';


--
-- TOC entry 225 (class 1259 OID 57135)
-- Name: game_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_tags (
    game_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.game_tags OWNER TO postgres;

--
-- TOC entry 5646 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE game_tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.game_tags IS 'Nhieu-nhieu: 1 game co nhieu tag, 1 tag thuoc nhieu game';


--
-- TOC entry 226 (class 1259 OID 57151)
-- Name: game_versions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.game_versions OWNER TO postgres;

--
-- TOC entry 5647 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE game_versions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.game_versions IS 'Lich su phien ban game — 1 phien ban la current tai 1 thoi diem';


--
-- TOC entry 224 (class 1259 OID 57105)
-- Name: games; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.games OWNER TO postgres;

--
-- TOC entry 5648 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE games; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.games IS 'Game tren nen tang GodotLaunch';


--
-- TOC entry 5649 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN games.price_proposed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.games.price_proposed IS 'Gia de xuat cho full_acquisition / co_publishing. Gia marketplace nam o marketplace_items.price';


--
-- TOC entry 5650 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN games.download_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.games.download_count IS 'Cached tong luot tai source code — cap nhat qua trigger + cron, tranh COUNT(*)';


--
-- TOC entry 5651 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN games.is_source_listed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.games.is_source_listed IS 'TRUE = dang co marketplace_items listing cho source code cua game nay';


--
-- TOC entry 231 (class 1259 OID 57274)
-- Name: marketplace_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.marketplace_items OWNER TO postgres;

--
-- TOC entry 5652 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE marketplace_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.marketplace_items IS 'Cho ban source code Godot (source_code) va asset le';


--
-- TOC entry 5653 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN marketplace_items.item_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.marketplace_items.item_type IS 'source_code = Godot project day du | asset = tai nguyen le';


--
-- TOC entry 5654 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN marketplace_items.file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.marketplace_items.file_url IS 'URL file ZIP: Godot project hoac asset pack';


--
-- TOC entry 5655 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN marketplace_items.godot_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.marketplace_items.godot_version IS 'Phien ban Godot tuong thich — bat buoc voi source_code';


--
-- TOC entry 5656 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN marketplace_items.source_game_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.marketplace_items.source_game_id IS 'FK → games neu ban source cua game tren Platform. NULL = doc lap';


--
-- TOC entry 5657 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN marketplace_items.github_repo_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.marketplace_items.github_repo_url IS 'URL GitHub repo — bang chung so huu, bat buoc voi source_code';


--
-- TOC entry 245 (class 1259 OID 57657)
-- Name: media_files; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.media_files OWNER TO postgres;

--
-- TOC entry 5658 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE media_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.media_files IS 'Anh/video cho games VA marketplace_items — game_id XOR marketplace_item_id';


--
-- TOC entry 5659 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN media_files.game_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media_files.game_id IS 'FK → games. NULL neu owner la marketplace_item';


--
-- TOC entry 5660 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN media_files.marketplace_item_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media_files.marketplace_item_id IS 'FK → marketplace_items. NULL neu owner la game';


--
-- TOC entry 5661 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN media_files.media_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media_files.media_type IS 'screenshot | video | thumbnail | banner';


--
-- TOC entry 5662 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN media_files.display_order; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media_files.display_order IS 'Thu tu hien thi — Google Play / App Store dung thu tu nay';


--
-- TOC entry 250 (class 1259 OID 58266)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 57310)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 5663 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.orders IS 'Don hang mua source code hoac asset tren Marketplace';


--
-- TOC entry 5664 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN orders.marketplace_item_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.marketplace_item_id IS 'NOT NULL: source code hoac asset duoc mua';


--
-- TOC entry 5665 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN orders.price_paid; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.price_paid IS 'Gia thuc te thanh toan, co the khac gia niem yet neu co discount';


--
-- TOC entry 239 (class 1259 OID 57510)
-- Name: publishing_guides; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.publishing_guides OWNER TO postgres;

--
-- TOC entry 5666 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE publishing_guides; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.publishing_guides IS 'Noi dung tung buoc Publishing Wizard — admin tao va chinh sua';


--
-- TOC entry 234 (class 1259 OID 57374)
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.reviews OWNER TO postgres;

--
-- TOC entry 5667 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.reviews IS 'Verified buyer review — chi sau khi mua (order_id bat buoc)';


--
-- TOC entry 5668 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN reviews.order_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reviews.order_id IS 'FK → orders — xac nhan da mua truoc khi review';


--
-- TOC entry 5669 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN reviews.marketplace_item_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reviews.marketplace_item_id IS 'San pham duoc review (source_code hoac asset)';


--
-- TOC entry 220 (class 1259 OID 57037)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 5670 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.roles IS 'Bang role tach khoi enum: de them role moi ma khong can ALTER TYPE';


--
-- TOC entry 241 (class 1259 OID 57562)
-- Name: source_downloads; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.source_downloads OWNER TO postgres;

--
-- TOC entry 5671 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE source_downloads; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.source_downloads IS 'Moi luot tai source code / asset — KHONG UNIQUE (tai lai nhieu lan)';


--
-- TOC entry 5672 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN source_downloads.marketplace_item_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.source_downloads.marketplace_item_id IS 'Source code hoac asset duoc tai';


--
-- TOC entry 5673 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN source_downloads.order_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.source_downloads.order_id IS 'Bat buoc: phai co order source_code_purchase hop le';


--
-- TOC entry 5674 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN source_downloads.device_info; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.source_downloads.device_info IS 'OS + may tinh, ho tro analytics';


--
-- TOC entry 242 (class 1259 OID 57590)
-- Name: store_download_stats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.store_download_stats OWNER TO postgres;

--
-- TOC entry 5675 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE store_download_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.store_download_stats IS 'Aggregate stats tu Google Play / App Store API — cron job pull hang ngay';


--
-- TOC entry 5676 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN store_download_stats.downloads; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.store_download_stats.downloads IS 'Luot tai trong ngay stat_date';


--
-- TOC entry 5677 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN store_download_stats.installs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.store_download_stats.installs IS 'Luot cai dat moi (Google Play phan biet downloads vs installs)';


--
-- TOC entry 5678 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN store_download_stats.revenue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.store_download_stats.revenue IS 'Doanh thu trong ngay tu store, dung doi soat voi transactions';


--
-- TOC entry 5679 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN store_download_stats.fetched_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.store_download_stats.fetched_at IS 'Thoi diem pull tu API, de biet data co fresh khong';


--
-- TOC entry 223 (class 1259 OID 57093)
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- TOC entry 5680 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tags IS 'Tag game: nhieu-nhieu voi games qua bang game_tags';


--
-- TOC entry 230 (class 1259 OID 57242)
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.transactions OWNER TO postgres;

--
-- TOC entry 5681 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.transactions IS 'Moi giao dich tai chinh. net_amount = amount - commission (CHECK)';


--
-- TOC entry 243 (class 1259 OID 57613)
-- Name: user_ip_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_ip_logs OWNER TO postgres;

--
-- TOC entry 5682 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE user_ip_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_ip_logs IS 'Log IP cho cac action quan trong — phat hien spam va ho tro ban IP';


--
-- TOC entry 5683 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN user_ip_logs.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_ip_logs.user_id IS 'NULL = anonymous attempt (spam dang ky, brute force...)';


--
-- TOC entry 5684 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN user_ip_logs.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_ip_logs.action IS 'Chi log action quan trong, khong log moi request';


--
-- TOC entry 5685 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN user_ip_logs.user_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_ip_logs.user_agent IS 'Giup phan biet bot vs nguoi that';


--
-- TOC entry 221 (class 1259 OID 57048)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_github_fields CHECK (((github_id IS NULL) OR ((github_id IS NOT NULL) AND (github_username IS NOT NULL) AND (github_token_enc IS NOT NULL) AND (github_linked_at IS NOT NULL)))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'banned'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5686 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Nguoi dung. GitHub OAuth bat buoc de ban source code.';


--
-- TOC entry 5687 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN users.role_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.role_id IS 'FK den roles.id';


--
-- TOC entry 5688 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email IS 'CITEXT: khong phan biet hoa/thuong';


--
-- TOC entry 5689 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hash, cost >= 12';


--
-- TOC entry 5690 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN users.github_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.github_id IS 'GitHub user ID — NULL = chua lien ket, khong duoc ban source';


--
-- TOC entry 5691 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN users.github_token_enc; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.github_token_enc IS 'AES-256 encrypted OAuth token — giai ma o tang application khi can verify repo';


--
-- TOC entry 229 (class 1259 OID 57225)
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_balance_check CHECK ((balance >= (0)::numeric))
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- TOC entry 5692 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE wallets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wallets IS '1 user co 1 wallet (UNIQUE user_id)';


--
-- TOC entry 233 (class 1259 OID 57339)
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.withdrawal_requests OWNER TO postgres;

--
-- TOC entry 5693 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE withdrawal_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.withdrawal_requests IS 'Admin duyet thu cong truoc khi xu ly rut tien';


--
-- TOC entry 5694 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN withdrawal_requests.bank_account; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.withdrawal_requests.bank_account IS 'Ma hoa o tang application truoc khi luu';


--
-- TOC entry 5267 (class 2606 OID 57186)
-- Name: ai_reports ai_reports_game_version_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_game_version_id_key UNIQUE (game_version_id);


--
-- TOC entry 5269 (class 2606 OID 57184)
-- Name: ai_reports ai_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5335 (class 2606 OID 57483)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5375 (class 2606 OID 57643)
-- Name: banned_ips banned_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_ip_address_key UNIQUE (ip_address);


--
-- TOC entry 5377 (class 2606 OID 57641)
-- Name: banned_ips banned_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_pkey PRIMARY KEY (id);


--
-- TOC entry 5319 (class 2606 OID 57412)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5236 (class 2606 OID 57083)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 5238 (class 2606 OID 57081)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5240 (class 2606 OID 57085)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 5391 (class 2606 OID 57724)
-- Name: chat_media chat_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_media
    ADD CONSTRAINT chat_media_pkey PRIMARY KEY (id);


--
-- TOC entry 5403 (class 2606 OID 57854)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5394 (class 2606 OID 57737)
-- Name: chat_reactions chat_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5327 (class 2606 OID 57454)
-- Name: community_chats community_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_pkey PRIMARY KEY (id);


--
-- TOC entry 5274 (class 2606 OID 57205)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5346 (class 2606 OID 57540)
-- Name: external_publishes external_publishes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_pkey PRIMARY KEY (id);


--
-- TOC entry 5324 (class 2606 OID 57431)
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, game_id);


--
-- TOC entry 5220 (class 2606 OID 56668)
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- TOC entry 5400 (class 2606 OID 57764)
-- Name: game_media game_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_media
    ADD CONSTRAINT game_media_pkey PRIMARY KEY (id);


--
-- TOC entry 5258 (class 2606 OID 57139)
-- Name: game_tags game_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_pkey PRIMARY KEY (game_id, tag_id);


--
-- TOC entry 5261 (class 2606 OID 57160)
-- Name: game_versions game_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT game_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 5251 (class 2606 OID 57119)
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- TOC entry 5297 (class 2606 OID 57287)
-- Name: marketplace_items marketplace_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5389 (class 2606 OID 57668)
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- TOC entry 5409 (class 2606 OID 58273)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5303 (class 2606 OID 57317)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5342 (class 2606 OID 57521)
-- Name: publishing_guides publishing_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_guides
    ADD CONSTRAINT publishing_guides_pkey PRIMARY KEY (id);


--
-- TOC entry 5344 (class 2606 OID 57523)
-- Name: publishing_guides publishing_guides_step_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_guides
    ADD CONSTRAINT publishing_guides_step_order_key UNIQUE (step_order);


--
-- TOC entry 5315 (class 2606 OID 57384)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 5223 (class 2606 OID 57047)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5225 (class 2606 OID 57045)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5358 (class 2606 OID 57570)
-- Name: source_downloads source_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_pkey PRIMARY KEY (id);


--
-- TOC entry 5364 (class 2606 OID 57601)
-- Name: store_download_stats store_download_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT store_download_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 5245 (class 2606 OID 57101)
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- TOC entry 5247 (class 2606 OID 57099)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 5249 (class 2606 OID 57103)
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- TOC entry 5288 (class 2606 OID 57254)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5322 (class 2606 OID 57414)
-- Name: cart_items uq_cart_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT uq_cart_item UNIQUE (user_id, marketplace_item_id);


--
-- TOC entry 5398 (class 2606 OID 57739)
-- Name: chat_reactions uq_chat_reaction; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT uq_chat_reaction UNIQUE (chat_id, user_id);


--
-- TOC entry 5352 (class 2606 OID 57542)
-- Name: external_publishes uq_game_platform; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT uq_game_platform UNIQUE (game_id, platform);


--
-- TOC entry 5265 (class 2606 OID 57162)
-- Name: game_versions uq_game_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT uq_game_version UNIQUE (game_id, version_number);


--
-- TOC entry 5305 (class 2606 OID 57319)
-- Name: orders uq_order_marketplace; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT uq_order_marketplace UNIQUE (buyer_id, marketplace_item_id);


--
-- TOC entry 5317 (class 2606 OID 57386)
-- Name: reviews uq_review_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_review_item UNIQUE (user_id, marketplace_item_id);


--
-- TOC entry 5366 (class 2606 OID 57603)
-- Name: store_download_stats uq_store_stat; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT uq_store_stat UNIQUE (game_id, platform, stat_date);


--
-- TOC entry 5373 (class 2606 OID 57622)
-- Name: user_ip_logs user_ip_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_ip_logs
    ADD CONSTRAINT user_ip_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5230 (class 2606 OID 57062)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5232 (class 2606 OID 57064)
-- Name: users users_github_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_github_id_key UNIQUE (github_id);


--
-- TOC entry 5234 (class 2606 OID 57060)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5280 (class 2606 OID 57234)
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 5282 (class 2606 OID 57236)
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- TOC entry 5309 (class 2606 OID 57351)
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5221 (class 1259 OID 56669)
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- TOC entry 5270 (class 1259 OID 57192)
-- Name: idx_ai_reports_game_version_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_reports_game_version_id ON public.ai_reports USING btree (game_version_id);


--
-- TOC entry 5271 (class 1259 OID 57193)
-- Name: idx_ai_reports_recommendation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_reports_recommendation ON public.ai_reports USING btree (recommendation);


--
-- TOC entry 5272 (class 1259 OID 57194)
-- Name: idx_ai_reports_security_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_reports_security_status ON public.ai_reports USING btree (security_status);


--
-- TOC entry 5336 (class 1259 OID 57490)
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- TOC entry 5337 (class 1259 OID 57489)
-- Name: idx_audit_logs_actor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);


--
-- TOC entry 5338 (class 1259 OID 57492)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- TOC entry 5339 (class 1259 OID 57491)
-- Name: idx_audit_logs_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_target ON public.audit_logs USING btree (target_type, target_id);


--
-- TOC entry 5378 (class 1259 OID 57656)
-- Name: idx_banned_ips_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_banned_ips_expires ON public.banned_ips USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- TOC entry 5379 (class 1259 OID 57654)
-- Name: idx_banned_ips_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_banned_ips_ip ON public.banned_ips USING btree (ip_address);


--
-- TOC entry 5380 (class 1259 OID 57655)
-- Name: idx_banned_ips_related_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_banned_ips_related_user ON public.banned_ips USING btree (related_user_id);


--
-- TOC entry 5320 (class 1259 OID 57425)
-- Name: idx_cart_items_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);


--
-- TOC entry 5241 (class 1259 OID 57091)
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- TOC entry 5242 (class 1259 OID 57092)
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- TOC entry 5392 (class 1259 OID 57752)
-- Name: idx_chat_media_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_media_chat_id ON public.chat_media USING btree (chat_id);


--
-- TOC entry 5404 (class 1259 OID 57867)
-- Name: idx_chat_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (sender_id, recipient_id);


--
-- TOC entry 5405 (class 1259 OID 57868)
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);


--
-- TOC entry 5395 (class 1259 OID 57750)
-- Name: idx_chat_reactions_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_reactions_chat_id ON public.chat_reactions USING btree (chat_id);


--
-- TOC entry 5396 (class 1259 OID 57751)
-- Name: idx_chat_reactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_reactions_user_id ON public.chat_reactions USING btree (user_id);


--
-- TOC entry 5328 (class 1259 OID 57474)
-- Name: idx_community_chats_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_chats_active ON public.community_chats USING btree (game_id, created_at DESC) WHERE (is_deleted = false);


--
-- TOC entry 5329 (class 1259 OID 57473)
-- Name: idx_community_chats_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_chats_created_at ON public.community_chats USING btree (created_at DESC);


--
-- TOC entry 5330 (class 1259 OID 57471)
-- Name: idx_community_chats_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_chats_game_id ON public.community_chats USING btree (game_id);


--
-- TOC entry 5331 (class 1259 OID 57714)
-- Name: idx_community_chats_original_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_chats_original_id ON public.community_chats USING btree (original_chat_id) WHERE (original_chat_id IS NOT NULL);


--
-- TOC entry 5332 (class 1259 OID 57472)
-- Name: idx_community_chats_parent_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_chats_parent_message_id ON public.community_chats USING btree (parent_message_id);


--
-- TOC entry 5333 (class 1259 OID 57470)
-- Name: idx_community_chats_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_chats_sender_id ON public.community_chats USING btree (sender_id);


--
-- TOC entry 5275 (class 1259 OID 57223)
-- Name: idx_contracts_buyer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_buyer_id ON public.contracts USING btree (buyer_id);


--
-- TOC entry 5276 (class 1259 OID 57221)
-- Name: idx_contracts_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_game_id ON public.contracts USING btree (game_id);


--
-- TOC entry 5277 (class 1259 OID 57222)
-- Name: idx_contracts_seller_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_seller_id ON public.contracts USING btree (seller_id);


--
-- TOC entry 5278 (class 1259 OID 57224)
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- TOC entry 5347 (class 1259 OID 57558)
-- Name: idx_ext_publishes_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_publishes_game_id ON public.external_publishes USING btree (game_id);


--
-- TOC entry 5348 (class 1259 OID 57560)
-- Name: idx_ext_publishes_platform; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_publishes_platform ON public.external_publishes USING btree (platform);


--
-- TOC entry 5349 (class 1259 OID 57561)
-- Name: idx_ext_publishes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_publishes_status ON public.external_publishes USING btree (status);


--
-- TOC entry 5350 (class 1259 OID 57559)
-- Name: idx_ext_publishes_version_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_publishes_version_id ON public.external_publishes USING btree (game_version_id);


--
-- TOC entry 5325 (class 1259 OID 57442)
-- Name: idx_favorites_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favorites_game_id ON public.favorites USING btree (game_id);


--
-- TOC entry 5401 (class 1259 OID 57770)
-- Name: idx_game_media_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_media_game_id ON public.game_media USING btree (game_id);


--
-- TOC entry 5259 (class 1259 OID 57150)
-- Name: idx_game_tags_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_tags_tag_id ON public.game_tags USING btree (tag_id);


--
-- TOC entry 5262 (class 1259 OID 57168)
-- Name: idx_game_versions_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_versions_game_id ON public.game_versions USING btree (game_id);


--
-- TOC entry 5263 (class 1259 OID 57169)
-- Name: idx_game_versions_is_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_versions_is_current ON public.game_versions USING btree (game_id, is_current) WHERE (is_current = true);


--
-- TOC entry 5252 (class 1259 OID 57131)
-- Name: idx_games_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_category_id ON public.games USING btree (category_id);


--
-- TOC entry 5253 (class 1259 OID 57130)
-- Name: idx_games_creator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_creator_id ON public.games USING btree (creator_id);


--
-- TOC entry 5254 (class 1259 OID 57133)
-- Name: idx_games_publishing_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_publishing_type ON public.games USING btree (publishing_type);


--
-- TOC entry 5255 (class 1259 OID 57134)
-- Name: idx_games_source_listed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_source_listed ON public.games USING btree (is_source_listed) WHERE (is_source_listed = true);


--
-- TOC entry 5256 (class 1259 OID 57132)
-- Name: idx_games_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_status ON public.games USING btree (status);


--
-- TOC entry 5367 (class 1259 OID 57630)
-- Name: idx_ip_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ip_logs_action ON public.user_ip_logs USING btree (action);


--
-- TOC entry 5368 (class 1259 OID 57629)
-- Name: idx_ip_logs_ip_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ip_logs_ip_address ON public.user_ip_logs USING btree (ip_address);


--
-- TOC entry 5369 (class 1259 OID 57631)
-- Name: idx_ip_logs_logged_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ip_logs_logged_at ON public.user_ip_logs USING btree (logged_at DESC);


--
-- TOC entry 5370 (class 1259 OID 57632)
-- Name: idx_ip_logs_review_spam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ip_logs_review_spam ON public.user_ip_logs USING btree (ip_address, logged_at DESC) WHERE ((action)::text = 'post_review'::text);


--
-- TOC entry 5371 (class 1259 OID 57628)
-- Name: idx_ip_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ip_logs_user_id ON public.user_ip_logs USING btree (user_id);


--
-- TOC entry 5289 (class 1259 OID 57304)
-- Name: idx_marketplace_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_category ON public.marketplace_items USING btree (category_id);


--
-- TOC entry 5290 (class 1259 OID 57309)
-- Name: idx_marketplace_github_repo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_github_repo ON public.marketplace_items USING btree (github_repo_url) WHERE (github_repo_url IS NOT NULL);


--
-- TOC entry 5291 (class 1259 OID 57308)
-- Name: idx_marketplace_godot_ver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_godot_ver ON public.marketplace_items USING btree (godot_version) WHERE (godot_version IS NOT NULL);


--
-- TOC entry 5292 (class 1259 OID 57305)
-- Name: idx_marketplace_item_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_item_type ON public.marketplace_items USING btree (item_type);


--
-- TOC entry 5293 (class 1259 OID 57303)
-- Name: idx_marketplace_seller_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_seller_id ON public.marketplace_items USING btree (seller_id);


--
-- TOC entry 5294 (class 1259 OID 57307)
-- Name: idx_marketplace_source_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_source_game ON public.marketplace_items USING btree (source_game_id) WHERE (source_game_id IS NOT NULL);


--
-- TOC entry 5295 (class 1259 OID 57306)
-- Name: idx_marketplace_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_status ON public.marketplace_items USING btree (status);


--
-- TOC entry 5381 (class 1259 OID 57679)
-- Name: idx_media_files_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_game_id ON public.media_files USING btree (game_id) WHERE (game_id IS NOT NULL);


--
-- TOC entry 5382 (class 1259 OID 57680)
-- Name: idx_media_files_marketplace_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_marketplace_id ON public.media_files USING btree (marketplace_item_id) WHERE (marketplace_item_id IS NOT NULL);


--
-- TOC entry 5383 (class 1259 OID 57683)
-- Name: idx_media_files_order_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_order_game ON public.media_files USING btree (game_id, display_order) WHERE (game_id IS NOT NULL);


--
-- TOC entry 5384 (class 1259 OID 57684)
-- Name: idx_media_files_thumb_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_thumb_game ON public.media_files USING btree (game_id) WHERE (((media_type)::text = 'thumbnail'::text) AND (game_id IS NOT NULL));


--
-- TOC entry 5385 (class 1259 OID 57685)
-- Name: idx_media_files_thumb_market; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_thumb_market ON public.media_files USING btree (marketplace_item_id) WHERE (((media_type)::text = 'thumbnail'::text) AND (marketplace_item_id IS NOT NULL));


--
-- TOC entry 5386 (class 1259 OID 57681)
-- Name: idx_media_files_type_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_type_game ON public.media_files USING btree (game_id, media_type) WHERE (game_id IS NOT NULL);


--
-- TOC entry 5387 (class 1259 OID 57682)
-- Name: idx_media_files_type_market; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_type_market ON public.media_files USING btree (marketplace_item_id, media_type) WHERE (marketplace_item_id IS NOT NULL);


--
-- TOC entry 5406 (class 1259 OID 58285)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (recipient_id, is_read);


--
-- TOC entry 5407 (class 1259 OID 58284)
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);


--
-- TOC entry 5298 (class 1259 OID 57335)
-- Name: idx_orders_buyer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_buyer_id ON public.orders USING btree (buyer_id);


--
-- TOC entry 5299 (class 1259 OID 57336)
-- Name: idx_orders_marketplace_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_marketplace_item_id ON public.orders USING btree (marketplace_item_id);


--
-- TOC entry 5300 (class 1259 OID 57338)
-- Name: idx_orders_purchased_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_purchased_at ON public.orders USING btree (purchased_at DESC);


--
-- TOC entry 5301 (class 1259 OID 57337)
-- Name: idx_orders_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_transaction_id ON public.orders USING btree (transaction_id);


--
-- TOC entry 5340 (class 1259 OID 57529)
-- Name: idx_publishing_guides_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_publishing_guides_active ON public.publishing_guides USING btree (step_order) WHERE (is_active = true);


--
-- TOC entry 5310 (class 1259 OID 57404)
-- Name: idx_reviews_marketplace_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_marketplace_item ON public.reviews USING btree (marketplace_item_id);


--
-- TOC entry 5311 (class 1259 OID 57403)
-- Name: idx_reviews_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);


--
-- TOC entry 5312 (class 1259 OID 57405)
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- TOC entry 5313 (class 1259 OID 57402)
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- TOC entry 5353 (class 1259 OID 57589)
-- Name: idx_source_downloads_downloaded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_source_downloads_downloaded_at ON public.source_downloads USING btree (downloaded_at DESC);


--
-- TOC entry 5354 (class 1259 OID 57587)
-- Name: idx_source_downloads_marketplace_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_source_downloads_marketplace_item_id ON public.source_downloads USING btree (marketplace_item_id);


--
-- TOC entry 5355 (class 1259 OID 57588)
-- Name: idx_source_downloads_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_source_downloads_order_id ON public.source_downloads USING btree (order_id);


--
-- TOC entry 5356 (class 1259 OID 57586)
-- Name: idx_source_downloads_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_source_downloads_user_id ON public.source_downloads USING btree (user_id);


--
-- TOC entry 5359 (class 1259 OID 57612)
-- Name: idx_store_stats_game_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_stats_game_date ON public.store_download_stats USING btree (game_id, stat_date DESC);


--
-- TOC entry 5360 (class 1259 OID 57609)
-- Name: idx_store_stats_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_stats_game_id ON public.store_download_stats USING btree (game_id);


--
-- TOC entry 5361 (class 1259 OID 57610)
-- Name: idx_store_stats_platform; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_stats_platform ON public.store_download_stats USING btree (platform);


--
-- TOC entry 5362 (class 1259 OID 57611)
-- Name: idx_store_stats_stat_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_stats_stat_date ON public.store_download_stats USING btree (stat_date DESC);


--
-- TOC entry 5243 (class 1259 OID 57104)
-- Name: idx_tags_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);


--
-- TOC entry 5283 (class 1259 OID 57273)
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);


--
-- TOC entry 5284 (class 1259 OID 57272)
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- TOC entry 5285 (class 1259 OID 57271)
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- TOC entry 5286 (class 1259 OID 57270)
-- Name: idx_transactions_wallet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_wallet_id ON public.transactions USING btree (wallet_id);


--
-- TOC entry 5226 (class 1259 OID 57072)
-- Name: idx_users_github_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_github_id ON public.users USING btree (github_id) WHERE (github_id IS NOT NULL);


--
-- TOC entry 5227 (class 1259 OID 57070)
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- TOC entry 5228 (class 1259 OID 57071)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 5306 (class 1259 OID 57373)
-- Name: idx_withdrawal_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_withdrawal_status ON public.withdrawal_requests USING btree (status);


--
-- TOC entry 5307 (class 1259 OID 57372)
-- Name: idx_withdrawal_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_withdrawal_user_id ON public.withdrawal_requests USING btree (user_id);


--
-- TOC entry 5417 (class 2606 OID 57187)
-- Name: ai_reports ai_reports_game_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_game_version_id_fkey FOREIGN KEY (game_version_id) REFERENCES public.game_versions(id) ON DELETE CASCADE;


--
-- TOC entry 5446 (class 2606 OID 57484)
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5456 (class 2606 OID 57649)
-- Name: banned_ips banned_ips_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5457 (class 2606 OID 57644)
-- Name: banned_ips banned_ips_related_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5438 (class 2606 OID 57420)
-- Name: cart_items cart_items_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 5439 (class 2606 OID 57415)
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5411 (class 2606 OID 57086)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 5460 (class 2606 OID 57725)
-- Name: chat_media chat_media_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_media
    ADD CONSTRAINT chat_media_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;


--
-- TOC entry 5464 (class 2606 OID 57860)
-- Name: chat_messages chat_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5465 (class 2606 OID 57855)
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5461 (class 2606 OID 57740)
-- Name: chat_reactions chat_reactions_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;


--
-- TOC entry 5462 (class 2606 OID 57745)
-- Name: chat_reactions chat_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5442 (class 2606 OID 57460)
-- Name: community_chats community_chats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5443 (class 2606 OID 57709)
-- Name: community_chats community_chats_original_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_original_chat_id_fkey FOREIGN KEY (original_chat_id) REFERENCES public.community_chats(id) ON DELETE SET NULL;


--
-- TOC entry 5444 (class 2606 OID 57465)
-- Name: community_chats community_chats_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.community_chats(id) ON DELETE CASCADE;


--
-- TOC entry 5445 (class 2606 OID 57455)
-- Name: community_chats community_chats_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_chats
    ADD CONSTRAINT community_chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5418 (class 2606 OID 57216)
-- Name: contracts contracts_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5419 (class 2606 OID 57206)
-- Name: contracts contracts_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;


--
-- TOC entry 5420 (class 2606 OID 57211)
-- Name: contracts contracts_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5448 (class 2606 OID 57543)
-- Name: external_publishes external_publishes_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;


--
-- TOC entry 5449 (class 2606 OID 57548)
-- Name: external_publishes external_publishes_game_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_game_version_id_fkey FOREIGN KEY (game_version_id) REFERENCES public.game_versions(id) ON DELETE RESTRICT;


--
-- TOC entry 5450 (class 2606 OID 57553)
-- Name: external_publishes external_publishes_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_publishes
    ADD CONSTRAINT external_publishes_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5440 (class 2606 OID 57437)
-- Name: favorites favorites_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5441 (class 2606 OID 57432)
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5463 (class 2606 OID 57765)
-- Name: game_media game_media_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_media
    ADD CONSTRAINT game_media_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5414 (class 2606 OID 57140)
-- Name: game_tags game_tags_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5415 (class 2606 OID 57145)
-- Name: game_tags game_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_tags
    ADD CONSTRAINT game_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5416 (class 2606 OID 57163)
-- Name: game_versions game_versions_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_versions
    ADD CONSTRAINT game_versions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5412 (class 2606 OID 57125)
-- Name: games games_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 5413 (class 2606 OID 57120)
-- Name: games games_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5425 (class 2606 OID 57293)
-- Name: marketplace_items marketplace_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 5426 (class 2606 OID 57288)
-- Name: marketplace_items marketplace_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5427 (class 2606 OID 57298)
-- Name: marketplace_items marketplace_items_source_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_source_game_id_fkey FOREIGN KEY (source_game_id) REFERENCES public.games(id) ON DELETE SET NULL;


--
-- TOC entry 5458 (class 2606 OID 57669)
-- Name: media_files media_files_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5459 (class 2606 OID 57674)
-- Name: media_files media_files_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 5466 (class 2606 OID 58274)
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5467 (class 2606 OID 58279)
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5428 (class 2606 OID 57320)
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5429 (class 2606 OID 57325)
-- Name: orders orders_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE RESTRICT;


--
-- TOC entry 5430 (class 2606 OID 57330)
-- Name: orders orders_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE RESTRICT;


--
-- TOC entry 5447 (class 2606 OID 57524)
-- Name: publishing_guides publishing_guides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_guides
    ADD CONSTRAINT publishing_guides_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5435 (class 2606 OID 57397)
-- Name: reviews reviews_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 5436 (class 2606 OID 57392)
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5437 (class 2606 OID 57387)
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5451 (class 2606 OID 57576)
-- Name: source_downloads source_downloads_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- TOC entry 5452 (class 2606 OID 57581)
-- Name: source_downloads source_downloads_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- TOC entry 5453 (class 2606 OID 57571)
-- Name: source_downloads source_downloads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_downloads
    ADD CONSTRAINT source_downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5454 (class 2606 OID 57604)
-- Name: store_download_stats store_download_stats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_download_stats
    ADD CONSTRAINT store_download_stats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 5422 (class 2606 OID 57265)
-- Name: transactions transactions_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;


--
-- TOC entry 5423 (class 2606 OID 57260)
-- Name: transactions transactions_related_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5424 (class 2606 OID 57255)
-- Name: transactions transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


--
-- TOC entry 5455 (class 2606 OID 57623)
-- Name: user_ip_logs user_ip_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_ip_logs
    ADD CONSTRAINT user_ip_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5410 (class 2606 OID 57065)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- TOC entry 5421 (class 2606 OID 57237)
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5431 (class 2606 OID 57362)
-- Name: withdrawal_requests withdrawal_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5432 (class 2606 OID 57367)
-- Name: withdrawal_requests withdrawal_requests_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- TOC entry 5433 (class 2606 OID 57352)
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5434 (class 2606 OID 57357)
-- Name: withdrawal_requests withdrawal_requests_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


--
-- TOC entry 5619 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2026-06-20 10:38:48

--
-- PostgreSQL database dump complete
--

