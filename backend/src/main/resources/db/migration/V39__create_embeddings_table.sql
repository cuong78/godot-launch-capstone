-- Gộp face_embeddings vào 1 bảng `embeddings` chung, phân biệt bằng cột
-- `type` (face | kyc_front | kyc_back). Thêm khả năng lưu vector ảnh CCCD/
-- Passport (CLIP, 512-dim) để chống bypass KYC: re-upload ảnh giấy tờ CŨ
-- (của người khác, đã từng KYC trước đó) nhưng sửa tay idNumber trên form
-- trước khi confirm — check trùng theo text không bắt được kịch bản này vì
-- không nhìn vào ảnh thật.
--
-- KHÔNG gộp chung 1 cột vector: face dùng model dlib/face_recognition
-- (128-dim), KYC dùng CLIP (512-dim) — pad chung 1 cột sẽ làm loãng vector
-- và giảm độ chính xác cosine similarity. Mỗi row chỉ dùng đúng 1 trong 2
-- cột theo `type`.

CREATE TABLE public.embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    embedding_128 public.vector(128),
    embedding_512 public.vector(512),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_embeddings_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT chk_embeddings_type CHECK (type IN ('face', 'kyc_front', 'kyc_back')),
    -- Mỗi row chỉ dùng đúng 1 cột vector theo type — cột còn lại phải NULL.
    CONSTRAINT chk_embeddings_vector_matches_type CHECK (
        (type = 'face' AND embedding_128 IS NOT NULL AND embedding_512 IS NULL)
        OR (type IN ('kyc_front', 'kyc_back') AND embedding_512 IS NOT NULL AND embedding_128 IS NULL)
    )
);

-- Di chuyển dữ liệu face embedding đã có (nếu bảng cũ tồn tại và có data).
INSERT INTO public.embeddings (user_id, type, embedding_128, created_at)
SELECT user_id, 'face', embedding, created_at
FROM public.face_embeddings;

-- 1 user chỉ có đúng 1 face embedding (giống ràng buộc KYC — 1 người 1 danh tính).
-- kyc_front/kyc_back KHÔNG unique (giữ lịch sử nếu re-KYC).
CREATE UNIQUE INDEX uq_embeddings_user_face ON public.embeddings (user_id)
    WHERE type = 'face';

CREATE INDEX idx_embeddings_user_id ON public.embeddings USING btree (user_id);
CREATE INDEX idx_embeddings_type ON public.embeddings USING btree (type);
CREATE INDEX idx_embeddings_vector_128 ON public.embeddings
    USING ivfflat (embedding_128 public.vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_embeddings_vector_512 ON public.embeddings
    USING ivfflat (embedding_512 public.vector_cosine_ops) WITH (lists='100');

DROP TABLE public.face_embeddings;
