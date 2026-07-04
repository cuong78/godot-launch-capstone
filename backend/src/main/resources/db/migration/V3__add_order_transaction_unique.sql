-- ============================================================
--  V3: Order ↔ Transaction là quan hệ 1:1 (không phải N:1)
-- ============================================================
--  Mỗi order sinh ĐÚNG 1 bút toán ghi sổ ví seller. Entity đã đổi
--  @ManyToOne → @OneToOne + unique. Thêm UNIQUE constraint để DB khớp
--  (nếu không, Hibernate ddl-auto=validate sẽ báo lỗi thiếu unique).
--  transaction_id nullable (order PENDING chưa có transaction) —
--  UNIQUE cho phép nhiều NULL trong Postgres, chỉ ép unique với giá trị non-null.
-- ============================================================

ALTER TABLE public.orders
    ADD CONSTRAINT uq_orders_transaction UNIQUE (transaction_id);
