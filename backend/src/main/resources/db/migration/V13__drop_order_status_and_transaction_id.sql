-- Order.orderStatus đã bị bỏ khỏi entity (sự tồn tại của row = đã thanh toán
-- xong, không còn trạng thái trung gian — mọi thanh toán qua ví, tức thời).
-- Order.transaction (1:1) cũng đã bỏ — 1 order giờ sinh N Transaction (ghi sổ
-- kép: buyer/seller/platform), không còn quan hệ 1:1 Order→Transaction.
ALTER TABLE public.orders
    DROP COLUMN IF EXISTS order_status,
    DROP COLUMN IF EXISTS transaction_id;

DROP TYPE IF EXISTS public.order_status_enum;
