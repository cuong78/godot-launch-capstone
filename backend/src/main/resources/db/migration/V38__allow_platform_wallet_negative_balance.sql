-- Ví PLATFORM (admin@godotlaunch.com) cần được phép âm khi ứng trước tiền
-- hoàn cho B/C/D trong dispute mà seller chưa trả nợ kịp — đây chỉ là bút
-- toán ghi nợ nội bộ (không phải tiền mặt thật rời PayOS payout account).
-- Ví người dùng thường (seller/buyer) vẫn KHÔNG được âm — được đảm bảo ở
-- tầng application (WalletBalancePolicy.debitSellerRefund() vẫn chặn cứng),
-- constraint dưới đây chỉ nới lỏng đúng phần "balance âm thì withdrawable
-- phải = 0" (không có gì rút được từ một khoản nợ).
ALTER TABLE public.wallets
    DROP CONSTRAINT IF EXISTS wallets_withdrawable_balance_check;

ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_withdrawable_balance_check
    CHECK (
        withdrawable_balance >= 0
        AND (
            (balance >= 0 AND withdrawable_balance <= balance)
            OR (balance < 0 AND withdrawable_balance = 0)
        )
    );
