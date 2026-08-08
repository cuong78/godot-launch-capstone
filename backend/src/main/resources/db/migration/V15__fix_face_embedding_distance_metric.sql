-- Face embedding (embedding_128) được sinh bởi thư viện face_recognition
-- (dlib ResNet) — model này thiết kế để so khớp bằng Euclidean (L2)
-- distance, không phải cosine distance. Index cosine trước đây khiến hầu
-- như mọi cặp khuôn mặt khác nhau đều bị báo trùng (false positive hàng
-- loạt). Đổi sang vector_l2_ops để toán tử <-> trả đúng L2 distance.
--
-- Không đụng idx_embeddings_vector_512 (KYC image dedup, dùng CLIP —
-- đúng chuẩn cosine, giữ nguyên) và idx_code_embeddings_vector
-- (plagiarism code match, khác domain).

DROP INDEX IF EXISTS public.idx_embeddings_vector_128;
CREATE INDEX idx_embeddings_vector_128
    ON public.embeddings USING ivfflat (embedding_128 public.vector_l2_ops) WITH (lists='100');

DROP INDEX IF EXISTS public.idx_banned_face;
CREATE INDEX idx_banned_face
    ON public.banned_identities USING ivfflat (face_embedding public.vector_l2_ops) WITH (lists='100');
