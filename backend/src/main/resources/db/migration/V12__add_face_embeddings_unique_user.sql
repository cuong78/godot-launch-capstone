-- 1 user chỉ được có đúng 1 face embedding (giống ràng buộc KYC — 1 người 1 danh tính).
ALTER TABLE public.face_embeddings
    ADD CONSTRAINT uq_face_embeddings_user_id UNIQUE (user_id);
