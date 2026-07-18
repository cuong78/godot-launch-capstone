-- Khoi phuc banned_identities (tung co trong V1, bi DROP o V5 voi ly do
-- "da co unique check face_embedding roi" - nhung thuc te khong co buoc nao
-- tra cuu trang thai banned khi phat hien trung, nen nguoi bi ban van
-- re-verify duoc. Bang nay dung lam blacklist rieng, hook vao luc dispute
-- resolve (ban seller/reporter) va luc face-verify (chan cung).

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

COMMENT ON TABLE public.banned_identities IS 'Blacklist đa tầng: face + CCCD + bank — chặn user bị ban đăng ký/thêm bank lại.';

CREATE INDEX idx_banned_bank ON public.banned_identities USING btree (bank_account);

CREATE INDEX idx_banned_kyc ON public.banned_identities USING btree (kyc_id_number);

CREATE INDEX idx_banned_face ON public.banned_identities USING ivfflat (face_embedding public.vector_cosine_ops) WITH (lists='100');
