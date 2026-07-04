-- TxnType.java (Java) đã có wallet_topup (Payment giờ dùng để nạp ví) nhưng
-- Postgres enum txn_type_enum chưa có giá trị này — thêm để khớp.
ALTER TYPE public.txn_type_enum ADD VALUE IF NOT EXISTS 'wallet_topup';
