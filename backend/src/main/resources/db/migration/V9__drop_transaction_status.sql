-- Bỏ Transaction.status — dư thừa:
-- - withdrawal: đã có WithdrawalRequest.status làm nguồn sự thật (PayOS/Bảo Kim tự
--   động chuyển tiền, admin chỉ approve) — Transaction chỉ 1:1 với nó, luôn phải
--   đồng bộ theo, dễ lệch nếu quên update 1 trong 2 chỗ.
-- - các loại còn lại (asset_purchase, revenue_share, commission...): trừ/cộng ví
--   tức thời trong 1 transaction SQL, không có trạng thái trung gian — row tồn tại
--   nghĩa là đã xảy ra rồi (giống Order: sự tồn tại của row = đã hoàn tất).
ALTER TABLE public.transactions
    DROP COLUMN IF EXISTS status;
