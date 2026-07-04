-- WAITING_VERIFICATION/REJECTED chỉ thuộc luồng payment thủ công (đã drop ở
-- V14, cùng payment_method_enum). PaymentStatus.java không có 2 giá trị này.
-- Postgres không cho xóa 1 giá trị khỏi enum trực tiếp — tạo type mới rồi swap.
ALTER TYPE public.payment_status_enum RENAME TO payment_status_enum_old;

CREATE TYPE public.payment_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

ALTER TABLE public.payments
    ALTER COLUMN payment_status DROP DEFAULT,
    ALTER COLUMN payment_status TYPE public.payment_status_enum
        USING payment_status::text::public.payment_status_enum,
    ALTER COLUMN payment_status SET DEFAULT 'PENDING'::public.payment_status_enum;

DROP TYPE public.payment_status_enum_old;
