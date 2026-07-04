-- Payment.java chỉ map wallet + PayOS fields — dọn 2 nhóm cột tàn dư:
-- 1) Luồng thanh toán thủ công (chuyển khoản tay + upload biên lai + admin
--    duyệt tay) không còn dùng — mọi thanh toán qua PayOS/ví.
-- 2) order_id: tàn dư mô hình CŨ (PayOS trả trực tiếp cho Order). Mô hình MỚI
--    đã chốt: Payment chỉ dùng để NẠP VÍ (Payment.wallet), không gắn Order.
ALTER TABLE public.payments
    DROP COLUMN IF EXISTS order_id,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS receipt_url,
    DROP COLUMN IF EXISTS payer_name,
    DROP COLUMN IF EXISTS payer_bank,
    DROP COLUMN IF EXISTS transfer_reference,
    DROP COLUMN IF EXISTS verified_by,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS rejection_reason;

DROP TYPE IF EXISTS public.payment_method_enum;
